// ==================== 游戏配置 ====================
const CONFIG = {
    CANVAS_WIDTH: 1000,
    CANVAS_HEIGHT: 700,
    TILE_SIZE: 50,
    TANK_SIZE: 40,
    BULLET_SIZE: 6,
    BULLET_SPEED: 8,
    TANK_SPEED: 3,
    TANK_ROTATION_SPEED: 0.08,
    MAX_HEALTH: 100,
    BULLET_DAMAGE: 10,
    FIRE_COOLDOWN: 500,
    PARTICLE_COUNT: 30,
    EXPLOSION_DURATION: 500
};

// AI难度配置
const AI_DIFFICULTY = {
    easy: { reactionTime: 800, accuracy: 0.5, aggressiveness: 0.3, pathUpdateRate: 1000 },
    normal: { reactionTime: 500, accuracy: 0.7, aggressiveness: 0.5, pathUpdateRate: 700 },
    hard: { reactionTime: 250, accuracy: 0.85, aggressiveness: 0.7, pathUpdateRate: 400 },
    expert: { reactionTime: 100, accuracy: 0.95, aggressiveness: 0.9, pathUpdateRate: 200 }
};

// ==================== 全局变量 ====================
let canvas, ctx;
let gameLoop;
let gameState = 'menu'; // menu, playing, gameover
let currentDifficulty = 'easy';
let playerScore = 0;
let aiScore = 0;

// 游戏对象
let map = [];
let playerTank = null;
let aiTank = null;
let bullets = [];
let particles = [];
let explosions = [];

// 输入状态
let keys = {};
let mouseX = 0, mouseY = 0;

// 屏幕震动
let screenShake = { intensity: 0, duration: 0 };

