# sync-ai 安装指南

## 推荐安装方式：Windows portable 客户端

从 GitHub Release 下载：

```text
sync-ai-0.1.0-x64.exe
```

双击运行即可。客户端会：

1. 启动本地 sync-ai 控制台服务。
2. 打开桌面窗口。
3. 默认使用 `8756` 端口。
4. 如果 `8756` 已被占用，自动尝试 `8757`、`8758` 等后续端口。

当前 portable 版本不需要安装，也不会自动注册开机启动。

## 客户端内一键安装 Codex 插件

打开客户端后，在页面中点击“安装/更新 Codex 插件”。sync-ai 会自动完成：

1. 创建本地 marketplace：`%LOCALAPPDATA%\SyncAI\marketplace`
2. 将当前 sync-ai 插件链接到 marketplace。
3. 调用本机 Codex CLI 安装：`sync-ai@sync-ai-local`
4. 返回安装结果和插件缓存路径。

安装成功后，请新开一个 Codex 对话。已有对话通常不会热加载刚安装的 MCP 插件。

## 开发环境安装方式

## 环境要求

- Windows
- Node.js
- npm
- Codex App 或 Codex CLI
- 可选：cc-switch

## 安装依赖

```powershell
Set-Location D:\projects\codex-image-router
npm install
```

## 构建项目

```powershell
npm run build
```

## 启动控制台

```powershell
npm run start:config
```

默认地址：

```text
http://127.0.0.1:8756/
```

如果需要换端口：

```powershell
$env:CODEX_IMAGE_ROUTER_PORT="8760"
npm run start:config
```

## 安装 Codex 插件

开发环境也推荐直接打开控制台，点击“安装/更新 Codex 插件”。

如果需要手动排查，可指定本机 Codex CLI 运行：

```powershell
& "$env:LOCALAPPDATA\OpenAI\Codex\bin\<版本>\codex.exe" plugin marketplace add "$env:LOCALAPPDATA\SyncAI\marketplace" --json
& "$env:LOCALAPPDATA\OpenAI\Codex\bin\<版本>\codex.exe" plugin add "sync-ai@sync-ai-local" --json
```

如果页面提示找不到 Codex CLI，可以设置：

```powershell
$env:SYNC_AI_CODEX_EXE="$env:LOCALAPPDATA\OpenAI\Codex\bin\<版本>\codex.exe"
npm run start:config
```

## 开发环境运行桌面客户端

```powershell
npm run desktop:dev
```

## 构建 Windows portable 客户端

```powershell
npm run desktop:pack
```

输出文件：

```text
release\sync-ai-0.1.0-x64.exe
```

## 验证安装

1. 打开 sync-ai 控制台。
2. 点击“安装/更新 Codex 插件”。
3. 点击“运行诊断”。
4. 确认配置、路由、cc-switch、代理状态。
5. 新开一个 Codex 对话。
6. 查看是否能调用 sync-ai MCP 工具。

## 升级

开发环境升级流程：

```powershell
npm run build
python C:\Users\zhuzhenyu\.codex\skills\.system\plugin-creator\scripts\update_plugin_cachebuster.py D:\projects\codex-image-router
```

然后打开控制台点击“安装/更新 Codex 插件”。升级后建议新开 Codex 对话，因为已有对话通常不会热加载新的 MCP 插件。
