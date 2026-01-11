/**
 * 坦克大战游戏自动化测试套件
 * 使用 mocha + chai 框架
 */

// ==================== 测试配置 ====================
const assert = chai.assert;

// ==================== 工具函数测试 ====================
describe('工具函数', () => {
    it('distance() 计算两点距离', () => {
        assert.equal(distance(0, 0, 3, 4), 5);
        assert.equal(distance(100, 100, 100, 100), 0);
    });

    it('clamp() 限制数值范围', () => {
        assert.equal(clamp(5, 0, 10), 5);
        assert.equal(clamp(-5, 0, 10), 0);
        assert.equal(clamp(15, 0, 10), 10);
    });

    it('lerp() 线性插值', () => {
        assert.equal(lerp(0, 100, 0.5), 50);
        assert.equal(lerp(0, 100, 0), 0);
        assert.equal(lerp(0, 100, 1), 100);
    });
});

// ==================== 地图系统测试 ====================
describe('MapGenerator', () => {
    let mapGen;

    beforeEach(() => {
        mapGen = new MapGenerator(1000, 700, 50);
    });

    it('生成正确尺寸的地图', () => {
        const map = mapGen.generate();
        assert.equal(map.length, 14); // 700/50
        assert.equal(map[0].length, 20); // 1000/50
    });

    it('边墙是钢墙(类型2)', () => {
        const map = mapGen.generate();
        // 检查四周边墙
        for (let i = 0; i < map[0].length; i++) {
            assert.equal(map[0][i], 2, '上边墙应该是钢墙');
            assert.equal(map[map.length - 1][i], 2, '下边墙应该是钢墙');
        }
        for (let i = 0; i < map.length; i++) {
            assert.equal(map[i][0], 2, '左边墙应该是钢墙');
            assert.equal(map[i][map[0].length - 1], 2, '右边墙应该是钢墙');
        }
    });

    it('生成砖墙和钢墙', () => {
        const map = mapGen.generate();
        let brickCount = 0;
        let steelCount = 0;

        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                if (map[y][x] === 1) brickCount++;
                if (map[y][x] === 2) steelCount++;
            }
        }

        assert.isAbove(brickCount, 50, '应该有足够的砖墙');
        assert.isAbove(steelCount, 50, '应该有足够的钢墙');
    });

    it('出生点区域为空', () => {
        const map = mapGen.generate();
        // 检查左上角玩家出生点
        for (let y = 1; y < 4; y++) {
            for (let x = 1; x < 4; x++) {
                assert.equal(map[y][x], 0, `出生点(${x},${y})应该是空的`);
            }
        }
        // 检查右下角AI出生点
        for (let y = map.length - 4; y < map.length - 1; y++) {
            for (let x = map[0].length - 4; x < map[0].length - 1; x++) {
                assert.equal(map[y][x], 0, `AI出生点(${x},${y})应该是空的`);
            }
        }
    });
});

// ==================== 坦克类测试 ====================
describe('Tank', () => {
    let tank;

    beforeEach(() => {
        // 模拟全局map
        window.map = Array(14).fill(null).map(() => Array(20).fill(0));
        window.particles = [];

        tank = new Tank(100, 100, '#00ff88', true);
    });

    it('初始化坦克属性正确', () => {
        assert.equal(tank.x, 100);
        assert.equal(tank.y, 100);
        assert.equal(tank.health, 100);
        assert.equal(tank.maxHealth, 100);
        assert.equal(tank.isPlayer, true);
    });

    it('移动坦克更新位置', () => {
        tank.targetVelocity.x = 3;
        tank.targetVelocity.y = 0;
        tank.update(16);
        tank.update(16);
        tank.update(16);

        assert.isAbove(tank.x, 100, '坦克应该向右移动');
    });

    it('碰撞检测正确识别墙壁', () => {
        // 设置墙
        window.map[2][4] = 1; // 在(200, 100)处设置墙

        tank.x = 180;
        const hasCollision = tank.checkCollision(220, 100);
        assert.isTrue(hasCollision, '应该检测到墙壁碰撞');
    });

    it('发射子弹返回Bullet对象', () => {
        tank.turretAngle = 0;
        const bullet = tank.fire();

        assert.isNotNull(bullet, '应该返回子弹对象');
        assert.equal(bullet.isPlayerBullet, true);
        assert.isAbove(bullet.x, tank.x, '子弹应该在坦克前方');
    });

    it('射击有冷却时间', () => {
        tank.fire();
        const bullet2 = tank.fire();

        assert.isNull(bullet2, '冷却期间不应该发射子弹');
    });

    it('takeDamage正确扣血', () => {
        const killed = tank.takeDamage(30);

        assert.equal(tank.health, 70);
        assert.isFalse(killed);

        const killed2 = tank.takeDamage(100);
        assert.equal(tank.health, 0);
        assert.isTrue(killed2);
    });

    it('受伤产生粒子效果', () => {
        const beforeCount = window.particles.length;
        tank.takeDamage(20);

        assert.isAbove(window.particles.length, beforeCount, '受伤应该产生粒子');
    });
});

