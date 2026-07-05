# sync-ai Phase 1.5 产品化设计规格

## 目标

把当前 `codex-image-router` 升级并品牌化为 `sync-ai`：一个可给其他用户下载安装、配置和试用的 Codex 单对话多模型能力路由插件。Phase 1.5 的目标不是完整 SaaS，而是先交付一个“本地优先 Beta 客户端体验”：用户能打开本地页面，完成配置、自检、同步、测试、查看历史和阅读使用指南。

## 用户范围

本阶段覆盖四类用户：

1. **高级用户 A**：已使用 Codex + cc-switch，希望快速同步 provider。
2. **普通 Codex 用户 B**：会使用 Codex，但不想手动编辑配置。
3. **非技术客户 C**：希望下载安装后按引导完成设置。
4. **商业化用户 D**：未来可能使用账号授权、云端模型网关和团队配置；Phase 1.5 只为这些能力预留入口，不实现真实计费与云端账号。

## 产品定位

`sync-ai` 是本地运行的 AI 能力中枢：

```text
Codex 对话
  -> sync-ai MCP 插件工具
  -> 本地能力路由服务
  -> cc-switch / 环境变量 / 手动 provider
  -> OpenAI-compatible API
  -> 结果回到同一 Codex 对话
```

核心价值：

1. 主对话模型不变。
2. 特殊任务按需调用其他模型能力。
3. 密钥不进入聊天、不展示在页面、不写入普通配置。
4. 本地页面让用户理解当前状态、默认路由、错误原因和下一步操作。

## Phase 1.5 范围

### 必须完成

1. **品牌化**
   - 项目、页面、插件展示名改为 `sync-ai`。
   - 保留内部兼容，不破坏已有配置字段和 MCP 工具名。

2. **Dashboard 首页**
   - 展示插件状态、本地服务状态、cc-switch 状态、系统代理状态。
   - 展示默认文本路由、默认图片路由、路由数量、最近调用数量。
   - 提供“同步 cc-switch”“运行健康检查”“复制诊断报告”“打开使用指南”等快捷操作。

3. **首次使用引导**
   - 以步骤形式展示：检测环境、同步 cc-switch、选择默认能力、测试连接、进入 Codex 使用。
   - 根据诊断结果显示每步是否完成。

4. **Provider / 路由管理**
   - 展示 routes 列表、能力标签、模型名、密钥来源。
   - 支持保存路由、创建路由、设为默认文本/图片路由。
   - 显示 cc-switch provider 列表，且只展示脱敏字段。

5. **健康检查与诊断**
   - 提供 `/api/diagnostics`。
   - 检查配置是否有效、路由数量、默认能力是否配置、cc-switch provider 是否可读、Windows 系统代理是否可读。
   - 不主动发起真实模型生成请求，避免未经确认扣费。
   - 诊断报告可复制，内容不能包含 token。

6. **调用历史基础能力**
   - 新增本地调用历史文件，记录 `call_model` 和 `generate_image` 的成功/失败摘要。
   - 记录字段：时间、能力、routeId、provider、model、状态、错误摘要、输出路径。
   - 页面展示最近历史。

7. **图片资产入口**
   - 页面能展示最近图片输出路径和元数据路径。
   - Phase 1.5 不实现缩略图网格和高级管理，但保留“打开输出目录/复制路径”的信息结构。

8. **文档**
   - 新增 README。
   - 新增 `docs/user-guide/01-getting-started.md`。
   - 新增 `docs/user-guide/02-installation.md`。
   - 新增 `docs/user-guide/03-troubleshooting.md`。
   - 新增 `docs/user-guide/04-github-release-guide.md`。

9. **验证**
   - `npm test` 通过。
   - `npm run build` 通过。
   - 插件校验通过。
   - 浏览器打开 `http://127.0.0.1:8756/` 页面无明显布局错误。

### 暂不完成

1. 真正的 Tauri / Electron 安装包。
2. 云端账号、计费、团队版、API 网关。
3. 自动安装 Codex App。
4. 自动上传 GitHub Release 二进制安装包。
5. 真实扣费模型调用自动测试。

