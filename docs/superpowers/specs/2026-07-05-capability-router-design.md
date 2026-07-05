# Codex 单对话多模型能力路由设计

## 背景

用户希望 Codex 主对话继续使用当前主模型，例如 `KMKAPI / gpt-5.5`，但在同一个对话中按任务临时调用其他 provider。`KMKAPI-IMAGE` 只是其中一个例子，后续也可能出现用于长文本、视觉、代码、搜索或其他能力的 provider。

## 目标

把项目从“生图路由器”升级为“能力路由器”。Codex 不切换主会话模型；当需要某个特殊能力时，由 MCP 工具发起独立请求，并把结果返回到当前对话。

## 范围

- 读取本机 `cc-switch` 的 Codex provider 列表。
- 根据 provider 名称和配置推断能力，例如 `KMKAPI-IMAGE` 默认归类为图片能力。
- 保存脱敏后的能力配置，不把真实 API Key 写入项目配置、文档或页面。
- 新增通用文本模型调用工具 `call_model`。
- 保留 `generate_image`，但让它成为图片能力路由的快捷入口。
- 配置页面从“生图档案”改为“模型能力路由管理”。

## 非目标

- 不修改 Codex 当前主会话模型。
- 不把 `cc-switch` 中的 token 展示给用户。
- 不实现完整桌面端外壳。
- 不一次性支持所有非 OpenAI 协议，只先支持当前 cc-switch Codex provider 暴露出的 OpenAI-compatible Responses 和 Images 形态。

## 架构

```text
Codex 对话
  -> MCP 工具 call_model / generate_image
  -> CapabilityRouter
  -> RouterConfig.routes
  -> cc-switch secret resolver 或 env secret resolver
  -> OpenAI-compatible API
  -> 返回文本结果或本地图片路径
```

配置分为两层：

- `profiles`：保留旧生图配置用于迁移兼容。
- `routes`：新的能力路由配置，每个 route 描述一个 provider、能力集合、模型、API 基础地址和密钥来源。

## 数据模型

`CapabilityRoute` 包含：

- `id`
- `name`
- `provider`
- `capabilities`: `text`、`image`、`vision`、`code`、`other`
- `baseUrl`
- `model`
- `secretSource`: `env` 或 `cc-switch`
- `secretEnvVar`
- `ccswitchProviderId`
- `outputDir`
- `allowConversationContext`

`RouterConfig` 新增：

- `activeRouteId`
- `defaultRoutes`: 按能力指定默认 route，例如 `{ text, image }`
- `routes`

## 路由规则

- 文本调用默认使用 `defaultRoutes.text`，缺失时回退到 `activeRouteId`。
- 图片生成默认使用 `defaultRoutes.image`，缺失时回退到带 `image` 能力的第一条 route，再回退到 `activeRouteId`。
- `KMKAPI-IMAGE` provider 默认推断为 `image`。
- 非 `IMAGE` provider 默认推断为 `text`，如果名称包含 `CODE` 可附加 `code`，包含 `VISION` 可附加 `vision`。

## cc-switch 集成

读取位置：

- `C:\Users\<user>\.cc-switch\settings.json`
- `C:\Users\<user>\.cc-switch\cc-switch.db`

读取方式：

- Node 通过本机 Python 标准库 `sqlite3` 以只读模式读取数据库。
- API 只返回脱敏字段。
- 真实 token 只在调用 provider 时从 `settings_config.auth.OPENAI_API_KEY` 读取到内存。

## 错误处理

- 找不到 cc-switch 目录：返回清晰错误。
- 找不到 provider：返回 provider id。
- provider 缺少 token：返回“缺少 cc-switch 鉴权”或“缺少环境变量”，不打印 token。
- 上游请求失败：返回 HTTP 状态和脱敏 body。

## 验证

- 单元测试覆盖配置迁移、能力推断、cc-switch 脱敏读取。
- provider 测试覆盖文本调用和图片调用。
- HTTP 测试覆盖 cc-switch provider 列表接口和同步接口。
- 构建和插件校验必须通过。
