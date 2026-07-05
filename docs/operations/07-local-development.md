# 本地开发

本文档记录本地开发环境、启动命令、调试方式和常见问题。

## 项目目录

```powershell
Set-Location D:\projects\codex-image-router
```

后续改动都应在这个目录进行。

## 环境要求

| 工具 | 用途 | 说明 |
| --- | --- | --- |
| Node.js | 运行 TypeScript、MCP 服务和本地配置页 | 使用当前本机可用版本即可 |
| npm | 安装依赖、运行脚本 | 随 Node.js 提供 |
| Python | 读取 cc-switch SQLite 数据库、运行插件校验脚本 | 使用本机已安装 Python |

本项目 MVP 不需要数据库、Docker 或云服务。

## 安装依赖

```powershell
npm install
```

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm test` | 运行 Vitest 测试 |
| `npm run build` | TypeScript 编译并复制静态配置页到 `dist/` |
| `npm run dev:config` | 开发模式启动本地配置页 |
| `npm run start:config` | 使用构建产物启动本地配置页 |
| `npm run mcp:dev` | 开发模式启动 MCP 服务 |
| `npm run mcp` | 使用构建产物启动 MCP 服务 |

## 本地配置页

启动：

```powershell
npm run dev:config
```

打开：

```text
http://127.0.0.1:8756
```

如需更换端口：

```powershell
$env:CODEX_IMAGE_ROUTER_PORT = "8760"
npm run dev:config
```

## 环境变量

示例：

```powershell
$env:CODEX_IMAGE_ROUTER_PORT = "8756"
$env:CODEX_IMAGE_ROUTER_CONFIG = "D:\projects\codex-image-router\.local\config.json"
$env:KMKAPI_IMAGE_API_KEY = "<仅在本机设置，不要粘贴到聊天或提交>"
```

说明：

1. `CODEX_IMAGE_ROUTER_PORT` 控制本地配置页端口，默认 `8756`。
2. `CODEX_IMAGE_ROUTER_CONFIG` 控制配置文件路径，未设置时使用本机默认应用数据目录。
3. `KMKAPI_IMAGE_API_KEY` 是示例真实提供方密钥变量名，配置页只保存这个变量名，不保存密钥值。

## 网络代理

插件调用远程 provider 时会使用代理感知 fetch：

1. 优先读取当前进程中的 `HTTPS_PROXY`、`HTTP_PROXY`、`ALL_PROXY` 和 `NO_PROXY`。
2. 如果这些环境变量不存在，且运行在 Windows，会读取当前用户系统代理：

```text
HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings
```

当前本机验证场景中，Windows 用户代理为：

```text
127.0.0.1:7890
```

如果 KMKAPI 调用返回 `fetch failed`，先确认本机代理客户端正在运行，并确认系统代理仍指向可用端口。可以使用以下命令做无密钥连通性验证：

```powershell
curl.exe --proxy http://127.0.0.1:7890 -I https://www.kamenking.top
```

## MCP 使用

开发模式：

```powershell
npm run mcp:dev
```

## cc-switch 集成

默认读取：

```text
C:\Users\<当前用户>\.cc-switch\settings.json
C:\Users\<当前用户>\.cc-switch\cc-switch.db
```

可选覆盖：

```powershell
$env:CCSWITCH_HOME="C:\path\to\.cc-switch"
$env:CODEX_IMAGE_ROUTER_PYTHON="python"
```

本地 API：

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8756/api/ccswitch/providers
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8756/api/config/sync-ccswitch
```

这些接口只返回脱敏信息，不返回真实 token。

构建后运行：

```powershell
npm run build
npm run mcp
```

`.mcp.json` 当前指向：

```text
node ./dist/mcp/server.js
```

因此安装或刷新插件前，应先运行 `npm run build`。

## 调试说明

1. 配置读取问题：检查 `CODEX_IMAGE_ROUTER_CONFIG` 指向的 JSON 文件。
2. 页面没有更新：先运行 `npm run build`，确认 `dist/http/static/index.html` 已更新。
3. 真实提供方请求失败：先用 `mock` 档案确认本地链路，再检查 base URL、模型名和密钥环境变量。
4. 密钥相关问题：不要把真实 key 写入配置文件，只设置环境变量。

## 插件校验

```powershell
python C:\Users\zhuzhenyu\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py D:\projects\codex-image-router
```
