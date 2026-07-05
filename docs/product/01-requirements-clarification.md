# 需求澄清

本文档记录项目目标、目标用户、核心流程、数据对象、验收标准和未决问题。

## 一句话描述

构建一个全局 Codex 单对话多模型能力路由器：主对话继续使用用户偏好的模型，例如 `KMKAPI / gpt-5.5`；当需要生图、额外文本模型、代码模型、视觉模型或其他特殊能力时，Codex 通过本地 MCP 工具临时调用 `cc-switch` 中对应 provider，并把结果返回同一个对话。

## 目标用户

| 用户类型 | 场景 | 核心诉求 |
| --- | --- | --- |
| 主要用户 | 在 Codex 中进行开发、设计、写作和生图 | 不切换主模型，也能调用其他能力 |
| 未来用户 | 拥有多个 cc-switch provider，例如 `KMKAPI`、`KMKAPI-IMAGE`、其他后缀模型 | 按任务自动或手动选择合适 provider |

## 核心问题

1. 当前主对话模型可能不具备某些能力，例如生图。
2. 手动在 Codex、cc-switch、插件之间复制配置成本高，且容易泄露密钥。
3. 用户希望“同一个对话里”临时调用其他模型，而不是切换整个 Codex 主会话。
4. API Key 不能出现在聊天、仓库、页面或普通配置文件中。

## 核心功能

| 功能 | 用户价值 | 优先级 | MVP |
| --- | --- | --- | --- |
| MCP `call_model` | 在当前对话中临时调用其他文本/代码/视觉能力模型 | P0 | 是 |
| MCP `generate_image` | 生图时自动路由到图片能力 provider，例如 `KMKAPI-IMAGE` | P0 | 是 |
| cc-switch provider 读取 | 自动识别本机 provider、model、base URL、能力和密钥状态 | P0 | 是 |
| 一键同步 cc-switch | 不需要手动配置 provider | P0 | 是 |
| 本地能力路由配置页 | 可视化管理默认文本路由、默认图片路由和能力标签 | P0 | 是 |
| 密钥脱敏与运行时读取 | token 不落盘、不展示、不进入聊天 | P0 | 是 |
| 图片与元数据落盘 | 生成图片保存在本地并返回路径 | P1 | 是 |
| 更多能力类型 | 视觉、代码、搜索、视频等 | P2 | 后续增强 |

## 关键流程

```text
用户在 Codex 中提出任务
-> Codex 判断是否需要特殊能力
-> 调用 MCP 工具 call_model 或 generate_image
-> CapabilityRouter 按 capability/defaultRoutes 选择 route
-> 如果 route 来自 cc-switch，运行时读取对应 provider 的 token
-> 调用 OpenAI-compatible API
-> 文本结果直接返回；图片结果保存到本地并返回路径
-> 主对话继续使用原来的 Codex 模型
```

## 权限与安全

1. 项目配置只保存 `secretSource`、`secretEnvVar`、`ccswitchProviderId` 等引用，不保存真实 token。
2. `cc-switch` token 只在发起请求时读取到内存。
3. `GET /api/ccswitch/providers` 只返回脱敏字段，例如 `hasSecret`，不返回密钥。
4. 对话上下文默认只发送给文本能力 route；是否发送由 `allowConversationContext` 显式控制。
5. 上游错误返回必须脱敏，不能把 bearer token 打印出来。

## 主要数据对象

| 数据对象 | 关键字段 | 说明 |
| --- | --- | --- |
| RouterConfig | `activeRouteId`、`defaultRoutes`、`routes` | 当前能力路由配置 |
| CapabilityRoute | `id`、`name`、`capabilities`、`baseUrl`、`model`、`secretSource`、`ccswitchProviderId` | 单个能力路由 |
| CcswitchProvider | `id`、`name`、`model`、`baseUrl`、`capabilities`、`hasSecret` | 脱敏后的 cc-switch provider |
| CallModelRequest | `prompt`、`capability`、`routeId`、`conversationContext` | 通用模型调用请求 |
| GenerateImageRequest | `prompt`、`size`、`routeId`、`conversationContext` | 图片生成请求 |

## MVP 验收标准

1. 页面能读取并展示本机 cc-switch provider，且不显示 token。
2. 点击“从 cc-switch 同步”后，默认文本路由指向当前 `KMKAPI / gpt-5.5`，默认图片路由指向 `KMKAPI-IMAGE`。
3. `call_model` 能通过默认文本 route 调用 OpenAI-compatible Responses API。
4. `generate_image` 能通过默认图片 route 调用 Images API，并保存本地文件。
5. 旧的 mock 生图配置仍可工作。
6. `npm test`、`npm run build`、插件校验通过。

## 待确认问题

| 问题 | 影响范围 | 当前状态 | 结论 |
| --- | --- | --- | --- |
| `KMKAPI-IMAGE` 的真实图片模型名是否就是 cc-switch 中的 `gpt-5.4` | 真实生图请求 | 待真实调用验证 | 当前只同步配置，不主动扣费测试 |
| KMKAPI 是否需要 `/v1` 前缀 | 上游 API 兼容性 | 待真实调用验证 | 当前按 cc-switch 配置使用 `https://www.kamenking.top` |
| 是否需要更多自动能力推断规则 | 多 provider 管理 | 后续 | 先按名称后缀推断 |
