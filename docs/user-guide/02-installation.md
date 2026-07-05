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

本机开发环境可通过本地 marketplace 安装。示例：

```powershell
& "C:\Users\zhuzhenyu\AppData\Local\OpenAI\Codex\bin\38dff8711e296435\codex.exe" plugin add "sync-ai@zno-local" --json
```

如果用户机器没有本地 marketplace，需要先配置 marketplace 或使用未来的打包安装器。

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
2. 点击“运行诊断”。
3. 确认配置、路由、cc-switch、代理状态。
4. 新开一个 Codex 对话。
5. 查看是否能调用 sync-ai MCP 工具。

## 升级

开发环境升级流程：

```powershell
npm run build
python C:\Users\zhuzhenyu\.codex\skills\.system\plugin-creator\scripts\update_plugin_cachebuster.py D:\projects\codex-image-router
& "C:\Users\zhuzhenyu\AppData\Local\OpenAI\Codex\bin\38dff8711e296435\codex.exe" plugin add "sync-ai@zno-local" --json
```

升级后建议新开 Codex 对话，因为已有对话通常不会热加载新的 MCP 插件。
