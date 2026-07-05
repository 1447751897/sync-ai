# 项目文档入口

这是项目启动和中途新增需求时必须优先阅读的入口文档。

## 启动原则

1. 先澄清目标，再进入开发。
2. 先确认技术方向，再新增核心依赖。
3. 涉及界面时，先明确 UI 风格和交互边界。
4. 每次重要变更都要更新对应文档。

## 本项目目标

构建一个 Codex 原生生图路由器：Codex 主对话模型保持不变，生图需求通过本地 MCP 工具临时路由到配置好的图片 API，生成文件保存到本地并返回当前对话。

## 中途新增需求流程

当用户提出新需求、变更、修复或技术调整时：

1. 判断类型：新增功能、变更、修复、UX 优化、技术调整或部署调整。
2. 只在影响范围、业务规则、数据结构、权限、技术选型、部署或验收不清时提问。
3. 涉及技术选型时，先给出 2-3 个方案并等待确认，除非用户明确要求高自治模式。
4. 实现前或同时更新相关文档。
5. 完成后更新 `docs/development/03-feature-changelog.md`。
6. 暂停或切换对话前更新 `docs/development/10-current-status.md`。

## 常用命令

```text
zno-status 总结当前开发进度
zno-continue 继续上次开发
zno-feature 新增功能
zno-change 修改已有行为
zno-fix 修复问题
zno-tech 技术选型或架构调整
zno-deploy 部署或环境调整
zno-plan 没有头绪时推荐下一步
zno-goal 围绕一个目标自动推进
zno-goal --super 高自治推进并记录决策
```

## 接续时必读

```text
AI_DEVELOPMENT_RULES.md
docs/00_START_HERE.md
docs/development/10-current-status.md
docs/development/03-feature-changelog.md
docs/product/06-roadmap.md
docs/handoff/05-handoff-guide.md
```
