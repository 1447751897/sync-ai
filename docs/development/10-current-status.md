# 当前状态

本文档用于跨对话、跨开发者和跨 AI 助手接续项目。每次阶段性暂停、切换对话、完成重要功能、遇到阻塞或准备交接时都要更新。

## 2026-07-05 快照

### 追加：2026-07-06 Phase 2 Windows portable 客户端

当前进展：

sync-ai 已从“插件 + 本地控制台 Beta”继续推进为“插件 + 本地控制台 + Windows portable 客户端”。普通用户可以从 GitHub Release 下载 `sync-ai-0.1.0-x64.exe`，双击后客户端会启动本地控制台并打开桌面窗口。

本轮已完成：

1. 新增 Electron 入口：`desktop/main.cjs`。
2. 新增桌面客户端脚本：
   - `npm run desktop:dev`
   - `npm run desktop:dir`
   - `npm run desktop:pack`
3. 新增 electron-builder 配置。
4. 生成 unpacked 客户端：`release/win-unpacked/sync-ai.exe`。
5. 生成 Windows portable 客户端：`release/sync-ai-0.1.0-x64.exe`。
6. 更新 README、安装指南和 GitHub 发布指南。
7. 记录技术决策：`docs/engineering/04-tech-decisions.md` 中 TD-003。

验证：

1. `npm test` 通过：9 个测试文件，36 个测试。
2. `npm run build` 通过。
3. `npm run desktop:dir` 通过。
4. `release/win-unpacked/sync-ai.exe` 启动成功，端口 fallback 生效。
5. `npm run desktop:pack` 通过。
6. `release/sync-ai-0.1.0-x64.exe` 启动成功，portable 子进程成功监听本地控制台端口。

剩余建议：

1. 上传 portable exe 到 GitHub Release。
2. 后续增加托盘、自动更新、代码签名和一键安装 Codex 插件。

### 追加：sync-ai Phase 1.5 Beta 产品化进行中

当前目标：

将当前插件产品化为 `sync-ai`，达到可给外部用户试用的 Beta 状态，并准备上传到 GitHub 仓库 `sync-ai`。

本轮已完成：

1. 新增产品设计规格：`docs/superpowers/specs/2026-07-05-sync-ai-phase-1-5-design.md`。
2. 新增实施计划：`docs/superpowers/plans/2026-07-05-sync-ai-phase-1-5.md`。
3. `package.json` 品牌改为 `sync-ai`。
4. `.codex-plugin/plugin.json` 展示品牌改为 `sync-ai`。
5. 默认配置路径迁移到 `%LOCALAPPDATA%\SyncAI\config.json`。
6. 新增 `src/history/historyStore.ts`，支持调用历史读写、清空、100 条上限和脱敏。
7. `CapabilityRouter` 接入成功/失败历史记录。
8. 新增 `src/diagnostics/diagnostics.ts`，提供配置、路由、cc-switch 和系统代理诊断。
9. HTTP API 新增 `/api/diagnostics`、`/api/history`、`/api/history/clear`、`/api/docs/getting-started`。
10. `src/http/static/index.html` 已重写为 sync-ai 控制台，包含总览、引导、能力地图、路由管理、cc-switch、历史、诊断和指南。
11. 新增 README 与用户指南文档。

已局部验证：

1. `tests/configStore.test.ts` 通过。
2. `tests/historyStore.test.ts` 通过。
3. `tests/diagnostics.test.ts` 通过。
4. `tests/httpServer.test.ts` 通过。
5. `tests/capabilityRouter.test.ts`、`tests/historyStore.test.ts`、`tests/imageRouter.test.ts` 组合通过。
6. 多次 `npm run build` 通过。

下一步：

1. 执行全量 `npm test`。
2. 执行 `npm run build`。
3. 执行插件校验。
4. 启动/刷新本地控制台，在浏览器检查页面。
5. 更新 marketplace 中的插件名或兼容别名，重新安装本地插件。
6. 准备 GitHub remote 并上传到 `sync-ai`。

当前阶段：

Phase 1 MVP 已从“Codex 生图路由器”升级为“Codex 单对话多模型能力路由器”。主对话模型保持不变，特殊任务通过 MCP 工具临时路由到 cc-switch 中的其他 provider。

已完成：

1. 项目位于 `D:\projects\codex-image-router`。
2. Node.js、TypeScript、Vitest、Codex plugin、MCP 服务、本地配置页已建立。
3. 新增 `CapabilityRouter`，支持 `call_model` 和 `generate_image`。
4. 新增能力路由配置：`activeRouteId`、`defaultRoutes`、`routes`。
5. 旧 `profiles` 配置保留迁移兼容。
6. 新增 cc-switch 只读集成：读取 provider 脱敏信息，运行时读取 token。
7. 新增 API：
   - `GET /api/ccswitch/providers`
   - `POST /api/config/sync-ccswitch`
8. 本地配置页面已改为中文“Codex 能力路由器”。
9. 已同步本机 cc-switch：
   - 默认文本 route：`ccswitch-kmkapi-1781180876592`，`KMKAPI / gpt-5.5`
   - 默认图片 route：`ccswitch-kmkapi-1783242642631`，`KMKAPI-IMAGE / gpt-5.4`
10. 配置服务已重启到最新构建，监听 `http://127.0.0.1:8756`，进程 ID 为 `51480`。

最新验证：

1. `npm test` 通过：5 个测试文件，14 个测试。
2. `npm run build` 通过。
3. 插件校验通过。
4. `GET /api/ccswitch/providers` 返回脱敏 provider 列表。
5. `POST /api/config/sync-ccswitch` 成功写入能力路由默认值。

待完成：

1. 在 Codex 插件实际刷新/安装后，确认 MCP 工具列表出现 `call_model` 和 `generate_image`。
2. 用户明确允许后，再发起真实 `KMKAPI-IMAGE` 或文本 provider 调用测试，避免未经确认扣费。
3. 后续可加入 provider 连通性 dry-run、最近调用记录和更细的能力规则。

安全注意：

1. 不要在聊天、文档或提交中粘贴真实 API Key。
2. cc-switch token 只允许运行时读取，不写入项目配置。
3. 真实调用前先确认是否会产生额度消耗。

接手时必读：

```text
AI_DEVELOPMENT_RULES.md
docs/00_START_HERE.md
docs/development/10-current-status.md
docs/development/03-feature-changelog.md
docs/product/06-roadmap.md
docs/handoff/05-handoff-guide.md
```
