# sync-ai 故障排查

## 页面打不开

确认服务是否启动：

```powershell
npm run start:config
```

默认地址：

```text
http://127.0.0.1:8756/
```

如果端口被占用：

```powershell
$env:CODEX_IMAGE_ROUTER_PORT="8760"
npm run start:config
```

## Codex 看不到 MCP 工具

处理步骤：

1. 打开 sync-ai 控制台，点击“安装/更新 Codex 插件”。
2. 确认项目已构建。
3. 新开一个 Codex 对话。
4. 检查 `.mcp.json` 是否指向 `node ./dist/mcp/server.js`。

构建：

```powershell
npm run build
```

插件校验：

```powershell
python C:\Users\zhuzhenyu\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py D:\projects\codex-image-router
```

## 安装插件时报 `spawn EPERM`

Windows 上 `where codex` 有时会优先返回 `C:\Program Files\WindowsApps\...` 下的 App Execution Alias，后端进程直接启动它可能被系统拒绝。

处理：

1. 升级到新版 sync-ai，安装器会优先扫描 `%LOCALAPPDATA%\OpenAI\Codex\bin\*\codex.exe`。
2. 如果仍然失败，手动指定稳定路径：

```powershell
$env:SYNC_AI_CODEX_EXE="$env:LOCALAPPDATA\OpenAI\Codex\bin\<版本>\codex.exe"
npm run start:config
```

3. 重新打开控制台，点击“安装/更新 Codex 插件”。

## `fetch failed`

常见原因：

1. 系统代理未开启。
2. provider 域名直连被重置。
3. base URL 不正确。
4. provider 服务暂时不可用。

本机代理验证：

```powershell
curl.exe --proxy http://127.0.0.1:7890 -I https://www.kamenking.top
```

如果这个命令返回 200，而 sync-ai 仍失败：

1. 打开控制台“诊断”。
2. 复制诊断报告。
3. 检查系统代理是否被识别。

## `401 Unauthorized`

表示请求已经到达 provider，但密钥无效或未配置。

处理：

1. 如果使用 cc-switch，确认对应 provider 有 `OPENAI_API_KEY`。
2. 如果使用环境变量，确认变量名和 route 中配置一致。
3. 不要把真实 key 粘贴到聊天或仓库。

## `404 Not Found`

表示接口路径可能不匹配。

处理：

1. 检查 base URL。
2. 确认 provider 是否支持 Responses API。
3. 检查 `/responses` 或 `/v1/responses` 是否被 provider 支持。

## 默认文本或图片 route 缺失

打开“能力路由”：

1. 选择一个文本 route。
2. 点击“设为文本默认”。
3. 选择一个图片 route。
4. 点击“设为图片默认”。

## 历史记录不显示

历史记录只会在通过 MCP 工具发生调用后写入。直接在配置页同步 cc-switch 不会产生调用历史。

本地历史文件默认位置：

```text
%LOCALAPPDATA%\SyncAI\history.json
```
