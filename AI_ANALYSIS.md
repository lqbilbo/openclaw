# OpenClaw 项目目录结构分析

## 顶层目录

```
openclaw/
├── src/              # 核心后端（Node.js/TypeScript）
├── ui/               # 前端控制台 UI（Lit + Vite）
├── extensions/       # 可选频道插件（matrix、msteams、zalo 等）
├── apps/             # 移动端 & 桌面端（android、ios、macos）
├── skills/           # 内置 skill 定义（每个 skill 一个 SKILL.md）
├── packages/         # npm 包（clawdbot、moltbot）
├── vendor/           # 第三方 vendored 代码（a2ui）
├── scripts/          # 构建、发布、CI、运维脚本
├── test/             # 全局测试 setup、fixtures、helpers
├── docs/             # 文档（Mintlify）
└── dist/             # 构建产物（gitignored）
```

---

## src/ 核心模块

| 目录                                                                 | 职责                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------- |
| `gateway/`                                                           | WebSocket 控制平面，所有客户端连接入口                  |
| `agents/`                                                            | Pi agent 运行时、工具调度、子 agent 管理                |
| `cli/`                                                               | CLI 命令实现（`openclaw` 二进制）                       |
| `commands/`                                                          | 各子命令逻辑（onboard、doctor、update 等）              |
| `config/`                                                            | 配置 schema（Zod）、读写、迁移、校验                    |
| `channels/`                                                          | 频道抽象层、路由、分组                                  |
| `telegram/` `discord/` `slack/` `web/` `signal/` `imessage/` `line/` | 各频道具体实现                                          |
| `auto-reply/`                                                        | 通用消息处理、回复分发                                  |
| `routing/`                                                           | 消息路由逻辑                                            |
| `memory/`                                                            | 向量记忆、embedding、QMD 管理                           |
| `infra/`                                                             | 基础设施（exec、fs、网络、更新、pairing、Tailscale 等） |
| `security/`                                                          | 安全审计、DM 策略、沙箱                                 |
| `plugins/`                                                           | 插件加载、安装、manifest 注册                           |
| `plugin-sdk/`                                                        | 插件开发 SDK                                            |
| `browser/`                                                           | CDP 浏览器控制                                          |
| `cron/`                                                              | 定时任务                                                |
| `hooks/`                                                             | 生命周期 hooks                                          |
| `media/`                                                             | 媒体处理管道（图片/音频/视频）                          |
| `tui/`                                                               | 终端 TUI（交互式 CLI 界面）                             |
| `sessions/`                                                          | 会话管理                                                |
| `pairing/`                                                           | 设备配对                                                |
| `canvas-host/`                                                       | Canvas/A2UI 宿主                                        |
| `daemon/`                                                            | 后台守护进程管理                                        |
| `acp/`                                                               | ACP 协议桥接                                            |

---

## ui/ 前端结构

```
ui/src/
├── ui/           # 主 UI 组件（Lit Web Components）
│   ├── views/    # 各页面视图（chat、config、channels、sessions 等）
│   ├── chat/     # 聊天相关组件
│   ├── components/ # 通用组件
│   └── controllers/ # 状态控制器
├── i18n/         # 国际化（en、zh-CN、zh-TW、de、es 等）
└── styles/       # 全局样式
```

---

## extensions/ 插件频道

每个子目录是一个独立 npm 包，包含 `openclaw.plugin.json` + `src/`：

- `matrix`、`msteams`、`zalo`、`zalouser`、`feishu`、`tlon`、`irc`、`nostr`、`twitch`、`mattermost`、`nextcloud-talk`、`bluebubbles`、`googlechat`、`voice-call`、`memory-lancedb` 等

---

## apps/ 移动/桌面端

- `android/` — Android 节点 app（Kotlin/Gradle）
- `ios/` — iOS 节点 app（Swift）
- `macos/` — macOS 菜单栏 app（Swift/SwiftUI）