// ==================== 工具函数 ====================
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// ==================== 向量运算 ====================
const Vector = {
    add: (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
    sub: (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
    mul: (v, s) => ({ x: v.x * s, y: v.y * s }),
    dot: (v1, v2) => v1.x * v2.x + v1.y * v2.y,
    length: (v) => Math.sqrt(v.x * v.x + v.y * v.y),
    normalize: (v) => {
        const len = Vector.length(v);
        return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
    },
    angle: (v) => Math.atan2(v.y, v.x)
};

// ==================== 地图系统 ====================
class MapGenerator {
    constructor(width, height, tileSize) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.cols = Math.floor(width / tileSize);
        this.rows = Math.floor(height / tileSize);
    }

    generate() {
        // 初始化空地图
        const map = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));

        // 添加边墙
        for (let i = 0; i < this.cols; i++) {
            map[0][i] = 2; // 钢墙
            map[this.rows - 1][i] = 2;
        }
        for (let i = 0; i < this.rows; i++) {
            map[i][0] = 2;
            map[i][this.cols - 1] = 2;
        }

        // 生成迷宫结构
        this.generateMaze(map);

        // 添加随机砖墙和钢墙
        this.addRandomWalls(map);

        // 确保出生点畅通
        this.clearSpawnAreas(map);

        return map;
    }

    generateMaze(map) {
        // 使用递归分割生成迷宫
        const regions = [];
        const minRegionSize = 4;

        // 初始区域
        regions.push({
            x: 2,
            y: 2,
            width: this.cols - 4,
            height: this.rows - 4
        });

        while (regions.length > 0) {
            const region = regions.pop();

            if (region.width < minRegionSize || region.height < minRegionSize) {
                continue;
            }

            // 决定分割方向
            const splitHorizontal = region.width > region.height ?
                Math.random() > 0.4 : Math.random() <= 0.6;

            if (splitHorizontal) {
                if (region.height < minRegionSize * 2) continue;

                const splitY = Math.floor(randomRange(
                    region.y + 2,
                    region.y + region.height - 2
                ));

                // 添加水平墙（留通道）
                for (let x = region.x; x < region.x + region.width; x++) {
                    if (map[splitY][x] === 0 && Math.random() > 0.2) {
                        map[splitY][x] = Math.random() > 0.7 ? 2 : 1;
                    }
                }

                // 添加通道
                const passageX = Math.floor(randomRange(region.x, region.x + region.width));
                map[splitY][passageX] = 0;

                regions.push({
                    x: region.x,
                    y: region.y,
                    width: region.width,
                    height: splitY - region.y
                });
                regions.push({
                    x: region.x,
                    y: splitY + 1,
                    width: region.width,
                    height: region.y + region.height - splitY - 1
                });
            } else {
                if (region.width < minRegionSize * 2) continue;

                const splitX = Math.floor(randomRange(
                    region.x + 2,
                    region.x + region.width - 2
                ));

                // 添加垂直墙（留通道）
                for (let y = region.y; y < region.y + region.height; y++) {
                    if (map[y][splitX] === 0 && Math.random() > 0.2) {
                        map[y][splitX] = Math.random() > 0.7 ? 2 : 1;
                    }
                }

                // 添加通道
                const passageY = Math.floor(randomRange(region.y, region.y + region.height));
                map[passageY][splitX] = 0;

                regions.push({
                    x: region.x,
                    y: region.y,
                    width: splitX - region.x,
                    height: region.height
                });
                regions.push({
                    x: splitX + 1,
                    y: region.y,
                    width: region.x + region.width - splitX - 1,
                    height: region.height
                });
            }
        }
    }

    addRandomWalls(map) {
        const brickDensity = 0.15;
        const steelDensity = 0.05;

        for (let y = 1; y < this.rows - 1; y++) {
            for (let x = 1; x < this.cols - 1; x++) {
                if (map[y][x] !== 0) continue;

                // 创建一些墙块
                if (Math.random() < brickDensity) {
                    const blockSize = Math.floor(randomRange(1, 3));
                    for (let dy = 0; dy < blockSize && y + dy < this.rows - 1; dy++) {
                        for (let dx = 0; dx < blockSize && x + dx < this.cols - 1; dx++) {
                            if (map[y + dy][x + dx] === 0) {
                                map[y + dy][x + dx] = 1;
                            }
                        }
                    }
                } else if (Math.random() < steelDensity) {
                    map[y][x] = 2;
                }
            }
        }
    }

    clearSpawnAreas(map) {
        // 清除左上角（玩家）
        for (let y = 1; y < 4; y++) {
            for (let x = 1; x < 4; x++) {
                map[y][x] = 0;
            }
        }

        // 清除右下角（AI）
        for (let y = this.rows - 4; y < this.rows - 1; y++) {
            for (let x = this.cols - 4; x < this.cols - 1; x++) {
                map[y][x] = 0;
            }
        }
    }

    render(ctx) {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const tile = map[y][x];
                const px = x * this.tileSize;
                const py = y * this.tileSize;

                if (tile === 1) {
                    // 砖墙
                    this.renderBrickWall(ctx, px, py);
                } else if (tile === 2) {
                    // 钢墙
                    this.renderSteelWall(ctx, px, py);
                } else {
                    // 地面
                    this.renderGround(ctx, px, py);
                }
            }
        }
    }

    renderGround(ctx, x, y) {
        // 地板纹理
        const gradient = ctx.createLinearGradient(x, y, x + this.tileSize, y + this.tileSize);
        gradient.addColorStop(0, '#2a2a2a');
        gradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, this.tileSize, this.tileSize);

        // 网格线
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.strokeRect(x, y, this.tileSize, this.tileSize);

        // 随机噪点
        if ((x + y) % 7 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
            ctx.fillRect(x + 10, y + 10, 5, 5);
        }
    }

    renderBrickWall(ctx, x, y) {
        // 砖墙背景
        const gradient = ctx.createLinearGradient(x, y, x, y + this.tileSize);
        gradient.addColorStop(0, '#c65d3b');
        gradient.addColorStop(0.5, '#a04628');
        gradient.addColorStop(1, '#8a3c22');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, this.tileSize, this.tileSize);

        // 砖块纹理
        ctx.strokeStyle = '#5c2a18';
        ctx.lineWidth = 2;

        const brickWidth = this.tileSize / 2;
        const brickHeight = this.tileSize / 2;

        for (let by = 0; by < 2; by++) {
            for (let bx = 0; bx < 2; bx++) {
                const offset = (by % 2) * (brickWidth / 2);
                ctx.strokeRect(
                    x + bx * brickWidth + offset,
                    y + by * brickHeight,
                    brickWidth - 2,
                    brickHeight - 2
                );
            }
        }

        // 阴影效果
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x, y + this.tileSize - 5, this.tileSize, 5);
        ctx.fillRect(x + this.tileSize - 5, y, 5, this.tileSize);

        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, this.tileSize, 3);
    }

    renderSteelWall(ctx, x, y) {
        // 钢墙背景
        const gradient = ctx.createLinearGradient(x, y, x + this.tileSize, y + this.tileSize);
        gradient.addColorStop(0, '#7a8a9a');
        gradient.addColorStop(0.5, '#5a6a7a');
        gradient.addColorStop(1, '#4a5a6a');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, this.tileSize, this.tileSize);

        // 铆钉效果
        ctx.fillStyle = '#3a4a5a';
        const rivetSize = 6;
        const padding = 8;
        ctx.beginPath();
        ctx.arc(x + padding, y + padding, rivetSize, 0, Math.PI * 2);
        ctx.arc(x + this.tileSize - padding, y + padding, rivetSize, 0, Math.PI * 2);
        ctx.arc(x + padding, y + this.tileSize - padding, rivetSize, 0, Math.PI * 2);
        ctx.arc(x + this.tileSize - padding, y + this.tileSize - padding, rivetSize, 0, Math.PI * 2);
        ctx.fill();

        // 铆钉高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(x + padding - 2, y + padding - 2, 2, 0, Math.PI * 2);
        ctx.arc(x + this.tileSize - padding - 2, y + padding - 2, 2, 0, Math.PI * 2);
        ctx.fill();

        // 金属纹理线
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + this.tileSize / 2);
        ctx.lineTo(x + this.tileSize, y + this.tileSize / 2);
        ctx.moveTo(x + this.tileSize / 2, y);
        ctx.lineTo(x + this.tileSize / 2, y + this.tileSize);
        ctx.stroke();

        // 边框
        ctx.strokeStyle = '#3a4a5a';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1, y + 1, this.tileSize - 2, this.tileSize - 2);

        // 金属光泽
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(x + 5, y + 5, this.tileSize - 10, this.tileSize / 3);
    }
}

