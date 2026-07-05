# 路线图

本文档记录项目阶段、里程碑和每个阶段的验收标准。

## 当前方向

先做 B：Codex Plugin + MCP Server + 本地配置页。它最贴近“在 Codex 对话里临时调用生图 API，然后回到原模型继续工作”的目标。

后续再做 C：Electron/Tauri 桌面端。桌面端用于更完整的本地服务管理、配置中心、日志和托盘体验，但不作为 MVP 前置条件。

## Phase 0 - 需求与技术方向确认

状态：已完成

目标：

1. 确认项目是 Codex 原生工具，而不是独立生图网站。
2. 确认 MVP 选择 B，C 作为后续演进。
3. 明确密钥、安全和对话上下文边界。

验收：

1. 技术决策记录在 `docs/engineering/04-tech-decisions.md`。
2. 需求文档和路线图明确 B 为 MVP、C 为后续阶段。

## Phase 1 - MVP：Codex 原生生图路由

状态：进行中

目标：

1. Codex 能从当前对话调用本地 `generate_image`。
2. 本地服务能根据当前 profile 路由到 mock 或 OpenAI 兼容图片 API。
3. 生成图片保存到本地，并把路径和元数据返回给 Codex。

范围：

1. MCP 服务与生图工具。
2. 本地 image-router 路由层。
3. OpenAI 兼容 provider 档案配置。
4. 本地配置页。
5. 环境变量方式处理密钥。
6. mock provider 用于安全验证。

不包含：

1. 桌面端打包。
2. 云同步。
3. 多用户登录或权限系统。
4. 完整素材库、prompt 库或资产管理系统。

验收：

1. `npm test` 通过。
2. `npm run build` 通过。
3. 插件校验通过。
4. 配置页可打开并保存配置。
5. mock 生图能写入本地输出目录。

## Phase 2 - 稳定性与工作流增强

目标：

1. 增加 provider 连通性检查和 dry-run。
2. 增加最近输出记录，方便回看文件路径与生成参数。
3. 优化错误状态和重试逻辑。
4. 细化对话上下文开关，让用户明确控制是否发送上下文。

验收：

1. 配置缺失、密钥缺失、provider 失败时都有清晰错误信息。
2. 用户可以在配置页验证 provider 是否可用。
3. 生成历史可追踪。

## Phase 3 - 桌面端演进

目标：

1. 比较 Electron 与 Tauri，选择适合本地工具的桌面方案。
2. 将配置 UI、本地服务管理、日志、provider profile 管理打包进桌面外壳。
3. 支持更自然的后台常驻和启动管理。

验收：

1. 技术选型写入 `docs/engineering/04-tech-decisions.md`。
2. 桌面端能启动/停止本地服务并打开配置页。
3. 不破坏已有 MCP 与 provider 路由层。
