---
title: 同构的JSON-Schema
---


> “程序写出来是给人看的，附带能在机器上运行。”
> <div style="text-align:right">《计算机程序的结构与解释》卷首语</div>

同构的JSON-Schema(Isomorph-JSON-Schema)是用来描述JSON数据的格式，这种格式最大的特点就是Schema与实际JSON数据的结构完全相同，并且语法简洁，从Schema可以直观的看出实际数据的结构。

本文讲述同构的JSON-Schema格式和语法的形成过程。同构的JSON-Schema语法可以直接到[Github](https://github.com/guyskk/validater/blob/master/Isomorph-JSON-Schema.md)上查看。


## JSON-Schema

[JSON-Schema](http://json-schema.org)是一个互联网标准草案，用于描述JSON数据。
JSON Schema was an Internet Draft, most recently version 4, which expired on August 4, 2013.

但是它有一个很大的缺点：复杂。

先来看官网上的例子：http://json-schema.org/example1.html

这个是实际数据：

    {
        "id": 1,
        "name": "A green door",
        "price": 12.50,
        "tags": ["home", "green"]
    }

这个是对应的Schema:

    {
        "$schema": "http://json-schema.org/draft-04/schema#",
        "title": "Product",
        "description": "A product from Acme's catalog",
        "type": "object",
        "properties": {
            "id": {
                "description": "The unique identifier for a product",
                "type": "integer"
            },
            "name": {
                "description": "Name of the product",
                "type": "string"
            },
            "price": {
                "type": "number",
                "minimum": 0,
                "exclusiveMinimum": true
            },
            "tags": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "minItems": 1,
                "uniqueItems": true
            }
        },
        "required": ["id", "name", "price"]
    }

可以看到Schema比实际数据复杂的多，而且Schema的结构和实际数据的结构并不完全相同。在描述嵌套的JSON数据时，JSON-Schema会更复杂，编写和阅读很困难。

**所以，用JSON-Schema作为文档来描述API接口并不合适。**


## 同构JSON-Schema的语法

[JSON](http://json.org/json-zh.html)有3种结构：映射，序列，标量。

[数据类型和Json格式-阮一峰](http://www.ruanyifeng.com/blog/2009/05/data_types_and_json.html) 从结构上看，所有的数据（data）最终都可以分解成三种类型：

> 第一种类型是标量（scalar），也就是一个单独的字符串（string）或数字（numbers），比如"北京"这个单独的词。

> 第二种类型是序列（sequence），也就是若干个相关的数据按照一定顺序并列在一起，又叫做数组（array）或列表（List），比如"北京，上海"。

> 第三种类型是映射（mapping），也就是一个名/值对（Name/value），即数据有一个名称，还有一个与之相对应的值，这又称作散列（hash）或字典（dictionary），比如"首都：北京"。

如果用一种通用的方式同时描述3种结构，这种方式只有**函数**。

但大多数情况下不需要完整定义一个函数，因为这些函数都是类似的，只要用一个更高阶的函数生成校验函数。

    # 高阶函数
    def generate_validater(*args, **kwargs):
        def validater(value):
            # raise Exception if value not valid
            return value
        return validater
    
    # 整数校验函数伪代码
    def int_validater(min, max, optional=False):
        def validater(value):
            if value is None:
                if optional:
                    return value
                else:
                    raise Invalid
            else:
                if value<min:
                    raise Invalid
                elif value>max:
                    raise Invalid
                else:
                    return value
        return validater

那么如何在JSON里面调用高阶函数？用一个字符串表示：

    "validater(arg1,arg2)&key1&key2=value"

这种格式类似于URL里面的QueryString，可以取名为**ValidaterString**，其中：

- arg1, arg2...value都是有效JSON值，即true/false是小写的，空值为null，字符串要加双引号。
- 如果validater是dict或list，可以省略，因为可以从JSON结构看出是dict还是list。
- 如果arg1, arg2...都是默认值，则括号可以省略。
- 如果key对应的value为true，只需写&key，不需要写&key=true。

因为Schema和JSON数据是同构的，所以这3种结构都需要是自己描述自己(**自描述**)，即：

映射结构用特殊的key描述自身，其余key描述字典里的内容：

    {
        "$self": "ValidaterString",
        "key": "value"
    }

序列结构用第一个元素描述自身，第二个元素描述列表里的内容：

    ["ValidaterString", Item]

序列结构也可以省略第一个元素，即只描述列表里的内容，不描述自身。

    [Item]

标量结构用字符串描述自身：

    "ValidaterString"

下面来用一下新语法

还是刚才那个实际数据：

    {
        "id": 1,
        "name": "A green door",
        "price": 12.50,
        "tags": ["home", "green"]
    }

同构的JSON-Schema：

    {
        "$self":"&desc=\"A product from Acme's catalog\""
        "id": "int&desc=\"The unique identifier for a product\"",
        "name": "str&desc=\"Name of the product\"",
        "price": "float&min=0&exmin&desc=\"价格\"",
        "tags": ["&minlen=1&unique", "str&desc=\"标签\""]
    }

可以看到比原来的简洁了不少，主要不足是&desc的值是字符串且比较长，再次改进一下。

在映射结构中，可以在key中描述value，value的位置写关于这个value介绍，即**前置描述**：

    {
        "$self": "A product from Acme's catalog",
        "id？int": "The unique identifier for a product",
        "name?str": "Name of the product",
        "price?float&min=0&exmin": "价格",
        "tags": ["&minlen=1&unique", "str&desc=\"标签\""]
    }

这里用？分隔key和ValidaterString，$self和标量都是前置描述。
注意tags是序列结构，为了避免歧义（后面说明）只能用自描述。


**引用**

不同的Schema可能含有相同的部分，假设有一个公共的Schema，其他Schema需要引用它，可以使用引用语法。

直接引用：

    "@shared"

    ["&unique", @shared"]

    {
        "key@shared": "desc of key"
    }

    {
        "$self@shared": "desc of this dict"
    }

在映射结构中可以添加新内容：

    {
        "$self@shared": "desc",
        "addition_key": ...
    }


**前置描述(pre-described)和自描述(self-described)**

前面提到序列结构只能用自描述，否则会有歧义，映射结构也只能用自描述。
因为如果序列结构和映射结构如果可以用前置描述，那就可能写出同时用了前置描述和自描述的Schema，会造成歧义，如果规定前置描述和自描述的优先级，虽然能避免歧义，但使语法复杂了。所以规定序列结构和映射结构只能用自描述。

如果考虑所有的情况，只有 $self, key-标量, key-引用 这三个地方用前置描述(为了使Schema的写法统一，规定只能用前置描述)，其他地方都是自描述。

即：

    "int&default=0"  # 自描述

    ["&minlen=1", "int&default=0"]  # 自描述

    {  # 自描述
        "$self?&optional": "desc",  # 前置描述
        "key?int&default=0": "desc",  # 前置描述
        "key": ["&minlen=1", "int&default=0"],  # 自描述
        "key": {  # 自描述
            "$self?&optional": "desc"
        }
    }

    "@shared"  # 自描述

    ["&minlen=1", "@shared"]  # 自描述

    {  # 自描述
        "$self@shared": "desc",  # 前置描述
        "key@shared": "desc",  # 前置描述
        "key": {  # 自描述
            "$self@shared": "desc"
        }
    }


### Validater

[Validater](https://github.com/guyskk/validater)是一个使用同构JSON-Schema的校验器。

Validater项目在2015年9月份就开始启动了，这个库的目的就是为了简化API的编写，实现自动校验输入参数，序列化任意类型的对象，校验输出。但是断断续续经过近一年时间的改进，一直没有确定规范的Schema格式（JSON-Schema太复杂很早就被我否定了），也总被算法实现难住，可以查看较早的commit有很多晦涩的算法。

有段时间(6月份)我尝试借助[ijson](https://github.com/isagalaev/ijson)这个库实现一个流式的校验器，这样能解决[`request.json` deprecation discussion](https://github.com/pallets/flask/issues/1421)中的问题，这个算法我写了很久，用的是状态机算法，但是写出的算法非常复杂，性能也不好(比标准库中的json.loads慢了一个数量级)。正打算把部分耗时的代码用C实现实现，但一测试发现需要频繁的在C中回调Python中的函数，这个回调是有性能损失的，对比以下C带来的性能提升和回调的性能损失，最后结果是性能基本没有提升。

最后我打消了实现流式的校验器的想法，并想到了用函数的思维描述JSON数据，而且实现算法的过程非常轻松，只用了4天就把这个库完成了，包括制定Schema格式规范，实现算法，以及达到97%的测试覆盖率。从0.10.0版本开始使用同构JSON-Schema，实现算法是彻底的高阶函数。性能也不错，校验的时间大约是用标准库中json.loads解析相同的JSON字符串的2.5倍。
    
此外，同构JSON-Schema是完全用JSON格式来描述JSON数据，这不像现有的绝大多数校验数据的库。这意味着这种Schema是跨语言，跨平台的，只要把Validater算法移植到Javascript，就能实现前后端同步校验。Validater算法大量用到高阶函数，理论上能很容易用其他动态语言和函数式语言实现，但是用静态语言实现难度会很大。