// ==================== 坦克类 ====================
class Tank {
    constructor(x, y, color, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.TANK_SIZE;
        this.height = CONFIG.TANK_SIZE;
        this.angle = 0;
        this.turretAngle = 0;
        this.color = color;
        this.isPlayer = isPlayer;
        this.health = CONFIG.MAX_HEALTH;
        this.maxHealth = CONFIG.MAX_HEALTH;
        this.lastFireTime = 0;
        this.velocity = { x: 0, y: 0 };
        this.targetVelocity = { x: 0, y: 0 };
        this.isMoving = false;
        this.recoil = 0;
        this.engineParticles = [];
    }

    update(deltaTime) {
        // 平滑移动
        this.velocity.x = lerp(this.velocity.x, this.targetVelocity.x, 0.15);
        this.velocity.y = lerp(this.velocity.y, this.targetVelocity.y, 0.15);

        const newX = this.x + this.velocity.x;
        const newY = this.y + this.velocity.y;

        // 碰撞检测
        if (!this.checkCollision(newX, this.y)) {
            this.x = newX;
        }
        if (!this.checkCollision(this.x, newY)) {
            this.y = newY;
        }

        // 确保在画布内
        this.x = clamp(this.x, this.width / 2, CONFIG.CANVAS_WIDTH - this.width / 2);
        this.y = clamp(this.y, this.height / 2, CONFIG.CANVAS_HEIGHT - this.height / 2);

        // 更新后坐力
        this.recoil = lerp(this.recoil, 0, 0.2);

        // 更新引擎粒子
        this.isMoving = Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1;
        if (this.isMoving && Math.random() > 0.7) {
            this.engineParticles.push({
                x: this.x - Math.cos(this.angle) * 20,
                y: this.y - Math.sin(this.angle) * 20,
                vx: -this.velocity.x * 0.3 + randomRange(-1, 1),
                vy: -this.velocity.y * 0.3 + randomRange(-1, 1),
                life: 1,
                size: randomRange(2, 5)
            });
        }

        // 更新引擎粒子
        this.engineParticles = this.engineParticles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
            p.size *= 0.95;
            return p.life > 0;
        });
    }

    checkCollision(x, y) {
        const halfSize = this.width / 2 - 5;
        const points = [
            { x: x - halfSize, y: y - halfSize },
            { x: x + halfSize, y: y - halfSize },
            { x: x - halfSize, y: y + halfSize },
            { x: x + halfSize, y: y + halfSize }
        ];

        for (const point of points) {
            const tileX = Math.floor(point.x / CONFIG.TILE_SIZE);
            const tileY = Math.floor(point.y / CONFIG.TILE_SIZE);

            if (tileY >= 0 && tileY < map.length && tileX >= 0 && tileX < map[0].length) {
                if (map[tileY][tileX] !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    fire() {
        const now = Date.now();
        if (now - this.lastFireTime < CONFIG.FIRE_COOLDOWN) return null;

        this.lastFireTime = now;
        this.recoil = 8;

        // 计算炮口位置
        const barrelLength = 30;
        const bulletX = this.x + Math.cos(this.turretAngle) * barrelLength;
        const bulletY = this.y + Math.sin(this.turretAngle) * barrelLength;

        // 创建子弹
        const bullet = new Bullet(
            bulletX,
            bulletY,
            this.turretAngle,
            this.isPlayer
        );

        // 发射粒子效果
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(
                bulletX,
                bulletY,
                randomRange(-2, 2),
                randomRange(-2, 2),
                '#ffaa00',
                randomRange(0.5, 1)
            ));
        }

        return bullet;
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);

        // 受伤粒子效果
        for (let i = 0; i < 10; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(1, 4);
            particles.push(new Particle(
                this.x,
                this.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#ff4444',
                randomRange(0.5, 1)
            ));
        }

        return this.health <= 0;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 渲染引擎粒子
        ctx.save();
        ctx.translate(-this.x, -this.y);
        this.engineParticles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(150, 150, 150, ${p.life * 0.5})`;
            ctx.fill();
        });
        ctx.restore();

        // 坦克阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(3, 3, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 坦克身体（跟随移动方向旋转）
        ctx.save();
        ctx.rotate(this.angle);

        // 履带
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-this.width / 2 - 3, -this.height / 2, 6, this.height);
        ctx.fillRect(this.width / 2 - 3, -this.height / 2, 6, this.height);

        // 履带纹理
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        for (let i = -this.height / 2 + 5; i < this.height / 2; i += 8) {
            ctx.beginPath();
            ctx.moveTo(-this.width / 2, i);
            ctx.lineTo(-this.width / 2 + 6, i);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.width / 2 - 6, i);
            ctx.lineTo(this.width / 2, i);
            ctx.stroke();
        }

        // 主体
        const bodyGradient = ctx.createLinearGradient(-this.width / 2, 0, this.width / 2, 0);
        if (this.isPlayer) {
            bodyGradient.addColorStop(0, '#1a5a3a');
            bodyGradient.addColorStop(0.5, '#2a8a5a');
            bodyGradient.addColorStop(1, '#1a5a3a');
        } else {
            bodyGradient.addColorStop(0, '#5a1a1a');
            bodyGradient.addColorStop(0.5, '#8a2a2a');
            bodyGradient.addColorStop(1, '#5a1a1a');
        }
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(-this.width / 2 + 5, -this.height / 2 + 3, this.width - 10, this.height - 6);

        // 主体边框
        ctx.strokeStyle = this.isPlayer ? '#0a3a2a' : '#3a0a0a';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width / 2 + 5, -this.height / 2 + 3, this.width - 10, this.height - 6);

        // 装甲板
        ctx.fillStyle = this.isPlayer ? '#1a6a4a' : '#6a1a1a';
        ctx.fillRect(-this.width / 2 + 8, -this.height / 2 + 8, this.width - 16, this.height - 16);

        ctx.restore();

        // 炮塔（独立旋转）
        ctx.save();
        ctx.rotate(this.turretAngle);

        // 炮管
        const recoilOffset = this.recoil;
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(0 - recoilOffset, -4, 32, 8);

        // 炮管阴影
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0 - recoilOffset, 2, 32, 4);

        // 炮管末端
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(28 - recoilOffset, -5, 6, 10);

        // 炮塔底座
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        const turretGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
        if (this.isPlayer) {
            turretGradient.addColorStop(0, '#3aa87a');
            turretGradient.addColorStop(1, '#1a6a4a');
        } else {
            turretGradient.addColorStop(0, '#aa3a3a');
            turretGradient.addColorStop(1, '#6a1a1a');
        }
        ctx.fillStyle = turretGradient;
        ctx.fill();

        // 炮塔边框
        ctx.strokeStyle = this.isPlayer ? '#0a4a3a' : '#4a0a0a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 炮塔顶部装饰
        ctx.fillStyle = this.isPlayer ? '#2a7a5a' : '#7a2a2a';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 生命条
        const healthPercent = this.health / this.maxHealth;
        const barWidth = 40;
        const barHeight = 4;
        const barY = -this.height / 2 - 10;

        // 生命条背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

        // 生命条填充
        const healthColor = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ffaa00' : '#ff4444';
        ctx.fillStyle = healthColor;
        ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);

        // 生命条边框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);

        ctx.restore();
    }
}

// ==================== 子弹类 ====================
class Bullet {
    constructor(x, y, angle, isPlayerBullet) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.angle = angle;
        this.isPlayerBullet = isPlayerBullet;
        this.speed = CONFIG.BULLET_SPEED;
        this.damage = CONFIG.BULLET_DAMAGE;
        this.active = true;
        this.trail = [];
    }

    update() {
        // 更新轨迹
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 10) {
            this.trail.shift();
        }

        // 移动
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // 边界检测
        if (this.x < 0 || this.x > CONFIG.CANVAS_WIDTH ||
            this.y < 0 || this.y > CONFIG.CANVAS_HEIGHT) {
            this.active = false;
            return;
        }

        // 墙壁碰撞
        this.checkWallCollision();

        // 坦克碰撞
        this.checkTankCollision();
    }

    checkWallCollision() {
        const tileX = Math.floor(this.x / CONFIG.TILE_SIZE);
        const tileY = Math.floor(this.y / CONFIG.TILE_SIZE);

        if (tileY >= 0 && tileY < map.length && tileX >= 0 && tileX < map[0].length) {
            const tile = map[tileY][tileX];

            if (tile === 1) {
                // 砖墙 - 可破坏
                map[tileY][tileX] = 0;
                this.active = false;
                this.createImpactParticles();
            } else if (tile === 2) {
                // 钢墙 - 不可破坏
                this.active = false;
                this.createImpactParticles();
            }
        }
    }

    checkTankCollision() {
        const target = this.isPlayerBullet ? aiTank : playerTank;

        if (target && distance(this.x, this.y, target.x, target.y) < target.width / 2 + CONFIG.BULLET_SIZE) {
            const killed = target.takeDamage(this.damage);
            this.active = false;
            this.createImpactParticles();

            if (killed) {
                explosions.push(new Explosion(target.x, target.y));
            }
        }
    }

    createImpactParticles() {
        for (let i = 0; i < 8; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(1, 3);
            particles.push(new Particle(
                this.x,
                this.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#ffaa00',
                randomRange(0.3, 0.7)
            ));
        }
    }

    render(ctx) {
        // 渲染轨迹
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.strokeStyle = this.isPlayerBullet ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 71, 87, 0.3)';
            ctx.lineWidth = CONFIG.BULLET_SIZE;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // 渲染子弹
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.BULLET_SIZE, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, CONFIG.BULLET_SIZE);
        if (this.isPlayerBullet) {
            gradient.addColorStop(0, '#00ffaa');
            gradient.addColorStop(1, '#00aa88');
        } else {
            gradient.addColorStop(0, '#ff6666');
            gradient.addColorStop(1, '#aa3333');
        }
        ctx.fillStyle = gradient;
        ctx.fill();

        // 发光效果
        ctx.shadowColor = this.isPlayerBullet ? '#00ffaa' : '#ff6666';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ==================== 粒子类 ====================
class Particle {
    constructor(x, y, vx, vy, color, life = 1) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = randomRange(2, 5);
        this.rotation = randomRange(0, Math.PI * 2);
        this.rotationSpeed = randomRange(-0.2, 0.2);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.vy += 0.1; // 重力
        this.life -= 0.02;
        this.rotation += this.rotationSpeed;
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
        ctx.globalAlpha = 1;
    }
}

// ==================== 爆炸类 ====================
class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.maxRadius = 60;
        this.life = 1;
        this.particles = [];

        // 创建爆炸粒子
        for (let i = 0; i < 50; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(2, 8);
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: randomRange(3, 8),
                color: ['#ff4400', '#ff8800', '#ffcc00', '#ffffff'][Math.floor(randomRange(0, 4))],
                life: randomRange(0.5, 1)
            });
        }

        // 屏幕震动
        screenShake.intensity = 15;
        screenShake.duration = 200;
    }

    update() {
        // 扩散半径
        this.radius = lerp(this.radius, this.maxRadius, 0.15);
        this.life -= 0.03;

        // 更新粒子
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.life -= 0.02;
            p.size *= 0.97;
        });
    }

    render(ctx) {
        // 爆炸光晕
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, `rgba(255, 200, 100, ${this.life * 0.8})`);
        gradient.addColorStop(0.3, `rgba(255, 100, 50, ${this.life * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // 粒子
        this.particles.forEach(p => {
            if (p.life > 0) {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.globalAlpha = 1;
    }
}

// ==================== AI系统 ====================
class AIController {
    constructor(tank, difficulty = 'normal') {
        this.tank = tank;
        this.difficulty = difficulty;
        this.config = AI_DIFFICULTY[difficulty];
        this.state = 'patrol'; // patrol, chase, attack, flee, take_cover
        this.target = null;
        this.path = [];
        this.lastPathUpdate = 0;
        this.lastDecision = 0;
        this.patrolPoint = null;
        this.coverPoint = null;
        this.lastPlayerPos = null;
        this.predictedPlayerPos = null;
        this.bulletDodgingCooldown = 0;
    }

    update(player) {
        const now = Date.now();

        // 更新玩家位置预测
        if (this.lastPlayerPos) {
            const dx = player.x - this.lastPlayerPos.x;
            const dy = player.y - this.lastPlayerPos.y;
            this.predictedPlayerPos = {
                x: player.x + dx * this.config.accuracy * 5,
                y: player.y + dy * this.config.accuracy * 5
            };
        } else {
            this.predictedPlayerPos = { x: player.x, y: player.y };
        }
        this.lastPlayerPos = { x: player.x, y: player.y };

        // 检测玩家是否可见
        const canSeePlayer = this.checkLineOfSight(this.tank, player);
        const distToPlayer = distance(this.tank.x, this.tank.y, player.x, player.y);

        // 状态决策 - 降低决策间隔，使AI更主动
        const decisionInterval = Math.max(50, this.config.reactionTime);
        if (now - this.lastDecision > decisionInterval) {
            this.lastDecision = now;
            this.makeDecision(player, canSeePlayer, distToPlayer);
        }

        // 执行当前状态 - 传入玩家位置用于追踪
        this.executeState(player, canSeePlayer, distToPlayer);

        // 子弹躲避
        this.dodgeBullets();
    }

    makeDecision(player, canSeePlayer, distToPlayer) {
        const healthPercent = this.tank.health / this.tank.maxHealth;

        // 低血量时寻找掩体
        if (healthPercent < 0.3) {
            this.state = 'flee';
            this.findCover(player);
            return;
        }

        // 大幅增加追击范围 - AI会主动进攻
        const chaseRange = 600; // 从300增加到600

        // 能看到玩家 - 立即追击或攻击
        if (canSeePlayer) {
            if (distToPlayer < 250) {
                // 近距离 - 攻击
                this.state = 'attack';
            } else {
                // 中远距离 - 追击
                this.state = 'chase';
            }
            return;
        }

        // 即使看不到玩家，如果距离较近也会主动搜索
        if (distToPlayer < chaseRange) {
            this.state = 'chase';
            return;
        }

        // 远距离 - 巡逻但朝向玩家
        this.state = 'patrol';
    }

    executeState(player, canSeePlayer, distToPlayer) {
        switch (this.state) {
            case 'patrol':
                this.patrol();
                break;
            case 'chase':
                this.chase(player);
                break;
            case 'attack':
                this.attack(player, canSeePlayer);
                break;
            case 'flee':
                this.flee(player);
                break;
            case 'take_cover':
                this.moveToCover();
                break;
        }
    }

    patrol() {
        if (!this.patrolPoint || distance(this.tank.x, this.tank.y, this.patrolPoint.x, this.patrolPoint.y) < 30) {
            // 生成新的巡逻点
            const mapGen = new MapGenerator(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, CONFIG.TILE_SIZE);
            let attempts = 0;
            do {
                this.patrolPoint = {
                    x: randomRange(100, CONFIG.CANVAS_WIDTH - 100),
                    y: randomRange(100, CONFIG.CANVAS_HEIGHT - 100)
                };
                attempts++;
            } while (this.isWallAt(this.patrolPoint.x, this.patrolPoint.y) && attempts < 20);
        }

        this.moveToPoint(this.patrolPoint);
        this.tank.turretAngle += 0.02; // 扫描周围
    }

    chase(player) {
        this.moveToPoint(player);
        this.aimAtPlayer(player);
        // 追击时更频繁地尝试射击
        if (Math.random() < this.config.aggressiveness + 0.2) {
            this.tryFire(player);
        }
    }

    attack(player, canSeePlayer) {
        if (canSeePlayer) {
            this.aimAtPlayer(player);
            // 攻击模式 - 射击更频繁
            if (Math.random() < this.config.aggressiveness + 0.3) {
                this.tryFire(player);
            }
        } else {
            // 移动到能看到玩家的位置
            this.moveToPoint(player);
        }
    }

    flee(player) {
        // 远离玩家
        const dx = this.tank.x - player.x;
        const dy = this.tank.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            const fleePoint = {
                x: this.tank.x + (dx / dist) * 100,
                y: this.tank.y + (dy / dist) * 100
            };
            this.moveToPoint(fleePoint);
        }
    }

    moveToCover() {
        if (this.coverPoint) {
            this.moveToPoint(this.coverPoint);
            if (distance(this.tank.x, this.tank.y, this.coverPoint.x, this.coverPoint.y) < 30) {
                this.state = 'attack';
            }
        }
    }

    moveToPoint(target) {
        const now = Date.now();

        // 定期更新路径
        if (now - this.lastPathUpdate > this.config.pathUpdateRate) {
            this.lastPathUpdate = now;
            this.path = this.findPath(this.tank, target);
        }

        if (this.path.length > 0) {
            const nextPoint = this.path[0];
            const dx = nextPoint.x - this.tank.x;
            const dy = nextPoint.y - this.tank.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 10) {
                this.path.shift();
            } else {
                // 设置移动方向
                this.tank.targetVelocity.x = (dx / dist) * CONFIG.TANK_SPEED;
                this.tank.targetVelocity.y = (dy / dist) * CONFIG.TANK_SPEED;
                this.tank.angle = Math.atan2(dy, dx);
            }
        }
    }

    aimAtPlayer(player) {
        const target = this.predictedPlayerPos || player;
        const dx = target.x - this.tank.x;
        const dy = target.y - this.tank.y;

        // 添加一些随机误差（基于难度）
        const errorRange = (1 - this.config.accuracy) * 0.5;
        const errorX = randomRange(-errorRange, errorRange);
        const errorY = randomRange(-errorRange, errorRange);

        this.tank.turretAngle = Math.atan2(dy + errorY, dx + errorX);
    }

    tryFire(player) {
        const now = Date.now();
        if (now - this.tank.lastFireTime > CONFIG.FIRE_COOLDOWN) {
            // 移除随机限制 - 冷却好就射击
            // 只保留小的射击误差让游戏更平衡
            const bullet = this.tank.fire();
            if (bullet) {
                bullets.push(bullet);
            }
        }
    }

    checkLineOfSight(from, to) {
        const steps = Math.ceil(distance(from.x, from.y, to.x, to.y) / CONFIG.TILE_SIZE);
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            const tileX = Math.floor(x / CONFIG.TILE_SIZE);
            const tileY = Math.floor(y / CONFIG.TILE_SIZE);

            if (tileY >= 0 && tileY < map.length && tileX >= 0 && tileX < map[0].length) {
                if (map[tileY][tileX] !== 0) {
                    return false;
                }
            }
        }
        return true;
    }

    isBehindCover() {
        // 检查是否有墙保护
        const directions = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 }
        ];

        for (const dir of directions) {
            const checkX = Math.floor((this.tank.x + dir.x * CONFIG.TILE_SIZE) / CONFIG.TILE_SIZE);
            const checkY = Math.floor((this.tank.y + dir.y * CONFIG.TILE_SIZE) / CONFIG.TILE_SIZE);

            if (checkY >= 0 && checkY < map.length && checkX >= 0 && checkX < map[0].length) {
                if (map[checkY][checkX] !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    findCover(player) {
        // 寻找最近的掩体
        const mapGen = new MapGenerator(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, CONFIG.TILE_SIZE);
        let bestCover = null;
        let bestDist = Infinity;

        for (let y = 1; y < map.length - 1; y++) {
            for (let x = 1; x < map[0].length - 1; x++) {
                if (map[y][x] !== 0) {
                    const coverX = x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                    const coverY = y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                    const distToAI = distance(this.tank.x, this.tank.y, coverX, coverY);
                    const distToPlayer = distance(player.x, player.y, coverX, coverY);

                    // 寻找离AI近但离玩家远的掩体
                    if (distToAI < 200 && distToPlayer > 150) {
                        const score = distToAI - distToPlayer * 0.5;
                        if (score < bestDist) {
                            bestDist = score;
                            bestCover = { x: coverX - CONFIG.TILE_SIZE, y: coverY };
                        }
                    }
                }
            }
        }

        this.coverPoint = bestCover;
        if (bestCover) {
            this.state = 'take_cover';
        }
    }

    dodgeBullets() {
        if (this.bulletDodgingCooldown > 0) {
            this.bulletDodgingCooldown--;
            return;
        }

        // 检测是否有子弹接近
        for (const bullet of bullets) {
            if (!bullet.isPlayerBullet) continue;

            const dist = distance(this.tank.x, this.tank.y, bullet.x, bullet.y);
            if (dist < 80) {
                // 计算躲避方向
                const dx = this.tank.x - bullet.x;
                const dy = this.tank.y - bullet.y;
                const len = Math.sqrt(dx * dx + dy * dy);

                if (len > 0) {
                    this.tank.targetVelocity.x = (dx / len) * CONFIG.TANK_SPEED * 1.5;
                    this.tank.targetVelocity.y = (dy / len) * CONFIG.TANK_SPEED * 1.5;
                    this.bulletDodgingCooldown = 30;
                }
                break;
            }
        }
    }

    findPath(from, to) {
        // A*寻路算法
        const startTile = {
            x: Math.floor(from.x / CONFIG.TILE_SIZE),
            y: Math.floor(from.y / CONFIG.TILE_SIZE)
        };
        const endTile = {
            x: Math.floor(to.x / CONFIG.TILE_SIZE),
            y: Math.floor(to.y / CONFIG.TILE_SIZE)
        };

        // 确保起点终点在范围内
        startTile.x = clamp(startTile.x, 1, map[0].length - 2);
        startTile.y = clamp(startTile.y, 1, map.length - 2);
        endTile.x = clamp(endTile.x, 1, map[0].length - 2);
        endTile.y = clamp(endTile.y, 1, map.length - 2);

        const openSet = [startTile];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const getKey = (tile) => `${tile.x},${tile.y}`;

        gScore.set(getKey(startTile), 0);
        fScore.set(getKey(startTile), this.heuristic(startTile, endTile));

        while (openSet.length > 0) {
            // 找到fScore最小的节点
            openSet.sort((a, b) => (fScore.get(getKey(a)) || Infinity) - (fScore.get(getKey(b)) || Infinity));
            const current = openSet.shift();

            if (current.x === endTile.x && current.y === endTile.y) {
                return this.reconstructPath(cameFrom, current);
            }

            // 检查邻居
            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                if (this.isWallAt(neighbor.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                    neighbor.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2)) {
                    continue;
                }

                const tentativeGScore = (gScore.get(getKey(current)) || Infinity) + 1;
                const neighborKey = getKey(neighbor);

                if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, endTile));

                    if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        // 没有找到路径，直接返回目标点
        return [{ x: to.x, y: to.y }];
    }

    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    getNeighbors(tile) {
        const neighbors = [];
        const dirs = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 }
        ];

        for (const dir of dirs) {
            const nx = tile.x + dir.x;
            const ny = tile.y + dir.y;

            if (nx >= 1 && nx < map[0].length - 1 && ny >= 1 && ny < map.length - 1) {
                neighbors.push({ x: nx, y: ny });
            }
        }

        return neighbors;
    }

    reconstructPath(cameFrom, current) {
        const path = [{ x: current.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2, y: current.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 }];
        const getKey = (tile) => `${tile.x},${tile.y}`;

        while (cameFrom.has(getKey(current))) {
            current = cameFrom.get(getKey(current));
            path.unshift({
                x: current.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                y: current.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
            });
        }

        return path.slice(1); // 跳过起点
    }

    isWallAt(x, y) {
        const tileX = Math.floor(x / CONFIG.TILE_SIZE);
        const tileY = Math.floor(y / CONFIG.TILE_SIZE);

        if (tileY < 0 || tileY >= map.length || tileX < 0 || tileX >= map[0].length) {
            return true;
        }

        return map[tileY][tileX] !== 0;
    }
}

// ==================== 游戏主循环 ====================
let mapGenerator;
let aiController;

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // 设置画布大小
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;

    // 创建地图生成器
    mapGenerator = new MapGenerator(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, CONFIG.TILE_SIZE);

    // 设置事件监听
    setupEventListeners();

    // 开始渲染循环
    requestAnimationFrame(gameLoopFn);
}

