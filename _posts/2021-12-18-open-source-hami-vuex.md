---
title: "Hami-Vuex开源了，哈密瓜味的Vuex！"
---

Hami-Vuex 是一个 Vue 状态管理的库，基于 Vuex 实现，提供了更「香甜」的使用方式，所以叫做哈密瓜味的 Vuex！

### 主要特点：

- 基于 Vuex 构建，可与 Vuex 3 & 4 兼容和混合使用
- 兼容 Vue 2 和 Vue 3，低学习成本，无迁移压力
- 易于编写模块化的业务代码，Store 文件不再臃肿
- 完全的 TypeScript 支持，代码提示很友好
- 类似 Pinia 的用法（可能还更简单）
- 单元测试 Line Coverage: 100%


### 举个简单的例子，体验一下：

```javascript
const counterStore = hamiVuex.store({

    // 设置一个唯一名称，方便调试程序和显示错误信息
    $name: 'counter',

    // 定义状态
    $state: {
        count: 0,
    },

    // 定义一个 getter，和 Vue computed 类似
    get double() {
        return this.count * 2
    },

    // 定义一个函数，等价于 Vuex action
    increment() {
        // $patch 是内置的 Vuex mutation，用于更新状态
        this.$patch({
            count: this.count + 1
        })
    },
})

// 在 Vue 组件中使用
console.log(counterStore.count)
console.log(counterStore.increment())
console.log(counterStore.double)
```

### 开源地址：

GitHub：[https://github.com/guyskk/hami-vuex](https://github.com/guyskk/hami-vuex)

**详细文档及设计思路都在 GitHub 仓库中，欢迎品尝！**  
**好用的话求 Star 哇！**  
