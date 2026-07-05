# 开发原则

本文档记录本项目特有的产品、技术、UI、API、数据、安全和质量规则。

## 产品原则

1. 核心体验必须是 Codex 原生：用户在当前对话中发出生图需求，结果也回到当前对话。
2. 生图需求不应要求用户永久切换主对话模型。
3. provider 切换必须显式、可见、可回退。
4. 生成图片必须本地保存，并返回足够元数据说明它如何生成。

## 技术原则

1. provider 适配必须隔离在稳定的 image-router 边界后面。
2. MCP 工具保持薄层：校验输入、调用 router、返回路径和元数据。
3. 本地配置页保持轻量，MVP 不引入重型前端框架。
4. 真实密钥只通过环境变量或未来安全本地存储读取。
5. 在真实 provider 调用前，始终保留 mock/dry-run 验证路径。
6. Electron/Tauri 桌面端是后续演进，不是 MVP 前置条件。

## 代码组织原则

| 目录 | 职责 |
| --- | --- |
| `src/config` | 配置 schema、默认值、读取保存 |
| `src/router` | 生图请求路由、provider 适配、输出写入 |
| `src/mcp` | Codex MCP 工具注册与 stdio 服务 |
| `src/http` | 本地配置页 HTTP API 与静态页面服务 |
| `tests` | Vitest 测试 |
| `docs` | zno 项目文档和交接材料 |

新增 provider 逻辑优先放在 `src/router/providers.ts` 或未来的 provider 子模块，不要写进 MCP 层或页面脚本。

## UI/交互原则

1. 以配置效率和可诊断性为主，不做营销页。
2. 表单字段必须清楚表达用途。
3. 对话上下文开关默认关闭。
4. 错误信息要可操作，但不得暴露真实密钥。
5. UI 风格以 `docs/product/15-frontend-design.md` 为准。

## API 原则

1. 本地 HTTP API 只绑定 `127.0.0.1`。
2. `GET /api/config` 返回当前配置，不返回真实密钥。
3. `PUT /api/config` 必须通过 schema 校验后保存。
4. provider 请求失败时保留状态码和响应摘要，便于排查。
5. MCP 输出以结构化字段为主，避免返回大体积图片正文。

## 数据原则

1. 配置文件只保存非密钥字段。
2. 图片文件和元数据保存到 profile 指定的 `outputDir`。
3. 元数据应包含 provider、profileId、model、prompt、createdAt 和本地路径。
4. 后续如增加历史记录，应支持按时间排序和输出目录追踪。

## 安全原则

1. API Key、bearer token、密码不得写入仓库、文档或日志。
2. 配置页和 MCP 响应不得显示真实密钥值。
3. 对话上下文发送给第三方 provider 必须由 profile 显式允许。
4. 本地服务默认只监听 loopback 地址。

## 质量原则

1. 代码变更后至少运行 `npm test` 和 `npm run build`。
2. 插件清单变更后运行 plugin validator。
3. UI 文案或页面变更后，手动打开配置页确认可读、可用。
4. 文档必须保持可接手，不保留乱码模板或过时英文补丁。
