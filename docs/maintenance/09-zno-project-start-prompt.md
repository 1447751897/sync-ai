# AI 项目启动提示

新对话接手本项目时，可以使用：

```text
zno-continue 继续 D:\projects\codex-image-router 的 Codex 生图路由器项目。请先阅读 AI_DEVELOPMENT_RULES.md、docs/00_START_HERE.md、docs/development/10-current-status.md、docs/development/03-feature-changelog.md、docs/product/06-roadmap.md 和 docs/handoff/05-handoff-guide.md，再继续当前最安全的下一步。
```

新增需求时可以使用：

```text
zno-feature 【新增功能说明】
zno-change 【变更说明】
zno-fix 【问题说明】
zno-tech 【技术调整说明】
zno-deploy 【部署调整说明】
zno-status 总结当前开发进度
zno-plan 推荐下一步功能和路线
zno-goal 围绕一个目标自动推进
```

长期规则：

1. 项目根目录固定为 `D:\projects\codex-image-router`。
2. 不要在聊天、文档或提交中写入真实 API Key。
3. provider 密钥通过环境变量名引用。
4. 重大技术选型先比较方案，再记录到 `docs/engineering/04-tech-decisions.md`。
5. 暂停或切换对话前更新 `docs/development/10-current-status.md`。
