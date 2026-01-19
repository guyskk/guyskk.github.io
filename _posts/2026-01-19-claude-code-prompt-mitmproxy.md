---
title: "分析 Claude Code 提示词的方法 - mitmproxy"
---

想了解 Claude Code 的提示词是怎么设计的，最直接的方式就是抓包分析。通过网络流量，可以看清它的 System Prompt、Messages、Tools 等核心信息。

## 安装 mitmproxy

官方文档: [https://www.mitmproxy.org](https://www.mitmproxy.org)

```bash
uv tool install mitmproxy
```

## 反向代理模式

大多数教程用正向代理，需要配置系统代理和 CA 证书。更简单的方式是用反向代理：

```bash
mitmweb --mode reverse:https://open.bigmodel.cn --listen-port 8125
```

这个命令会：
- 反向代理到智谱AI 的 API
- 在本地 8125 端口监听
- 打开 Web 界面查看流量

然后把 Claude Code 配置中的 API 地址改成代理地址，正常使用即可。

```
ANTHROPIC_BASE_URL: http://127.0.0.1:8125/api/anthropic
```

## 查看流量

在 mitmweb 界面中可以看到所有请求和响应：

- Request - 包含 system、messages、tools 等字段
- Response - LLM 的流式响应

点击具体的请求，就能看到完整的提示词内容了。

## 最后

通过「RSS阅读器」或者关注公众号「自宅创业」可以订阅博客更新，也可以在 [关于我](/about) 页面找到我的联系方式，欢迎交流！
