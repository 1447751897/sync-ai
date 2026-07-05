# 功能变更记录

本文档记录开发过程中新增、变更、删除和修复的功能。每完成一个功能或重要改动后都要更新。

## 2026-07-06 - sync-ai Phase 2 Windows portable 客户端

类型：客户端化 / 打包发布

状态：已实现并完成本地验证

变更说明：

1. 新增 Electron 桌面客户端入口 `desktop/main.cjs`。
2. 客户端启动时会动态导入 `dist/http/server.js`，在进程内启动 sync-ai 本地控制台。
3. 默认使用 `8756` 端口；端口被占用时自动尝试后续端口。
4. 新增 npm 脚本：
   - `desktop:dev`
   - `desktop:dir`
   - `desktop:pack`
5. 新增 electron-builder 配置，支持 Windows x64 portable 构建。
6. 新增开发依赖 `electron` 和 `electron-builder`。
7. 更新 README 和用户安装/发布文档，加入客户端运行与打包说明。

验证记录：

1. `npm test` 通过：9 个测试文件，36 个测试。
2. `npm run build` 通过。
3. `npm run desktop:dir` 成功生成 `release/win-unpacked/sync-ai.exe`。
4. `release/win-unpacked/sync-ai.exe` 启动成功；当 8756 被占用时，自动监听 `127.0.0.1:8757`。
5. `npm run desktop:pack` 成功生成 `release/sync-ai-0.1.0-x64.exe`。
6. portable exe 启动成功，子进程成功监听本地控制台端口。

后续增强：

1. 自动安装/更新 Codex 插件。
2. 托盘常驻。
3. 自动更新。
4. 代码签名。
5. macOS/Linux 客户端。

## 2026-07-05 - sync-ai Phase 1.5 Beta 产品化

类型：产品化增强 / 页面重构 / 诊断与历史

状态：实现中，核心代码与文档已补齐，待最终浏览器验证和 GitHub 上传

变更说明：

1. 将产品品牌从 `codex-image-router` 升级为 `sync-ai`，更新 `package.json` 和 Codex 插件 manifest 展示文案。
2. 默认本地配置目录迁移为 `%LOCALAPPDATA%\SyncAI\config.json`。
3. 新增 `HistoryStore`，记录最近 100 条 MCP 调用摘要，包含文本/图片调用成功和失败状态。
4. `CapabilityRouter` 接入调用历史，成功和失败都会写入脱敏记录。
5. 新增 `collectDiagnostics` 诊断模块，检查配置、路由、默认能力、cc-switch provider 和系统代理。
6. HTTP API 新增：
   - `GET /api/diagnostics`
   - `GET /api/history`
   - `POST /api/history/clear`
   - `GET /api/docs/getting-started`
7. 本地配置页重写为 sync-ai 控制台，包含总览、首次使用引导、能力地图、路由管理、cc-switch provider、调用历史、诊断报告和使用指南。
8. 新增外部用户文档：
   - `README.md`
   - `docs/user-guide/01-getting-started.md`
   - `docs/user-guide/02-installation.md`
   - `docs/user-guide/03-troubleshooting.md`
   - `docs/user-guide/04-github-release-guide.md`

当前验证：

1. 已分别验证新增模块测试和构建通过。
2. 待最终执行全量 `npm test`、`npm run build`、插件校验和浏览器页面检查。

## 2026-07-05 - 修复 MCP 调用 KMKAPI 时未走 Windows 系统代理

类型：缺陷修复 / 网络兼容

状态：已实现并完成本地验证

问题现象：

1. 在 Codex 新对话中调用 `call_model` 或 `generate_image` 时，KMKAPI 路由返回 `fetch failed`。
2. DNS 和 443 端口连通，但 Node/curl 直连 `https://www.kamenking.top` 会在 TLS 握手阶段出现 `ECONNRESET`。
3. Windows 用户代理为 `127.0.0.1:7890`，PowerShell 的 `Invoke-WebRequest` 能正常返回 200。

根因：

1. Codex MCP 插件子进程中的 Node `fetch` 默认不会读取 Windows 当前用户系统代理。
2. 真实 KMKAPI 访问需要经过本机系统代理；直连会被远端重置连接。

变更说明：

1. 新增 `src/network/proxyFetch.ts`，默认优先读取 `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`，缺省时在 Windows 下读取当前用户 Internet Settings 代理配置。
2. `CapabilityRouter` 默认使用代理感知 fetch，因此 `call_model` 和 `generate_image` 会统一走同一套代理逻辑。
3. 使用 `undici` 的 `ProxyAgent` 执行代理请求，避免手写 HTTP CONNECT 隧道。
4. provider adapter 增强网络失败错误信息，返回 endpoint、错误类型和底层原因，例如 `ECONNRESET`，但不会输出密钥。

验证记录：

