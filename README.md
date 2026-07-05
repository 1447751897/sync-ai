# sync-ai

sync-ai 是一个面向 Codex 的本地多模型能力路由插件与可视化控制台。它让 Codex 在同一个对话中保持主模型不变，同时按任务临时调用其他 AI 能力，例如文本、图片、视觉、代码或其他 OpenAI-compatible provider。

## 适合谁

- 已经使用 Codex + cc-switch 的高级用户。
- 希望在一个 Codex 对话中调用多个模型能力的普通用户。
- 想用本地页面完成配置、诊断和同步的非技术用户。
- 未来计划做商业化模型网关、团队配置或客户端分发的开发者。

## 当前能力

- Windows 桌面客户端：
  - Electron portable 客户端。
  - 启动后自动开启本地 sync-ai 控制台。
  - 默认端口 `8756`，被占用时自动切换后续端口。
  - 可在页面中一键安装/更新 Codex 插件。
- Codex MCP 工具：
  - `call_model`：调用文本/代码/视觉/其他能力路由。
  - `generate_image`：调用图片能力路由并把图片保存到本地。
  - `get_config`：读取脱敏配置。
  - `get_config_page_url`：返回本地控制台地址。
- 本地控制台：`http://127.0.0.1:8756/`
- cc-switch 只读集成：自动读取 provider、模型、base URL、能力标签和密钥状态。
- 系统代理识别：Windows 下可读取当前用户系统代理。
- 调用历史：记录最近 100 条成功/失败摘要。
- 诊断报告：检查配置、默认路由、cc-switch 和代理状态。
- 密钥保护：不在页面、文档、诊断报告或普通配置里展示真实 token。

## 快速开始

### 方式一：下载客户端

从 GitHub Release 下载：

```text
sync-ai-0.1.0-x64.exe
```

双击启动后，客户端会自动打开 sync-ai 控制台。

在控制台中点击“安装/更新 Codex 插件”，完成后新开一个 Codex 对话即可看到 sync-ai MCP 工具。

### 方式二：开发环境运行

```powershell
Set-Location D:\projects\codex-image-router
npm install
npm run build
npm run start:config
```

打开：

```text
http://127.0.0.1:8756/
```

在页面中：

1. 点击“安装/更新 Codex 插件”。
2. 点击“同步 cc-switch”。
3. 查看默认文本 route 和默认图片 route。
4. 打开“诊断”确认系统状态。
5. 新开 Codex 对话，使用 sync-ai 的 MCP 工具。

## 常用命令

```powershell
npm test
npm run build
npm run dev:config
npm run start:config
npm run mcp
npm run desktop:dev
npm run desktop:pack
```

插件校验：

```powershell
python C:\Users\zhuzhenyu\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py D:\projects\codex-image-router
```

## 架构

```text
Codex 对话
  -> sync-ai MCP 工具
  -> 本地能力路由服务
  -> cc-switch / 环境变量 / OpenAI-compatible provider
  -> 文本结果或本地图片文件
  -> 回到同一个 Codex 对话
```

## 安全模型

- sync-ai 不保存 cc-switch 真实 token。
- 页面只展示 `hasSecret` 这类脱敏状态。
- token 只在调用 provider 时运行时读取。
- 历史记录只保存摘要，不保存完整 prompt。
- 错误和诊断报告会脱敏 Bearer token 与常见 API key 格式。

## 当前限制

- 当前 Windows 客户端是 portable 版本，不需要安装，但还没有自动更新和托盘常驻。
- 不包含账号、计费、团队权限和云端模型网关。
- 不自动发起真实扣费模型测试。
- macOS/Linux 客户端尚未打包。

## 文档

- `docs/user-guide/01-getting-started.md`
- `docs/user-guide/02-installation.md`
- `docs/user-guide/03-troubleshooting.md`
- `docs/user-guide/04-github-release-guide.md`
