# sync-ai GitHub 发布指南

## 仓库名称

目标仓库名：

```text
sync-ai
```

## 发布前检查

```powershell
npm test
npm run build
python C:\Users\zhuzhenyu\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py D:\projects\codex-image-router
```

确认：

1. 测试通过。
2. 构建通过。
3. 插件校验通过。
4. README 和 `docs/user-guide` 已更新。
5. 没有真实 API Key。

## GitHub 初始化

如果还没有远程仓库：

```powershell
git init
git add .
git commit -m "feat: release sync-ai beta"
git branch -M main
git remote add origin https://github.com/<your-account>/sync-ai.git
git push -u origin main
```

如果本地已经有 git 仓库：

```powershell
git remote -v
git remote set-url origin https://github.com/<your-account>/sync-ai.git
git add .
git commit -m "feat: release sync-ai beta"
git push -u origin main
```

## 不要上传的内容

确认 `.gitignore` 已排除：

```text
node_modules/
dist/
.local/
outputs/
*.log
```

## Release 建议

第一个 GitHub Release 可以命名：

```text
sync-ai v0.1.0-beta
```

说明：

- 本版本包含本地插件、控制台和 Windows portable 客户端。
- portable 文件名：`sync-ai-0.1.0-x64.exe`。
- 不包含云端账号和计费。
- 适合 Codex + cc-switch 用户试用。

创建 Release：

```powershell
gh release create v0.1.0-beta release\sync-ai-0.1.0-x64.exe --title "sync-ai v0.1.0-beta" --notes "Windows portable beta. Includes Codex MCP plugin, local control panel, diagnostics, history, cc-switch sync, and Electron desktop launcher."
```

## 后续 Phase 2

后续客户端增强：

1. 一键安装/更新 Codex 插件。
2. 托盘常驻。
3. 自动更新。
4. 签名证书。
5. macOS/Linux 包。
6. 云端账号和授权。
