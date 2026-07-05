# 项目结构

本文档说明项目整体结构、目录职责、关键文件作用和模块边界。

## 目录总览

```text
D:\projects\codex-image-router
  .codex-plugin/
    plugin.json                  Codex 插件清单
  .mcp.json                      Codex MCP 服务声明
  src/
    config/
      schema.ts                  Zod 配置 schema 和 TypeScript 类型
      defaults.ts                安全默认 mock 档案
      configStore.ts             本地配置读取、保存和校验
    router/
      imageRouter.ts             provider 分发边界
      providers.ts               mock 与 OpenAI 兼容 provider 适配
      output.ts                  图片和元数据落盘
      types.ts                   router 请求与结果类型
    http/
      server.ts                  本地 HTTP API 与配置页服务
      static/index.html          轻量本地配置页
    mcp/
      server.ts                  暴露给 Codex 的 MCP 工具
  tests/
    configStore.test.ts          配置默认值、保存和校验测试
    imageRouter.test.ts          mock 与 OpenAI 兼容路由测试
    httpServer.test.ts           配置 API 测试
  scripts/
    copy-static.mjs              构建后复制静态页面到 dist
  docs/                          zno 项目文档和交接材料
  reference-mockups/             早期视觉参考输出
```

## 核心模块

| 模块 | 入口文件 | 职责 | 注意事项 |
| --- | --- | --- | --- |
| 配置 | `src/config/configStore.ts` | 加载、保存、校验路由配置 | 不保存真实密钥 |
| 路由 | `src/router/imageRouter.ts` | 根据 active/profile 分发 provider | 保持独立可测试 |
| provider | `src/router/providers.ts` | 适配 mock 与 OpenAI 兼容 API | 新 provider 不要写进 MCP 层 |
| 输出 | `src/router/output.ts` | 写图片和元数据 | 返回本地路径 |
| MCP | `src/mcp/server.ts` | 注册 Codex 工具 | 工具层保持薄 |
| HTTP | `src/http/server.ts` | 提供配置 API 和静态页 | 只监听 `127.0.0.1` |
| UI | `src/http/static/index.html` | 本地配置界面 | 轻量、无密钥显示 |

## 请求流

```text
Codex 对话
  -> generate_image MCP 工具
  -> ConfigStore 读取配置
  -> ImageRouter 选择 provider
  -> provider 调用 mock 或图片 API
  -> output 写入 PNG 和 JSON 元数据
  -> MCP 返回 imagePath / metadataPath / provider / model
```

配置页请求流：

```text
浏览器打开 http://127.0.0.1:8756
  -> GET /api/config 读取配置
  -> 编辑表单
  -> PUT /api/config 保存配置
  -> ConfigStore 校验并写入配置文件
```

## 新增文件放置规则

1. provider 适配：放在 `src/router`。
2. 配置 schema 或默认值：放在 `src/config`。
3. MCP 工具注册：放在 `src/mcp/server.ts`。
4. 本地 HTTP API：放在 `src/http/server.ts`。
5. 配置页 UI：当前放在 `src/http/static/index.html`；只有 UI 复杂度明显上升时才评估前端框架。
6. 测试：放在 `tests`，按模块命名。
7. 项目说明：放在 `docs` 对应分类目录。

## 不建议随意改动

| 路径 | 原因 |
| --- | --- |
| `.mcp.json` | Codex 插件加载 MCP 服务依赖它 |
| `.codex-plugin/plugin.json` | 插件校验严格，字段不兼容会导致插件不可用 |
| `src/config/schema.ts` | 配置兼容性和持久化依赖该 schema |
| `src/router/output.ts` | 影响生成文件命名和元数据结构 |

改动上述文件后必须运行测试、构建和必要的插件校验。
