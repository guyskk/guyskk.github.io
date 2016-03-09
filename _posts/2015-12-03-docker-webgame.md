---
title: 用 docker 部署童年的经典游戏
---


```
git clone https://bitbucket.org/dubuqingfeng/docker-web-game.git
cd docker-web-game/
docker build -t 'web-game' .
docker run -t -i -d -p 80:80 web-game
```