1. `npm test` 通过：7 个测试文件，23 个测试。
2. `npm run build` 通过。
3. 插件校验通过：`Plugin validation passed: D:\projects\codex-image-router`。
4. 本机无密钥连通性验证通过：代码自动读取 `http://127.0.0.1:7890`，访问 `https://www.kamenking.top` 返回 HTTP 200。
5. 使用无效 token 探测 `/responses`、`/v1/responses` 和 `/v1/images/generations` 均能到达后端并返回 HTTP 401，证明请求已到达 KMKAPI 服务端。

安全说明：

1. 未读取或输出 cc-switch 真实 token。
2. 未发起真实模型生成调用，避免未经确认产生扣费。

## 2026-07-05 - 升级为 Codex 单对话多模型能力路由器

类型：架构变更 / 新增功能

状态：已实现并完成本地验证

变更说明：

1. 将核心抽象从 `profiles` 生图档案升级为 `routes` 能力路由，支持 `text`、`image`、`vision`、`code`、`other` 能力标签。
2. 新增 `CapabilityRouter`，支持通用 `call_model` 和图片 `generate_image` 两类入口。
3. 新增 cc-switch 只读集成，自动读取 Codex provider 的脱敏信息，并在运行时按 provider id 读取 token。
4. 新增 `GET /api/ccswitch/providers` 和 `POST /api/config/sync-ccswitch`。
5. 配置页面改为“Codex 能力路由器”，支持查看 provider、同步 cc-switch、设置默认文本和默认图片路由。
6. MCP 新增 `call_model` 工具，保留 `generate_image` 作为图片能力快捷入口。
7. 插件展示文案更新为“Codex 能力路由器”。

验证记录：

1. `npm test` 通过：5 个测试文件，14 个测试。
2. `npm run build` 通过。
3. 插件校验通过：`Plugin validation passed: D:\projects\codex-image-router`。
4. 本机 cc-switch 脱敏读取成功：识别当前 `KMKAPI / gpt-5.5` 为文本能力，识别 `KMKAPI-IMAGE / gpt-5.4` 为图片能力。
5. 本地 API 同步成功：`defaultRoutes.text` 指向当前 KMKAPI，`defaultRoutes.image` 指向 KMKAPI-IMAGE。

安全说明：

1. API Key 未写入项目配置、文档或页面。
2. provider 列表只展示 `hasSecret`，不返回真实 token。
3. 未主动发起真实模型调用，避免未经确认产生扣费。

## 2026-07-05 - MVP 基础：Codex 生图路由器

类型：新增功能

状态：已实现并完成本地验证

变更说明：

1. 将项目工作区迁移到 `D:\projects\codex-image-router`。
2. 新增 Codex 插件清单 `.codex-plugin/plugin.json`。
3. 新增本地 `.mcp.json`，用于声明 stdio MCP 服务。
4. 建立 Node.js、TypeScript、Vitest 项目基础。
5. 实现配置 schema、配置读取保存、默认配置和校验。
6. 实现 `mock` 与 `openai-compatible` 两类提供方路由。
7. 实现本地图片文件与元数据写入。
8. 实现 MCP 工具：`generate_image`、`get_config`、`get_config_page_url`。
9. 实现轻量本地配置页面和 HTTP API。
10. 新增构建后复制静态页面的脚本。

验证记录：

1. `npm test` 通过：3 个测试文件，7 个测试。
2. `npm run build` 通过。
3. 插件校验脚本已通过。

后续注意：

1. 真实 KMKAPI 生图仍需要确认准确的 base URL 路径和图片模型名。
2. 当前环境中 `codex.exe` 运行 `codex plugin --help` 时返回 Windows `Access is denied`，所以还不能通过 CLI 完成插件安装。

## 2026-07-05 - 中文化配置页、工具描述和项目文档

类型：变更

状态：已实现并完成本地验证

变更说明：

1. 将本地配置页可见文本改为中文。
2. 将 MCP 工具标题、描述和用户可见错误信息改为中文。
3. 将插件清单中的展示名称、描述和默认提示改为中文。
4. 清理项目文档中的英文补丁和乱码模板，改为可读中文内容。
5. 保留工具名、脚本名、环境变量名、provider 枚举和配置字段，确保接口兼容。

影响范围：

1. 用户在 Codex 插件、MCP 工具和本地配置页中看到的文案。
2. 后续开发者或 AI 助手读取的项目文档。
3. 测试中与错误信息相关的断言。

验证方式：

```powershell
npm test
npm run build
python C:\Users\zhuzhenyu\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py D:\projects\codex-image-router
```

验证结果：

1. `npm test` 通过：3 个测试文件，8 个测试。
2. `npm run build` 通过。
3. 插件校验通过：`Plugin validation passed: D:\projects\codex-image-router`。
4. 本地配置服务已重启到最新构建，`http://127.0.0.1:8756/api/config` 返回中文默认档案名“本地模拟”。