这些能力属于 Phase 2 / Phase 3。

## 页面信息架构

单页本地控制台，左侧导航 + 右侧内容：

```text
sync-ai
├─ 总览
│  ├─ 系统状态卡片
│  ├─ 能力地图
│  ├─ 首次使用引导
│  └─ 快捷操作
├─ 能力路由
│  ├─ route 列表
│  └─ route 编辑表单
├─ cc-switch
│  ├─ provider 列表
│  └─ 同步按钮
├─ 调用历史
│  ├─ 最近文本调用
│  └─ 最近图片输出
├─ 诊断
│  ├─ 健康检查结果
│  └─ 诊断报告
└─ 使用指南
   ├─ 安装步骤
   ├─ 在 Codex 中怎么用
   └─ 常见问题
```

## 视觉方向

设计关键词：

- 本地安全感
- 多模型中枢
- 开发者控制台
- 有质感但不花哨
- 适合商业工具 Beta

配色：

```text
背景：#070A0F
面板：#101720
浮层：#151F2B
主文字：#F4F7FA
弱文字：#8B96A8
主色：#72F2C9
辅助色：#8B7CFF
警告：#FFB86B
错误：#FF6B6B
边线：rgba(255,255,255,0.1)
```

签名元素：**能力流光轨道**。页面顶部用轻量渐变线和节点表达“Codex -> sync-ai -> provider”的路由流动，不做复杂动画，避免影响本地工具性能。

字体：

- 系统无衬线：Inter / Segoe UI / PingFang SC / Microsoft YaHei
- 代码与诊断：ui-monospace / Consolas

## 后端 API 设计

新增或调整 API：

```text
GET  /api/config
PUT  /api/config
GET  /api/ccswitch/providers
POST /api/config/sync-ccswitch
GET  /api/diagnostics
GET  /api/history
POST /api/history/clear
GET  /api/docs/getting-started
```

### `/api/diagnostics`

返回：

```json
{
  "app": {
    "name": "sync-ai",
    "version": "0.1.0",
    "configPath": "...",
    "port": 8756
  },
  "checks": [
    {
      "id": "config",
      "label": "配置文件",
      "status": "ok",
      "message": "配置可读取"
    }
  ],
  "summary": {
    "ok": 4,
    "warning": 1,
    "error": 0
  }
}
```

### `/api/history`

返回最近 100 条调用历史，不返回 prompt 全文，只返回摘要。

## 调用历史设计

本地文件：

```text
%LOCALAPPDATA%\SyncAI\history.json
```

每条记录：

```json
{
  "id": "2026-07-05T12-00-00-000Z-model-call",
  "type": "text",
  "routeId": "ccswitch-kmkapi",
  "provider": "openai-compatible",
  "model": "gpt-5.5",
  "status": "success",
  "summary": "调用成功",
  "imagePath": "",
  "metadataPath": "",
  "createdAt": "2026-07-05T12:00:00.000Z"
}
```

错误记录必须脱敏。

## 技术方案

1. 继续使用 Node.js + TypeScript + MCP SDK + 原生 HTML/CSS/JS。
2. 暂不引入 React/Vite，避免 Phase 1.5 重构过大。
3. 前端仍为 `src/http/static/index.html`，但重写为更完整的控制台。
4. 新增小型服务模块：
   - `src/history/historyStore.ts`
   - `src/diagnostics/diagnostics.ts`
5. `CapabilityRouter` 在真实工具调用后写入历史。
6. `ConfigStore` 保留兼容，但默认目录后续迁移为 `SyncAI`。

## 验收清单

1. 页面打开后品牌显示为 `sync-ai`。
2. 页面能看到 Dashboard、能力路由、cc-switch、历史、诊断、使用指南。
3. 点击“同步 cc-switch”后仍能写入默认文本/图片 route。
4. 诊断页能显示系统代理、cc-switch、默认路由状态。
5. mock 调用或测试调用后能写入历史。
6. 文档能指导新用户安装、启动、同步、在 Codex 中使用。
7. 插件 manifest 名称、展示名、描述、默认提示均更新为 `sync-ai`。
8. 所有测试、构建、插件校验通过。

