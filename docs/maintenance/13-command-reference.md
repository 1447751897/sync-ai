# 命令参考

本文档说明项目可使用的 zno 工作流命令、适用场景和常更新文档。

## Codex 与 Claude Code 写法

Codex 中直接输入 `zno-*`，不需要斜杠：

```text
zno-status 总结当前开发进度
zno-continue 继续上次开发
zno-feature 新增 provider 连通性检查
```

Claude Code 也可以使用兼容的斜杠写法，例如 `/zno-status`。

## 命令总览

| 命令 | 适用场景 | 主要作用 | 常更新文档 |
| --- | --- | --- | --- |
| `zno-evaluate` | 新项目想法评估 | 判断是否值得做 | 通常不改项目代码 |
| `zno-init` | 新项目开始 | 澄清需求并初始化文档 | 初始文档 |
| `zno-goal` | 围绕一个目标自动推进 | 拆解、实现、验证、更新文档 | 全部相关文档 |
| `zno-goal --super` | 高自治推进 | AI 自主决策并记录过程 | `development/14-decision-log.md` |
| `zno-super` | 高自治兼容别名 | 等价于 `zno-goal --super` | `development/14-decision-log.md` |
| `zno-feature` | 新增功能 | 澄清、实现、验证、记录 | `01`、`03`、`06`、`10`、`11` |
| `zno-change` | 修改已有行为 | 评估影响并实现变更 | `01`、`03`、`06`、`10` |
| `zno-fix` | 修复 bug | 定位、修复、验证 | `03`、`10` |
| `zno-tech` | 技术选型或架构调整 | 比较方案并记录决策 | `04`、`10`、`11` |
| `zno-deploy` | 部署、环境变量、发布、回滚 | 更新运行和交付说明 | `07`、`08`、`10` |
| `zno-review` | 代码审查 | 审查安全、性能、错误处理和规范 | `03` 视情况更新 |
| `zno-retro` | 阶段复盘 | 提炼经验和后续行动 | `16`、`10` |
| `zno-plan` | 不确定下一步 | 推荐方向和优先级 | `06`、`10` |
| `zno-status` | 暂停、切换对话、交接 | 更新当前状态快照 | `10` |
| `zno-continue` | 新对话继续开发 | 读取状态和文档后继续 | 视任务而定 |
| `zno-handoff` | 交接指南更新 | 更新接手路径和注意事项 | `05`、`10`、`11` |
| `zno-roadmap` | 阶段计划调整 | 更新路线图 | `06`、`10` |
| `zno-upgrade` | skill 或模板升级 | 补齐文档和规则 | `12`、`10` |

文档编号：

```text
01 = docs/product/01-requirements-clarification.md
03 = docs/development/03-feature-changelog.md
04 = docs/engineering/04-tech-decisions.md
05 = docs/handoff/05-handoff-guide.md
06 = docs/product/06-roadmap.md
07 = docs/operations/07-local-development.md
08 = docs/operations/08-deployment.md
10 = docs/development/10-current-status.md
11 = docs/engineering/11-project-structure.md
12 = docs/maintenance/12-upgrade-history.md
15 = docs/product/15-frontend-design.md
16 = docs/development/16-retrospective.md
```