function setupEventListeners() {
    // 键盘事件
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ') e.preventDefault();
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    // 鼠标事件
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('click', () => {
        if (gameState === 'playing' && playerTank) {
            const bullet = playerTank.fire();
            if (bullet) {
                bullets.push(bullet);
            }
        }
    });

    // UI按钮
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', startGame);

    // 难度选择
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDifficulty = btn.dataset.diff;
        });
    });
}

function startGame() {
    // 生成地图
    map = mapGenerator.generate();

    // 创建坦克
    playerTank = new Tank(
        CONFIG.TILE_SIZE * 2,
        CONFIG.TILE_SIZE * 2,
        '#00ff88',
        true
    );

    aiTank = new Tank(
        CONFIG.CANVAS_WIDTH - CONFIG.TILE_SIZE * 2,
        CONFIG.CANVAS_HEIGHT - CONFIG.TILE_SIZE * 2,
        '#ff4757',
        false
    );

    // 设置AI初始朝向
    aiTank.angle = Math.PI;
    aiTank.turretAngle = Math.PI;

    // 创建AI控制器
    aiController = new AIController(aiTank, currentDifficulty);

    // 重置游戏状态
    bullets = [];
    particles = [];
    explosions = [];
    screenShake = { intensity: 0, duration: 0 };

    // 更新UI
    updateHealthBars();
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');

    gameState = 'playing';
}