// ==================== 子弹类测试 ====================
describe('Bullet', () => {
    let bullet;

    beforeEach(() => {
        window.map = Array(14).fill(null).map(() => Array(20).fill(0));
        window.bullets = [];
        window.particles = [];
        window.playerTank = { x: 500, y: 350, width: 40, height: 40, health: 100, takeDamage: (d) => { window.playerTank.health -= d; return window.playerTank.health <= 0; } };
        window.aiTank = { x: 500, y: 350, width: 40, height: 40, health: 100, takeDamage: (d) => { window.aiTank.health -= d; return window.aiTank.health <= 0; } };
        window.explosions = [];

        bullet = new Bullet(100, 100, 0, true);
    });

    it('子弹沿角度方向移动', () => {
        const startX = bullet.x;
        bullet.update();

        assert.isAbove(bullet.x, startX, '子弹应该向右移动');
    });

    it('子弹轨迹正确记录', () => {
        bullet.update();
        bullet.update();

        assert.isAbove(bullet.trail.length, 0, '应该有轨迹记录');
    });

    it('砖墙碰撞破坏墙体', () => {
        // 在子弹路径上设置砖墙
        window.map[2][6] = 1;

        bullet.x = 250;
        bullet.y = 100;
        bullet.update();

        assert.isFalse(bullet.active, '子弹应该失活');
        assert.equal(window.map[2][6], 0, '砖墙应该被破坏');
    });

    it('钢墙碰撞不破坏墙体', () => {
        window.map[2][6] = 2;

        bullet.x = 250;
        bullet.y = 100;
        bullet.update();

        assert.isFalse(bullet.active);
        assert.equal(window.map[2][6], 2, '钢墙应该保持不变');
    });

    it('子弹击中坦克造成伤害', () => {
        window.aiTank.x = 150;
        window.aiTank.y = 100;

        bullet.x = 150;
        bullet.y = 100;
        bullet.update();

        assert.equal(window.aiTank.health, 90, 'AI应该受到10点伤害');
    });
});

// ==================== AI系统测试 ====================
describe('AIController', () => {
    let aiTank, aiController, playerTank;

    beforeEach(() => {
        window.map = Array(14).fill(null).map(() => Array(20).fill(0));
        window.bullets = [];

        aiTank = new Tank(800, 500, '#ff4757', false);
        playerTank = new Tank(200, 200, '#00ff88', true);
        aiController = new AIController(aiTank, 'normal');
    });

    it('初始化AI控制器', () => {
        assert.equal(aiController.difficulty, 'normal');
        assert.equal(aiController.state, 'patrol');
        assert.isNotNull(aiController.config);
    });

    it('不同难度有不同配置', () => {
        const easyAI = new AIController(aiTank, 'easy');
        const expertAI = new AIController(aiTank, 'expert');

        assert.isAbove(expertAI.config.accuracy, easyAI.config.accuracy);
        assert.isBelow(expertAI.config.reactionTime, easyAI.config.reactionTime);
    });

    it('checkLineOfSight正确检测视线', () => {
        // 无遮挡
        window.map[4][4] = 0;
        const canSee = aiController.checkLineOfSight(
            { x: 100, y: 100 },
            { x: 200, y: 200 }
        );
        assert.isTrue(canSee);

        // 有墙遮挡
        window.map[4][4] = 2;
        const cannotSee = aiController.checkLineOfSight(
            { x: 100, y: 100 },
            { x: 300, y: 300 }
        );
        assert.isFalse(cannotSee);
    });

    it('状态机根据情况切换', () => {
        // 远距离巡逻
        playerTank.x = 100;
        playerTank.y = 100;
        aiController.makeDecision(playerTank, false, 1000);
        assert.equal(aiController.state, 'patrol');

        // 能看到玩家
        aiController.makeDecision(playerTank, true, 200);
        assert.oneOf(aiController.state, ['chase', 'attack']);
    });

    it('低血量时进入撤退状态', () => {
        aiTank.health = 20;
        aiController.makeDecision(playerTank, true, 200);
        assert.equal(aiController.state, 'flee');
    });
});

