---
title: 使用Docker构建高效Web开发环境
---

本文介绍如何使用 Docker 构建一个高效的 Web 开发环境(Linux+Docker+Python+JavaScript)，这也是我的日常开发环境。

## 准备Docker

1. 安装Docker

    https://docker.github.io/engine/installation/linux/   
    不要漏了阅读 **Create a Docker group** 部分。
    
2. 安装Docker Compose

    https://docker.github.io/compose/install/  
    也可以使用 `pip install docker-compose` 安装。

3. Docker Compose快捷命令
    
    ```bash
    $ which docker-compose
    /usr/bin/docker-compose
    $ cp /usr/bin/docker-compose /usr/bin/dc
    ```
    因为在我的系统(Arch Linux)上，`dc`是一个系统自带的任意精度的计算器，所以直接覆盖它。
    如果你的系统没有自带`dc`，你也可以在`~/.bashrc`文件中添加`alias dc=docker-compose`实现。

## Docker镜像加速

我刚开始使用Docker时最烦的就是下载镜像，太！慢！了！

现在DaoCloud和阿里云都有提供免费的镜像加速服务，逐渐也有其他一些服务商提供镜像加速。

首先，需要获取一个镜像加速地址(registry-mirror)，需注册后打开下面链接。  
DaoCloud传送门: https://www.daocloud.io/mirror  
阿里云传送门: https://cr.console.aliyun.com  

如果您的系统是 Ubuntu 12.04 14.04，Debain 8 等系统，Docker 1.9 以上，编辑`/etc/default/docker`文件，添加或修改registry-mirror:

```bash
DOCKER_OPTS="$DOCKER_OPTS --registry-mirror=https://xxxxxx.mirror.aliyuncs.com"
```

重启Docker:
```bash
sudo service docker restart
```

如果你的系统使用 systemd 作为系统和服务管理器，Docker 1.9 以上，编辑`/usr/lib/systemd/system/docker.service`文件，添加或修改registry-mirror:

```bash
ExecStart=/usr/bin/dockerd -H fd:// --registry-mirror=https://xxxxxx.mirror.aliyuncs.com
```

重启Docker:
```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

可以使用服务商提供的脚本一键配置(不一定能配成功)。  
另外可以参考这篇文章: [Docker下使用镜像加速](http://www.imike.me/2016/04/20/Docker下使用镜像加速/)

## 把依赖装进Docker

## PyPI镜像加速

推荐豆瓣的镜像，速度很快。

命令行使用，`-i`参数: 

```bash
pip install -r requires.txt -i https://pypi.douban.com/simple
```

全局配置，编辑 `~/.config/pip/pip.conf` 文件:

```ini
[global]
index-url = https://pypi.douban.com/simple
```

## Makefile快捷命令

## Python高效测试

## npm镜像加速

推荐淘宝镜像: https://npm.taobao.org/

命令行使用:
```
npm --registry=https://registry.npm.taobao.org
```
全局设置:
```
npm config set registry=https://registry.npm.taobao.org
```

## 前后端分离