function endGame(winner) {
    gameState = 'gameover';

    const winnerText = document.getElementById('winnerText');
    const finalScore = document.getElementById('finalScore');

    if (winner === 'player') {
        winnerText.textContent = '🎉 胜利！';
        winnerText.className = 'winner-title victory';
        playerScore++;
        finalScore.textContent = `你的分数: ${playerScore} | AI分数: ${aiScore}`;
    } else {
        winnerText.textContent = '💀 失败！';
        winnerText.className = 'winner-title defeat';
        aiScore++;
        finalScore.textContent = `你的分数: ${playerScore} | AI分数: ${aiScore}`;
    }

    document.getElementById('playerScore').textContent = `分数: ${playerScore}`;
    document.getElementById('aiScore').textContent = `分数: ${aiScore}`;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function gameLoopFn() {
    update();
    render();
    requestAnimationFrame(gameLoopFn);
}

function update() {
    if (gameState !== 'playing') return;

    // 更新玩家
    if (playerTank && playerTank.health > 0) {
        handlePlayerInput();
        playerTank.update(16);
    }

    // 更新AI
    if (aiTank && aiTank.health > 0 && playerTank) {
        aiController.update(playerTank);
        aiTank.update(16);
    }

    // 更新子弹
    bullets = bullets.filter(bullet => {
        bullet.update();
        return bullet.active;
    });

    // 更新粒子
    particles = particles.filter(particle => {
        particle.update();
        return particle.life > 0;
    });

    // 更新爆炸
    explosions = explosions.filter(explosion => {
        explosion.update();
        return explosion.life > 0;
    });

    // 更新屏幕震动
    if (screenShake.duration > 0) {
        screenShake.duration -= 16;
    }

    // 更新UI
    updateHealthBars();

    // 检查游戏结束
    if (playerTank && playerTank.health <= 0) {
        endGame('ai');
    } else if (aiTank && aiTank.health <= 0) {
        endGame('player');
    }
}

function handlePlayerInput() {
    if (!playerTank) return;

    let moveX = 0;
    let moveY = 0;

    if (keys['w'] || keys['arrowup']) moveY -= 1;
    if (keys['s'] || keys['arrowdown']) moveY += 1;
    if (keys['a'] || keys['arrowleft']) moveX -= 1;
    if (keys['d'] || keys['arrowright']) moveX += 1;

    // 归一化移动向量
    if (moveX !== 0 || moveY !== 0) {
        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX /= length;
        moveY /= length;

        playerTank.targetVelocity.x = moveX * CONFIG.TANK_SPEED;
        playerTank.targetVelocity.y = moveY * CONFIG.TANK_SPEED;
        playerTank.angle = Math.atan2(moveY, moveX);
    } else {
        playerTank.targetVelocity.x = 0;
        playerTank.targetVelocity.y = 0;
    }

    // 炮塔瞄准鼠标
    const dx = mouseX - playerTank.x;
    const dy = mouseY - playerTank.y;
    playerTank.turretAngle = Math.atan2(dy, dx);

    // 空格射击
    if (keys[' ']) {
        const bullet = playerTank.fire();
        if (bullet) {
            bullets.push(bullet);
        }
    }
}

function updateHealthBars() {
    if (playerTank) {
        const percent = (playerTank.health / playerTank.maxHealth) * 100;
        document.getElementById('playerHealthBar').style.width = `${percent}%`;
    }
    if (aiTank) {
        const percent = (aiTank.health / aiTank.maxHealth) * 100;
        document.getElementById('aiHealthBar').style.width = `${percent}%`;
    }
}

function render() {
    // 清空画布
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 应用屏幕震动
    ctx.save();
    if (screenShake.duration > 0 && screenShake.intensity > 0) {
        const shakeX = randomRange(-screenShake.intensity, screenShake.intensity);
        const shakeY = randomRange(-screenShake.intensity, screenShake.intensity);
        ctx.translate(shakeX, shakeY);
    }

    // 渲染地图
    if (mapGenerator && map.length > 0) {
        mapGenerator.render(ctx);
    }

    // 渲染子弹
    bullets.forEach(bullet => bullet.render(ctx));

    // 渲染坦克
    if (playerTank && playerTank.health > 0) {
        playerTank.render(ctx);
    }
    if (aiTank && aiTank.health > 0) {
        aiTank.render(ctx);
    }

    // 渲染粒子
    particles.forEach(particle => particle.render(ctx));

    // 渲染爆炸
    explosions.forEach(explosion => explosion.render(ctx));

    ctx.restore();

    // 渲染准星
    if (gameState === 'playing' && playerTank) {
        renderCrosshair();
    }
}

function renderCrosshair() {
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
    ctx.lineWidth = 2;

    // 外圈
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 15, 0, Math.PI * 2);
    ctx.stroke();

    // 十字线
    ctx.beginPath();
    ctx.moveTo(mouseX - 20, mouseY);
    ctx.lineTo(mouseX - 8, mouseY);
    ctx.moveTo(mouseX + 8, mouseY);
    ctx.lineTo(mouseX + 20, mouseY);
    ctx.moveTo(mouseX, mouseY - 20);
    ctx.lineTo(mouseX, mouseY - 8);
    ctx.moveTo(mouseX, mouseY + 8);
    ctx.lineTo(mouseX, mouseY + 20);
    ctx.stroke();

    // 中心点
    ctx.fillStyle = 'rgba(0, 255, 136, 0.8)';
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 2, 0, Math.PI * 2);
    ctx.fill();
}

// ==================== 初始化 ====================
window.addEventListener('load', init);
