---
title: "Claude Code 监督器：让 AI 主动把事情做好"
---

前段时间做了一次 AI 大模型技术分享，顺手 Vibe coding 了一个小工具 [claude-code-config-switcher](https://github.com/guyskk/claude-code-supervisor)，用来在不同 Claude Code 提供商之间快速切换。

后来我给这个工具新增了一个 Supervisor 模式，用了一段时间之后感觉非常有价值，于是把项目改名为 [claude-code-supervisor](https://github.com/guyskk/claude-code-supervisor)。

## 什么是 Supervisor 模式

用过 Claude Code 的朋友应该有这个体验：有时候 AI 声称"完成了"，但实际上还有一堆问题没解决。比如测试没跑、代码质量很差、功能不完整等等。这时候就需要你再跟 AI 说几轮，让它继续完善。

Supervisor 模式就是为了解决这个问题。它的原理很简单：

1. AI Agent 完成任务后，Supervisor（另一个 AI 实例）会自动审查工作质量
2. 如果没完成或质量不达标，Supervisor 给出反馈，让 Agent 继续
3. 重复这个过程，直到 Supervisor 确认工作真正完成

这个机制利用了 Claude Code 的 Stop Hook，当 Agent 停止时自动触发审查。Supervisor 会 Fork 完整的会话上下文，评估实际的工作质量，而不是简单检测一些关键词或信号。

## 为什么这很有用

使用 Claude Code 最大的痛点，就是 AI 经常会把问题抛回给用户：

- "是否需要运行测试？"
- "应该如何处理这个错误？"
- "你希望我用什么方式实现？"

这些问题本该是 AI 自己解决的。有了 Supervisor 模式，Supervisor 会检查：
- Agent 是否在等待用户确认？
- 是否做了应该自己做的事？
- 代码质量是否达标？
- 用户需求是否全部满足？

如果发现问题，Supervisor 会给出具体反馈让 Agent 继续。比如："你声称完成了，但没有测试，请添加测试。"

## 一个真实的例子

最近我用 Supervisor 模式做了一个实验（使用GLM 4.7模型），只给 AI 一个很简单的提示词：

```
用 JS 写一个在浏览器玩的双人坦克对战生存游戏，我和 AI 在有砖墙和钢墙的迷宫战场中驾驶坦克利用掩体进行战术射击对决，游戏要完整、精美、超高质量，AI 要有超强的战术水平。
```

结果让我很惊讶。在 Supervisor 的监督下，AI 完成了一个功能完整的坦克大战游戏：

- 精美的画面和流畅的动画
- 智能的 AI 对手，会利用掩体、预判玩家位置
- 迷宫地图生成，砖墙可破坏、钢墙不可破坏
- 游戏控制（键盘 WASD + 方向键）
- 完整的游戏循环（开始、对局、结束、重开）

游戏地址：[https://blog.guyskk.com/shows/tankbattle/](https://blog.guyskk.com/shows/tankbattle/)

最关键的是，整个过程我只需要给出初始需求，剩下的全部由 AI 在 Supervisor 监督下自动完成。没有中间轮次，没有反复沟通，一次性交付高质量成果。

## 与 Ralph 的区别

可能有朋友知道 [ralph-claude-code](https://github.com/anthropics/ralph-claude-code) 这个项目，它也能实现类似的监督功能。两者的主要区别在于：

| 方面 | Ralph | ccc |
|------|-------|-----|
| 检测方式 | AI 输出结构化状态 + 规则解析 | Supervisor AI 直接审查 |
| 评估方式 | 基于信号和规则 | Fork 会话上下文评估实际质量 |
| 灵活性 | 需要更新规则代码 | 更新 Prompt 即可 |

ccc 采用的是 AI-First 的设计理念。规则检测的局限性在于需要预定义所有情况，难以覆盖边缘场景。而 AI 审查能理解上下文，处理边缘情况，随着模型能力提升自动改进。

## 项目地址

claude-code-supervisor 已经开源，欢迎体验：[https://github.com/guyskk/claude-code-supervisor](https://github.com/guyskk/claude-code-supervisor)

主要功能：

1. **Supervisor 模式**：自动任务审查，确保高质量可交付成果（新增核心功能）
2. **提供商切换**：一条命令在 Kimi、GLM、MiniMax 等提供商之间切换（原有功能）

## 最后

通过「RSS阅读器」或者关注公众号「自宅创业」可以订阅博客更新，也可以在 [关于我](/about) 页面找到我的联系方式，欢迎交流！
