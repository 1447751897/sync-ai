# 技术决策

本文档记录开发过程中涉及的技术选型、原因、备选方案、取舍和后续影响。

## TD-001：Codex 原生生图路由架构

日期：2026-07-05

状态：已采纳

用户确认：

```text
确认人：用户
确认时间：2026-07-05
确认来源：先做 B，后面可以做 C。
```

背景：

用户希望图片生成发生在 Codex 对话里。主对话模型可以继续使用 GPT-5.5 或其他没有原生生图能力的模型；当需要生图时，把请求委托给可配置的图片 API，生成结果仍回到同一个 Codex 对话。

决策：

MVP 采用 B：Codex Plugin + MCP Server + 本地配置页。C，即 Electron/Tauri 桌面端，作为 Codex 原生链路稳定后的演进方向。

选定架构：

```text
Codex 对话
  -> MCP 工具调用，例如 generate_image
  -> 本地 image-router 服务
  -> 当前启用的 provider/profile
  -> OpenAI 兼容图片 API，例如 KMKAPI-IMAGE
  -> 本地图片输出目录
  -> 返回文件路径和元数据给 Codex
  -> Codex 在同一个对话展示图片
```

备选方案：

| 方案 | 目的 | 优点 | 缺点 | MVP 结论 |
| --- | --- | --- | --- | --- |
| A. 本地 Web App + 本地 API + 调用脚本 | 最快做出独立 MVP | 易调试，provider 请求好验证 | 像外部助手，不够 Codex 原生 | 作为 fallback 保留 |
| B. Codex Plugin + MCP Server + 本地配置页 | Codex 原生工作流 | Codex 可直接调用工具，生成文件能回到当前对话，配置仍在本地 | 比纯 Web App 多一些组件 | 选为 MVP |
| C. Electron/Tauri 桌面端 | 完整本地控制台 | 长期产品化体验更好，可管理后台服务和托盘 | MVP 过重，构建和更新复杂 | Phase 3 再评估 |

安全与隐私约束：

1. API Key 不能粘贴到聊天或写入仓库文件。
2. provider 密钥通过环境变量名或未来的本地安全存储引用。
3. 配置页只编辑 provider 名称、base URL、模型名、输出目录和上下文开关等非密钥字段。
4. 对话上下文发送给第三方 provider 必须显式可配置。
5. 生成图片本地保存，元数据记录 provider、model、prompt 摘要、输出路径和时间。

性能影响：

1. Codex 只负责编排，生图按需触发。
2. 本地配置页保持轻量，不引入重型前端框架。
3. 图片输出写入磁盘，MCP 响应返回路径，不内联大 payload。
4. 后续真实 provider 应补充超时、重试和清晰错误报告。

维护成本：

中等。MCP 工具、本地 HTTP 服务、provider adapter 和配置存储需要保持清晰边界。收益是未来新增图片 provider 时无需改变主对话模型。

风险与回退：

1. Codex 插件或 MCP 行为可能变化，因此 provider router 必须独立可测。
2. 如果插件集成受阻，可临时回退到 A，用本地脚本调用同一套 image-router。
3. 如果桌面端成为刚需，可在不替换 provider 层的前提下演进到 C。

未决实现问题：

1. KMKAPI-IMAGE 准确 base URL，例如 `/v1` 还是 provider 特定路径。
2. KMKAPI-IMAGE 图片模型名和实际响应结构。
3. Codex 插件安装/刷新流程需要等待 `codex.exe` 权限问题解决后验证。

## 当前技术栈

| 分类 | 选型 | 用途 |
| --- | --- | --- |
| 运行时 | Node.js | MCP 服务、本地 HTTP 服务、构建脚本 |
| 语言 | TypeScript | 主要业务代码 |
| 校验 | Zod | 配置 schema 与输入输出约束 |
| 测试 | Vitest | 配置、HTTP 服务、provider 路由测试 |
| 前端 | 原生 HTML/CSS/JS | MVP 本地配置页 |
| 插件 | Codex plugin + MCP | 在 Codex 中暴露生图工具 |

