---
title: 不要copy代码 - python尾逗号导致的bug
---


在 python 中表示 tuple 很多种方式，下面是比较常用的两种

```python
()
(1,)         1,  # 导致bug的尾逗号
(1,2)        1,2
(1,2,...)    1,2,...
```

下面详述 bug 的产生过程

首先我想要构建一个 dict，用作参数

```python
params = {
    "a": 1,
    "b": 2,
    "c": 3,
}
do_something(**params)
```

然后发现需要根据条件 xxx 决定是否加上 c，于是从上面 copy 一下

```python
params = {
    "a": 1,
    "b": 2,
}
if xxx:
    "c": 3,
do_something(**params)
```

加上方括号，冒号改成等号

```python
params = {
    "a": 1,
    "b": 2,
}
if xxx:
    params["c"] = 3,
do_something(**params)
```

一个完美的 bug 就产生了，do_something 函数不一定会检查你的参数，只有运行到用到 c 参数的代码才会出问题，运气好会报个错告诉你参数类型不对，运气不好代码正常运行，最后结果就是不对劲。


**谨记：** 

> 不要copy代码！！


参考链接：  
[A Python gotcha: Stray comma at end of simple assignment](http://stackoverflow.com/questions/11621289/a-python-gotcha-stray-comma-at-end-of-simple-assignment)  
[Python: stray commas cause tuples?](https://bradmontgomery.net/blog/python-stray-commas-cause-tuples/)  
