---
title: 使用 ftp 在 windows 与 linux 虚拟机之间传输文件
---


物理主机为 windows 8.1，虚拟机 VirtualBox，里面装的 ubuntu。

## windows 建立 ftp server

在 cmd 中输入以下命令，在当前目录建立 FTP 服务，需要先安装 python 及 pyftpdlib 模块([使用Python创建简单的HTTP和FTP服务](http://www.cnblogs.com/yili16438/p/d3209323913c6d53e6060fcd8d27e4c0.html))。

	python -m pyftpdlib -p 21

## linux ftp 连接

windows 打开任务管理器，点击性能，可以看到有一个以太网网络连接，点击它，可以看到它是 VirtualBox 建立的虚拟网络，IPv4 地址是 192.168.56.1。

linux 输入命令：

	ftp 192.168.56.1
	//用户名 anonymous
	//密码 无（直接按回车键）

登录成功，ftp 中再输入：

	ls
	//501 Rejected data connection to foreign address 10.0.2.15:43984.
	 
Google 之后，尝试设置为被动模式[FTP的主动模式(PORT Mode)及被动模式(Passive Mode)](http://kb.cnblogs.com/page/71531/)。

linux ftp 中输入命令：

	passive
	//Passive mode on.
	ls
	//显示文件列表，

##3. 多文件下载和目录下载

使用 wget 下载目录/文件夹[linux命令行下的ftp 多文件下载和目录下载](http://yahoon.blog.51cto.com/13184/200991/)。

命令格式 `wget ftp://IP:PORT/* --ftp-user=xxx --ftp-password=xxx -r`
其中 `-r` 参数必须有,否则下载下来的就一个文件 index.html，`-r`参数（表示递归下载）就是用来下载目录的。[wget命令](http://www.cnblogs.com/peida/archive/2013/03/18/2965369.html)

linux中输入以下命令，下载所有文件：

	wget ftp://192.168.56.1:21/ -r
	//将会保存到当前目录下，名称为192.168.56.1的目录中

- `-O`（大写O） 表示用新文件名保存
- `-P` 表示保存到指定目录下
- `-X` 排除某些文件或者文件夹
- `-N` 不要重新下载文件除非比本地文件新
- `-nv` 关掉冗长模式，但不是安静模式
- `-P` –directory-prefix=PREFIX 将文件保存到目录 PREFIX/…

示例:

	wget ftp://192.168.56.1/ -r -X "oth","app/static/node_modules" -N -nv -P ..