## TD-003：Phase 2 桌面客户端选择 Electron

日期：2026-07-06

状态：已采纳

背景：

sync-ai 的完整目标是让外部用户可以下载客户端并直接使用，而不是要求用户手动运行 `npm run start:config`。Phase 1.5 已经完成本地插件、控制台、诊断、历史和文档，但仍不是普通用户意义上的桌面客户端。

候选方案：

| 方案 | 优点 | 缺点 | 当前结论 |
| --- | --- | --- | --- |
| Tauri | 体积小，长期适合本地工具 | 当前机器未安装 Rust/Cargo；会增加用户构建门槛 | 暂缓到后续评估 |
| Electron | 当前 Node 环境可直接构建；生态成熟；electron-builder 可产出 Windows portable | 体积较大 | Phase 2 采用 |
| 纯 Node CLI 启动器 | 实现最快 | 仍不像“客户端”，用户体验不足 | 只作为内部 fallback |

决策：

Phase 2 使用 Electron 作为桌面客户端外壳。Electron 主进程负责启动 sync-ai 本地 HTTP 控制台服务，并在桌面窗口中加载 `http://127.0.0.1:<port>/`。本地服务和 MCP 代码继续复用现有 Node/TypeScript 架构，避免重写核心逻辑。

技术要点：

1. 新增 Electron main 入口。
2. Electron 启动时动态导入 `dist/http/server.js`，在进程内启动本地控制台服务。
3. 优先使用 `8756` 端口，端口占用时自动尝试后续端口。
4. 使用 electron-builder 生成 Windows portable 构建。
5. 不把真实 token 打包或写入客户端；密钥仍来自用户本机 cc-switch 或环境变量。

验证要求：

1. `npm test` 通过。
2. `npm run build` 通过。
3. `npm run desktop:dev` 能打开桌面窗口。
4. `npm run desktop:pack` 能生成 Windows portable 包。
5. 文档说明普通用户如何下载、启动和排查问题。

## TD-002：升级为单对话多模型能力路由

日期：2026-07-05

状态：已采纳

用户确认：

```text
确认人：用户
确认时间：2026-07-05
确认来源：用户确认“可以”，并明确不应只有生图，而是在同一个 Codex 对话中按任务调用其他 provider。
```

背景：

用户的 cc-switch 中已经存在 `KMKAPI` 和 `KMKAPI-IMAGE`。用户希望主对话继续使用 `KMKAPI / gpt-5.5`，但当任务需要生图或其他能力时，插件临时调用相应 provider。这个需求不应局限在图片生成。

决策：

将项目抽象升级为 `CapabilityRouter`：

```text
Codex 对话
  -> MCP call_model / generate_image
  -> CapabilityRouter
  -> defaultRoutes + routes
  -> cc-switch secret resolver 或 env secret resolver
  -> OpenAI-compatible API
```

关键取舍：

1. 不切换 Codex 主模型，避免影响当前会话状态。
2. 通过 MCP 工具做一次性外部能力调用。
3. 使用 Python 标准库 `sqlite3` 读取 cc-switch 数据库，避免新增原生 Node SQLite 依赖。
4. 配置只保存脱敏引用，不保存 token。

影响：

1. 新增 `call_model`，保留 `generate_image`。
2. 配置从 `profiles` 演进为 `routes`，旧字段保留兼容。
3. 页面从“生图配置”改为“能力路由管理”。

风险与回滚：

1. 如果 cc-switch 数据库结构变化，`src/ccswitch/pythonReader.ts` 需要适配。
2. 如果某些 provider 不兼容 Responses 或 Images API，需要新增 provider adapter。
3. 回滚方式：继续使用 mock route 或旧 `profiles` 迁移出的 image route。
