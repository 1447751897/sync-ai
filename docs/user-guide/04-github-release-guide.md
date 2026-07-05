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

- 本版本是本地插件 + 控制台 Beta。
- 不包含正式安装包。
- 不包含云端账号和计费。
- 适合 Codex + cc-switch 用户试用。

## 后续 Phase 2

Phase 2 建议做 Windows 桌面客户端：

1. Tauri 或 Electron 外壳。
2. 一键安装/更新插件。
3. 托盘常驻。
4. 自动启动本地服务。
5. 可视化日志和诊断。
6. GitHub Release 附带安装包。

