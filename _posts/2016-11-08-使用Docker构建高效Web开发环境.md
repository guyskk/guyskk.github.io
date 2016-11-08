---
title: 使用Docker构建高效Web开发环境
---

本文介绍如何使用 Docker 构建一个高效的 Web 开发环境(Linux+Docker+Python+JavaScript)，这也是我的日常开发环境。

## 准备Docker

1. 安装Docker

    [https://docker.github.io/engine/installation/linux/](https://docker.github.io/engine/installation/linux/)   
    不要漏了阅读 **Create a Docker group** 部分。
    
2. 安装Docker Compose

    [https://docker.github.io/compose/install/](https://docker.github.io/compose/install/)  
    也可以使用 `pip install docker-compose` 安装。

3. Docker Compose快捷命令
    
        $ which docker-compose
        /usr/bin/docker-compose
        $ cp /usr/bin/docker-compose /usr/bin/dc

    因为在我的系统(Arch Linux)上，`dc`是一个系统自带的任意精度的计算器，所以直接覆盖它。
    如果你的系统没有自带`dc`，你也可以在`~/.bashrc`文件中添加`alias dc=docker-compose`实现。

4. 用Google搜`Docker教程`，赶紧入门吧。另外，[Docker官网](https://docs.docker.com/)的教程最新，最准确，最全面，非常值得去看。


## Docker镜像加速

刚开始使用Docker时最烦的就是下载镜像，太！慢！了！

现在DaoCloud和阿里云都有提供免费的镜像加速服务，逐渐也有其他一些服务商提供镜像加速。

首先，需要获取一个镜像加速地址(registry-mirror)，需注册后打开下面链接。  
DaoCloud传送门: [https://www.daocloud.io/mirror](https://www.daocloud.io/mirror)  
阿里云传送门: [https://cr.console.aliyun.com](https://cr.console.aliyun.com)  

如果您的系统是 Ubuntu 12.04 14.04，Debain 8 等系统，Docker 1.9 以上，编辑`/etc/default/docker`文件，添加或修改registry-mirror:

    DOCKER_OPTS="$DOCKER_OPTS --registry-mirror=https://xxxxxx.mirror.aliyuncs.com"

重启Docker:

    sudo service docker restart

如果你的系统使用 systemd 作为系统和服务管理器，Docker 1.9 以上，编辑`/usr/lib/systemd/system/docker.service`文件，添加或修改registry-mirror:

    ExecStart=/usr/bin/dockerd -H fd:// --registry-mirror=https://xxxxxx.mirror.aliyuncs.com

重启Docker:

    sudo systemctl daemon-reload
    sudo systemctl restart docker

可以使用服务商提供的脚本一键配置(不一定能配成功)。  
另外可以参考这篇文章: [Docker下使用镜像加速](http://www.imike.me/2016/04/20/Docker下使用镜像加速/)


## PyPI镜像加速

推荐豆瓣的镜像，速度很快。

命令行使用，`-i`参数: 


    pip install -r requires.txt -i https://pypi.douban.com/simple


全局配置，编辑 `~/.config/pip/pip.conf` 文件:

    ini
    [global]
    index-url = https://pypi.douban.com/simple



## npm镜像加速

推荐淘宝镜像 [https://npm.taobao.org/](https://npm.taobao.org/)

命令行使用:

    npm --registry=https://registry.npm.taobao.org

全局设置:

    npm config set registry=https://registry.npm.taobao.org


## 把依赖装进Docker

Web开发，基本上都会用到数据库，缓存等等。使用Docker可以轻松的安装和控制这些依赖，这也是高效测试的基础。

通常项目结构如下(这里只介绍开发环境，生产环境以后再补充):

    app/                          项目代码
    docker/                       容器的初始配置
    data/                         数据，日志等等
    manage.py                     启动脚本
    Dockerfile                    生产环境镜像
    docker-compose.yml            生产环境
    docker-compose-dev.yml        开发环境

首先创建一个`docker-compose-dev.yml`文件，这里假设依赖 MySQL 5.7 和 Redis:

    version: '2'
    services:
      mysql:
        image: mysql:5.7
        environment:
          - MYSQL_ROOT_PASSWORD=root
        volumes:
          - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
          - ./data/mysql:/var/lib/mysql
        ports:
          - "3306:3306"
      redis:
        image: redis:3
        volumes:
          - ./data/redis:/data
        ports:
          - "6379:6379"

`./docker/mysql/init.sql`是用于创建数据库的脚本
(参考: [https://hub.docker.com/\_/mysql/](https://hub.docker.com/\_/mysql/))，
为了与线上数据库编码保持一致，内容大致如下:

    create database if not exists mydb character set utf8mb4 collate utf8mb4_unicode_ci;

运行以下命令，稍等片刻，所有依赖就启动好了:

    dc -f docker-compose-dev.yml up

如果需要操作数据库:
  
    dc -f docker-compose-dev.yml exec mysql mysql -uroot -proot mydb


## Makefile快捷命令

Make是Linux下最常用的构建工具，构建规则都写在Makefile文件里面，主要用于C语言的项目。
这里只用到它的一小部分功能: **快捷命令**，
其他功能可参考[Make 命令教程](http://www.ruanyifeng.com/blog/2015/02/make.html)。

创建一个Makefile文件，内容如下(注意[使用TAB缩进](http://stackoverflow.com/questions/920413/make-error-missing-separator)):

    dev:
        echo "docker is awesome!"

然后执行`make dev`:

    $ make dev
    echo 'docker is awesome!'
    docker is awesome!

也可以在命令前面加上`@`:

    dev:
        @echo "docker is awesome!"

然后执行`make dev`，命令本身就不会显示出来了:

    $ make dev
    docker is awesome!

最终版本:
    
    dev:
        @docker-compose -f docker-compose-dev.yml up
    
    mysql:
        @docker-compose -f docker-compose-dev.yml exec mysql mysql -uroot -proot mydb


## Python高效测试

我是单元测试的忠实拥护者，因为我意识到单元测试能极大的减少调试，修改BUG，重构的时间和痛苦。

当我重构一个 Python 2 的库时，因为有完善的单元测试，所有我能放心大胆的修改代码，修改之后我
只需运行一下测试就知道哪里还有问题需要修改，而不用去猜测和仔细检查代码以避免疏漏。
当全部测试通过之后，我就有信心这个库不会出大的Bug，至少能和上一个版本差不多稳定。

另一方面，我也意识到不能过度追求测试的数量和覆盖率。

过度的测试需要花费太多的时间和精力，而收到的效果甚微，95% 和 99% 的测试覆盖率其实差别不大，
99% 和 100% 的差别就更小了，但是为了达到更高的测试覆盖率，却需要仔细的构造测试用例才能执行到未测试的代码。

测试的付出和收益中有个平衡点，达到预期目标即可，简言之，点到为止:

> my philosophy is to test as little as possible to reach a given level of confidence

这两篇问答很值得一读:

[http://stackoverflow.com/questions/67299/is-unit-testing-worth-the-effort](http://stackoverflow.com/questions/67299/is-unit-testing-worth-the-effort)
[http://stackoverflow.com/questions/153234/how-deep-are-your-unit-tests/153565](http://stackoverflow.com/questions/153234/how-deep-are-your-unit-tests/153565)


上面介绍的是测试之道，下面说的是测试之术。

- 对接口做测试，不对具体实现做测试

    接口是供其他模块调用的最小单元，参数，返回值，可能抛出的异常这些都比较明确，接口也较少出现改动。
    这意味着对接口做测试的优势:

    - 有价值，不测别人不用的代码
    - 容易测，接口文档明确
    - 不用改，接口较少改动

- 开发人员自测，先写具体实现后写测试

    自己的代码自己测，一方面自己对自己写的接口会更熟悉，容易编写测试用例。
    另一方面是自己的屁股自己擦，自己写的代码理应保证逻辑正确，如果测试中发现Bug自己可以及时改，
    不用等测试人员告诉你：大哥，你屁股没擦干净！
    
    先写具体实现后写测试是因为如果先写测试，就要求接口设计非常完善，不然写具体实现时发现
    接口设计不合理，再去修改测试代码就浪费了时间和精力。另外，测试是为了检验逻辑是否正确，
    如果只有测试没有具体实现，难以判断测试写的对不对，看不到测试覆盖率，就难以判断测试完不完善。

- 用Docker运行测试数据库
    
    业务代码很多都是增删查改，所以不可能mock一个数据库。
    另外测试过程中会产生很多垃圾数据，绝对不能用生产环境的数据库去测。
    用Docker运行测试数据库是一个非常好的解决办法，启动停止都非常简单。
    如果项目比较大，测试时间较长，还可以用内存来存储数据库数据(使用宿主机的/tmp目录):
    
        volumes:
          - /tmp/mysql:/var/lib/mysql
              
    这样测试速度能提高10倍左右。
    
- 测试之间相互独立，可以按模块单独运行

    测试开始前创建表，写入初始数据，测试结束清空数据库，这样就能保证数据库里面的数据是确定的。
    
    使用[pytest](http://doc.pytest.org/en/latest)执行测试，它可以控制执行
    哪些测试，不必每次都执行全部测试，插件也很丰富，非常方便。

- 借助 [ipdb](https://pypi.python.org/pypi/ipdb) 或 [pdb](https://docs.python.org/3/library/pdb.html) 进行调试
    
