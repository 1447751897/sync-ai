# 交接指南

本文档用于帮助后续开发者、AI 助手或团队成员快速接手项目。

## 项目根目录

```text
D:\projects\codex-image-router
```

不要继续在旧的 Documents 路径中开发。

## 项目是什么

这是一个 Codex 单对话多模型能力路由器。Codex 主对话模型保持不变；当需要文本、生图、代码、视觉或其他特殊能力时，MCP 工具会按能力路由调用本地配置或 cc-switch 中的 provider。

当前已支持：

1. `call_model`：调用默认文本能力或指定 route。
2. `generate_image`：调用默认图片能力并保存本地图片。
3. 一键读取和同步 cc-switch Codex provider。
4. 本地中文配置页面：`http://127.0.0.1:8756`。

## 快速启动

```powershell
Set-Location D:\projects\codex-image-router
npm install
npm test
npm run build
npm run dev:config
```

配置页：

```text
http://127.0.0.1:8756
```

MCP 开发模式：

```powershell
npm run mcp:dev
```

## 重要文件

| 文件 | 作用 |
| --- | --- |
| `.codex-plugin/plugin.json` | Codex 插件清单 |
| `.mcp.json` | MCP 服务声明 |
| `src/mcp/server.ts` | MCP 工具入口 |
| `src/router/capabilityRouter.ts` | 能力路由选择与调度 |
| `src/router/providers.ts` | OpenAI-compatible / mock provider 适配 |
| `src/ccswitch/` | cc-switch 脱敏读取与运行时密钥读取 |
| `src/config/schema.ts` | 配置类型、迁移和校验 |
| `src/http/server.ts` | 本地配置 API |
| `src/http/static/index.html` | 本地配置页面 |

## 安全注意

1. 不要提交真实 API Key。
2. `cc-switch` token 只在运行时读取，不写入 config。
3. `/api/ccswitch/providers` 只能返回脱敏信息。
4. 上游错误必须脱敏，不得输出 bearer token。
5. 真实 provider 调用可能扣费，除非用户明确要求，否则只做脱敏读取和 mock/测试验证。

## 当前本机 cc-switch 识别结果

1. 当前 Codex provider：`KMKAPI / gpt-5.5`，能力 `text`。
2. 图片 provider：`KMKAPI-IMAGE / gpt-5.4`，能力 `image`。
3. 默认文本路由：`ccswitch-kmkapi-1781180876592`。
4. 默认图片路由：`ccswitch-kmkapi-1783242642631`。

## 常用验证

```powershell
npm test
npm run build
python C:\Users\zhuzhenyu\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py D:\projects\codex-image-router
Invoke-RestMethod -Uri http://127.0.0.1:8756/api/ccswitch/providers
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8756/api/config/sync-ccswitch
```

## 接手建议

1. 先读 `docs/development/10-current-status.md`。
2. 再读 `docs/product/01-requirements-clarification.md` 和 `docs/engineering/04-tech-decisions.md`。
3. 如要改 UI，读 `docs/product/15-frontend-design.md`。
4. 如要真实测试 provider，先确认用户允许扣费。
