# 项目文档索引

本文档是 `docs/` 的入口，用于说明每类文档的用途和接续方式。

## 推荐阅读顺序

1. `docs/development/10-current-status.md`
2. `docs/product/01-requirements-clarification.md`
3. `docs/product/06-roadmap.md`
4. `docs/engineering/04-tech-decisions.md`
5. `docs/handoff/05-handoff-guide.md`
6. `docs/operations/07-local-development.md`

## 文档分类

### 核心规则

| 文档 | 作用 |
| --- | --- |
| `AI_DEVELOPMENT_RULES.md` | 项目的长期 AI 开发总规则 |
| `00_START_HERE.md` | 项目启动和中途新增需求流程 |
| `engineering/02-development-principles.md` | 项目级开发原则 |

### 需求与计划

| 文档 | 作用 |
| --- | --- |
| `product/01-requirements-clarification.md` | 项目目标、用户、功能、流程和验收 |
| `product/06-roadmap.md` | 阶段路线图和里程碑 |
| `product/15-frontend-design.md` | UI 风格、布局、组件和交互原则 |
| `product/15-frontend-design-tokens.json` | 前端设计 token |

### 技术与结构

| 文档 | 作用 |
| --- | --- |
| `engineering/04-tech-decisions.md` | 技术选型、备选方案和取舍 |
| `engineering/11-project-structure.md` | 目录职责、模块边界和请求流 |

### 开发过程

| 文档 | 作用 |
| --- | --- |
| `development/03-feature-changelog.md` | 功能和变更记录 |
| `development/10-current-status.md` | 当前状态快照 |
| `development/14-decision-log.md` | 高自治或重要决策记录 |
| `development/16-retrospective.md` | 阶段复盘 |

### 运行与交付

| 文档 | 作用 |
| --- | --- |
| `operations/07-local-development.md` | 本地启动、调试和常用命令 |
| `operations/08-deployment.md` | 构建、插件交付、回滚和发布检查 |

### 维护与交接

| 文档 | 作用 |
| --- | --- |
| `handoff/05-handoff-guide.md` | 后续开发者或 AI 助手接手指南 |
| `maintenance/09-zno-project-start-prompt.md` | 新项目或新对话启动提示 |
| `maintenance/12-upgrade-history.md` | 文档模板和 skill 升级记录 |
| `maintenance/13-command-reference.md` | zno 命令参考 |

## 工作流

1. 新需求先判断影响范围。
2. 涉及产品、技术、部署、UI 或交接时，先更新对应文档。
3. 实现完成后更新 `development/03-feature-changelog.md`。
4. 切换对话或暂停前更新 `development/10-current-status.md`。
5. 不确定下一步时使用 `zno-plan`。
6. 想围绕目标自动推进时使用 `zno-goal`。