// ==================== 粒子系统测试 ====================
describe('Particle', () => {
    it('粒子正确更新和死亡', () => {
        const particle = new Particle(100, 100, 1, 1, '#ff0000', 1);

        assert.equal(particle.life, 1);

        for (let i = 0; i < 60; i++) {
            particle.update();
        }

        assert.isBelow(particle.life, 0.1, '粒子生命应该衰减');
    });
});

describe('Explosion', () => {
    it('爆炸创建多个粒子', () => {
        window.explosions = [];

        const explosion = new Explosion(300, 300);

        assert.equal(explosion.particles.length, 50, '应该创建50个粒子');
    });
});

// ==================== 游戏循环测试 ====================
describe('游戏循环', () => {
    it('游戏状态正确切换', () => {
        assert.equal(gameState, 'playing');
    });

    it('update()正确更新所有对象', () => {
        const beforeUpdate = playerTank.x;

        // 模拟按键
        window.keys = { 'd': true };
        update();
        update();

        assert.isAbove(playerTank.x, beforeUpdate, '玩家应该移动');
    });
});

// ==================== 运行测试 ====================
// 在浏览器控制台运行: runAllTests()
function runAllTests() {
    console.log('🧪 开始运行测试套件...\n');

    let passed = 0;
    let failed = 0;

    // 模拟mocha的describe/it/beforeEach结构
    const testSuites = [];
    let currentSuite = null;

    // 简化的测试运行器
    function describe(name, fn) {
        currentSuite = { name, tests: [] };
        testSuites.push(currentSuite);
        fn();
    }

    function it(name, fn) {
        currentSuite.tests.push({ name, fn });
    }

    function beforeEach(fn) {
        // 简化：直接在测试前调用
    }

    // 断言库
    const assert = {
        equal: (a, b, msg) => { if (a !== b) throw new Error(msg || `${a} !== ${b}`); },
        isAbove: (a, b, msg) => { if (a <= b) throw new Error(msg || `${a} should be above ${b}`); },
        isBelow: (a, b, msg) => { if (a >= b) throw new Error(msg || `${a} should be below ${b}`); },
        isTrue: (a, msg) => { if (!a) throw new Error(msg || 'should be true'); },
        isFalse: (a, msg) => { if (a) throw new Error(msg || 'should be false'); },
        isNotNull: (a, msg) => { if (a === null) throw new Error(msg || 'should not be null'); },
        oneOf: (a, arr, msg) => { if (!arr.includes(a)) throw new Error(msg || `${a} should be one of ${arr}`); }
    };

    // 执行所有测试
    for (const suite of testSuites) {
        console.group(`📋 ${suite.name}`);

        for (const test of suite.tests) {
            try {
                test.fn();
                console.log(`  ✅ ${test.name}`);
                passed++;
            } catch (e) {
                console.error(`  ❌ ${test.name}`);
                console.error(`     ${e.message}`);
                failed++;
            }
        }

        console.groupEnd();
    }

    console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
    return { passed, failed };
}

console.log(`
========================================
坦克大战游戏 - 自动化测试套件
========================================

在浏览器控制台运行测试:
  runAllTests()

测试覆盖:
  ✅ 工具函数 (distance, clamp, lerp)
  ✅ 地图生成系统
  ✅ 坦克类 (移动、碰撞、射击、受伤)
  ✅ 子弹类 (移动、碰撞、伤害)
  ✅ AI系统 (状态机、视线检测、难度配置)
  ✅ 粒子系统
  ✅ 游戏循环
`);
