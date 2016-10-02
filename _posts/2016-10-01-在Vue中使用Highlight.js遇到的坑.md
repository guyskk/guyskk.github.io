---
title: 在Vue中使用Highlight.js遇到的坑
---

在实现 [flask-restaction](https://github.com/guyskk/flask-restaction) 的自动生成API文档功能时，用到
https://highlightjs.org/ 实现代码高亮。

首先按照文档用的是这个方法：

    <script>hljs.initHighlightingOnLoad();</script>

结果是只要切换了路由，代码就没有语法高亮了，因为hljs只在页面加载时进行语法着色。

Google之后找到另一个方法 [Vue 中使用 highlight.js](http://www.ahonn.me/2016/07/13/getting-highlightjs-to-work-with-vue.js/)
通过自定义Vue指令实现：

    Vue.directive('highlightjs', function() {
        let blocks = this.el.querySelectorAll('pre code');
        Array.prototype.forEach.call(blocks, Hljs.highlightBlock);
    })

过了几天，发现有个Bug，切换路由后，有些代码高亮的部分内容不会随着数据改变。
最后发现是highlightjs会改变DOM结构，导致Vue无法呈现数据。

解决方法如下，也是自定义Vue指令:

    directives: {
        highlight: function(el, binding) {
            if (binding.value) {
                let value = null
                if (typeof(binding.value) === "string") {
                    value = binding.value
                } else {
                    value = JSON.stringify(binding.value, null, 4)
                }
                el.innerHTML = hljs.highlight("json", value, true).value
            }
        }
    }

HTML中用法如下:

    <pre v-highlight="value">Show This If No Value</pre>
