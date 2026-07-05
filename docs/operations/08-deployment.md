# 部署与交付

本项目 MVP 是本地优先的 Codex 插件与 MCP 工具，不部署到公共服务器。

## 构建

```powershell
npm run build
```

构建产物：

```text
dist/
  config/
  http/
    server.js
    static/index.html
  mcp/
    server.js
  router/
```

## 插件交付方式

1. `.codex-plugin/plugin.json` 声明插件元数据。
2. `.mcp.json` 声明本地 stdio MCP 服务。
3. `.mcp.json` 指向 `node ./dist/mcp/server.js`，所以安装或刷新插件前必须先构建。
4. 当前还未通过 `codex` CLI 安装插件，因为本机 `codex.exe` 返回 `Access is denied`。

## 环境变量

生产或长期本机使用时建议设置：

```powershell
$env:CODEX_IMAGE_ROUTER_CONFIG = "D:\projects\codex-image-router\.local\config.json"
$env:CODEX_IMAGE_ROUTER_PORT = "8756"
$env:KMKAPI_IMAGE_API_KEY = "<仅本机保存>"
```

禁止将真实 API Key 写入仓库、文档或聊天记录。

## 发布前检查

1. `npm test` 通过。
2. `npm run build` 通过。
3. 插件校验脚本通过。
4. 配置页可以打开并读取 `/api/config`。
5. `mock` 提供方可以生成本地 PNG 与元数据。
6. 如果接入真实提供方，确认 base URL、模型名、密钥环境变量都已配置。

## 回滚

1. 真实提供方失败时，切回 `mock` 档案验证本地链路。
2. MCP 插件加载失败时，先单独运行 `npm run mcp` 排查服务启动问题。
3. Codex 插件安装受阻时，保留本地配置页和 provider router，等待 CLI 权限恢复后再安装。
4. 如需临时回退到纯本地脚本模式，可复用 `src/router` 里的提供方路由层，无需重写提供方适配。
