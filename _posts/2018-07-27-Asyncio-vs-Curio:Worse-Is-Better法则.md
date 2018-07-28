---
title: "Asyncio-vs-Curio: Worse-Is-Better法则"
---

为什么设计良好的软件没能成为主流？

按照一般的直觉，一款好的软件具有以下特点：

1.  简洁 - 接口和实现都应当简洁，接口简洁优先于实现简洁
2.  正确 - 功能必须正确，Bug 越少越好
3.  一致 - 接口以及用法应当一致，不应当有零零散散，格格不入的接口
4.  完整 - 功能应当完整，设计时应考虑到尽可能多的使用场景

然而，成为主流的却是更差的软件（[Worse is Better](http://dreamsongs.com/WIB.html)）：

1.  实现简单，接口不一定简单
2.  基本正确，先发布再解决 Bug
3.  基本一致，许多零零散散的接口
4.  基本完整，只实现了目前要用的功能

本文假设你对 Python 协程已有一定的了解。

## Curio 与 Asyncio

[Curio](https://github.com/dabeaz/curio) 和 Asyncio 类似，但实现方式截然不同。

Curio 是基于用户态的内核（调度器），使用生成器实现系统调用（CPU 中断）。

```python
from types import coroutine

@coroutine
def syscall_wait_read(fd):
    yield ('wait_read', fd)
    print(fd, 'readable!')

# 内核的调度逻辑
>>> gen = syscall_wait_read(1)
>>> gen.send(None)  # 驱动生成器运行（协程本质上就是生成器）
('wait_read', 1)  # 内核收到系统调用，（省略）监听文件描述符
>>> gen.send(None)  # 文件可读时，系统调用返回
1 readable!
>>>
```

生成器是协程与内核的完美分界线，Curio 基于此实现用户态内核。
Curio 提供的 socket API, 调度 API，同步原语等等都不直接依赖于内核，并且接口与现有的同步接口一致，
学习成本非常低，也没有 Transport，Protocol，Flow Control 等复杂概念。

从同步到异步，Curio 只提供一个入口，即 `run` 函数：

```python
from curio import run

async def main():
    return 'hello curio'

message = run(main)
```

`run` 是运行协程的唯一入口，它会创建一个内核并运行协程，协程结束时内核也会一起销毁。

实现原理可以参考 David Beazley 的演讲：
[Fear and Awaiting in Async 2016](https://www.youtube.com/watch?v=Bm96RqNGbGo)

Asyncio 在 Python 3.5 中加入标准库，它是基于回调的异步 IO。
在 Python 中写回调函数比较麻烦，所以将回调封装成期物（Future），和 Promise 概念类似。

```python
from asyncio import Future

# 模拟EventLoop的add_reader方法
def add_reader(fd, callback):
    # （省略）监听文件描述符
    pass  # 当文件可读时，执行回调函数

async def wait_read(fd):
    fut = Future()
    add_reader(fd, fut.set_result)
    return await fut

# 演示
>>> gen = wait_read(1)
>>> gen.send(None)
<Future pending>  # 事件循环收到了Future对象！
>>>
```

注意协程自身也是 Future！
当协程需要等待时，它会产出它在等待的 Future，事件循环负责把两个 Future 串起来，
最终会形成一条等待链，链头的 Future 则等待注册在事件循环中的回调函数被调用。

在 Asyncio 里 Future 与 EventLoop 是紧密耦合的，为了注册回调函数你必须先拿到 EventLoop 对象。
为了避免到处传递 EventLoop，只能把 EventLoop 注册成全局变量（简单粗暴）。

EventLoop 成了一个大杂烩，集所有功能于一身（实际上只实现了常用的功能），
只要有需求，什么功能都可以往上加。

## Worse Is Better

和 “过早的优化是万恶之源” 一样，过早的追求简洁，正确、一致、完整是失败之源。

### 没有绝对正确

绝对正确是不切实际的，即使 Linux 内核设计得如此细致，并且经历了二十多年时间的考验，
聪明的黑客总能找到它的漏洞。
过早追求正确也是不切实际的。在有限的人力，有限的时间內，你不可能面面俱到考虑所有的情况。
你也无法超出自身的认知范围，就算设计得再细致，你只能保证你知道自己知道的那部分正确（已知的已知），
无法保证你不知道自己不知道的那部分正确（未知的未知）。

从表面上看，Curio 应该有更少的 Bug，因为它的设计更合理。实际使用后，
你会发现它和 Asyncio 的 Bug 一样多，甚至更多，因为作者只能把已知的已知写对，
对于未知的未知，大家都无能为力。而 Asyncio 使用者更多，很多未知 Bug 就更容易被发现，
随着时间推移，它的 Bug 也就更少了。

### 一致性是空想

也许你知道 Unix 的 `creat` 函数，听过 
[what-did-ken-thompson-mean-when-he-said-id-spell-create-with-an-e](http://unix.stackexchange.com/questions/10893/what-did-ken-thompson-mean-when-he-said-id-spell-create-with-an-e)
这个故事。

> Yes, this function’s name is missing an e. Ken Thompson,
> the creator of Unix, once joked that the missing letter
> was his largest regret in the design of Unix.

真实的软件里不一致处处可见，可能是疏忽大意造成的拼写错误，
也可能为了支持新特性可能不得不增加几个格格不入的函数，还可能这个函数本来很一致，
过了一段时间增加了很多不一致的函数，原本一致的函数反而显得不一致的。

你肯定知道 Asyncio 的事件循环有 `run_forever` 和 `run_until_complete` 两个方法。
为什么有两个，而且名字还这么长？
你知道 `call_soon` 和 `call_soon_threadsafe` 的区别吗？
`call_soon` 并不是线程不安全，`call_soon_threadsafe` 应当叫做 `call_soon_and_wakeup_event_loop`，
只是这个功能恰好是在线程里面使用。

Joel Spolsky 在《软件随想录》中有一篇文章讲 “为什么微软 Office 的文件格式如此复杂？”，推荐阅读。

### 完整是不可能的

绝对完整显然是不可能的，那么相对完整呢？
按照 80/20 法则，80% 的用户只会用到软件 20% 的功能。
这是否意味着只要实现 20% 的功能，就可以认为软件相对完整了？

如果你和竞对同时开发类似产品，你的对手只实现 20% 的功能就发布了，
而你等到实现 80% 的功能才发布产品。等到了发布这一天，
你发现所有人都在问你的产品比竞对有什么优势，更糟糕的是用户问你支不支持竞品的某个功能，
这个功能本来是个 Bug，只是用的人多了反而成了 Feature。

最小可用产品（MVP）和快速迭代是明智之举，软件的第一个版本只要基本可用就行了。
如果用户对你的功能感兴趣，你会很快收到反馈，让你知道你的产品确实有用，然后进入快速迭代。
如果用户不感兴趣呢？很可能你在做一个注定失败的产品。

Curio 的 Socket API 和标准库几乎一致，比 Asyncio 完整好几倍。
Asyncio 只提供了几个常用的 API，很多功能到现在都还没有。

有一次我想要一个 `wait_readable` 方法，发现 Curio 只有 `wait_writeable`，
于是我给作者提了 Issue 和 PR，然后被拒绝了。标准库的 Socket 并没有 `wait_readable` 方法，
从一致性的角度考虑，不应当提供这个接口，所以 `wait_writeable` 也被删除了。

这个需求虽然不是很合理，但终究还是要解决的，我只能想办法绕过了。
在 Asyncio 里有个 `add_reader` 方法，它只是把底层的 API 直接暴露出来了而已，
也许作者也不清楚有哪些使用场景，但恰好能解决我的问题。

这篇文章 [RethinkDB: why we failed](http://www.defmacro.org/2017/01/18/why-rethinkdb-failed.html)
作者分析了他们过早追求正确性和完整性得到的教训。

### 接口简洁 vs 实现简洁

二者不可兼得，除非你写的是 Hello World。

Asyncio 的风格是有什么就提供什么，实现简单胜于接口简单。
浏览一遍 Asyncio 的文档，你会发现很很多难懂，莫名其妙的概念，
很多是直接暴露的底层 API，像 `add_reader`
就是直接对应底层 selector 的接口，实现起来很简单，用起来就没那么简单了。

Curio 的风格则是接口简单胜于实现简单，浏览它的源码会发现除了 Kernel 代码以外都
非常简单，但 Kernel 非常复杂，代码富于技巧性，也很难写对。

## 我的尝试

### [CuRequests](https://github.com/guyskk/curequests)

这是我最早做的一个异步IO库，与 Requests 接口一致，基于 Curio。  
现已不推荐使用。

### [Newio](https://github.com/guyskk/newio)

由于 Curio 缺乏生态，再加上 Kernel 实现过于复杂，难以排错和优化，
因此我自己实现了一个异步IO核心库，接口与 Curio 基本一致，并且兼容 Asyncio。

在 0.6 版本之前，Kernel 是完全由我自己实现的，我尽可能地将 Kernel 模块化，
简化 Kernel 的实现，然而自己功力还是不够，Kernel 还一些严重 Bug 没能解决。

在 0.6 版本，我基于 Asyncio 重新实现了 Newio，接口保持不变，而且只花了两天时间。

Newio 完全兼容 Asyncio，并且提供简洁的，一致的 API，大部分功能都已支持，
文档还未完善，推荐参考源码和 Curio 文档使用。

### [Newio-Requests](https://github.com/guyskk/newio-requests)

从 CuRequests 移植而来，与 Requests 接口一致，基于 Newio，完全兼容 Asyncio。  
推荐使用。

### [Weirb](https://github.com/guyskk/weirb)

一个解放生产力的异步IO Web框架，基于 Newio，完全兼容 Asyncio。  
文档还未完善，推荐参考源码使用。

### [蚁阅](http://rss.anyant.com/)

我正在做的一个RSS阅读器（个人作品），还非常不完善，目前应该可以登录:P

使用了 Weirb 框架和 Newio-Requests，数据库最初用的是 RethinkDB，现已迁移到 Postgres。

## 结束语

如果你对上述项目感兴趣，欢迎与我联系，邮箱：`guyskk#qq.com`。  
开源项目欢迎提 Issue 和 PR。  
