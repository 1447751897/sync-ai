# sync-ai 快速开始

## 你会得到什么

sync-ai 会在本机启动一个控制台，并给 Codex 暴露 MCP 工具。你可以在 Codex 的同一个对话中临时调用其他模型能力，例如：

- 用 `gpt-5.5` 保持主对话。
- 生图时临时调用图片 provider。
- 总结、改写、代码分析时临时调用另一个文本/代码 provider。

## 第一次使用

1. 启动客户端或本地控制台。

普通用户推荐直接双击 `sync-ai-0.1.0-x64.exe`。开发环境可以运行：

```powershell
npm run start:config
```

2. 打开页面。

```text
http://127.0.0.1:8756/
```

3. 点击“安装/更新 Codex 插件”。

sync-ai 会在本机创建一个本地 marketplace，并把插件安装到当前 Codex。安装完成后建议新开一个 Codex 对话。

4. 点击“同步 cc-switch”。

sync-ai 会读取本机 cc-switch 中的 Codex provider。页面只会显示 provider 名称、模型、base URL、能力类型和是否配置密钥，不会展示真实 token。

5. 查看“总览”。

重点确认：

- 默认文本 route 是否正确。
- 默认图片 route 是否正确。
- cc-switch 状态是否正常。
- 系统代理是否可用。

6. 打开“诊断”。

如果有 warning 或 error，先按页面提示处理。常见情况：

- 没有默认文本 route：在“能力路由”里选择一个 route，点击“设为文本默认”。
- 没有默认图片 route：选择图片 route，点击“设为图片默认”。
- 未检测到代理：如果你的 provider 需要代理，先打开系统代理。

## 在 Codex 中使用

sync-ai 提供的 MCP 工具包括：

- `call_model`
- `generate_image`
- `get_config`
- `get_config_page_url`

示例：

```text
用 sync-ai 的默认文本能力总结这段内容：...
```

```text
用 sync-ai 的默认图片能力生成一张 1024x1024 的极简测试图
```

如果你想指定 route，可以使用 route id：

```text
用 routeId ccswitch-kmkapi-xxx 调用文本能力完成总结
```

## 调用历史

调用成功或失败后，页面“调用历史”会记录：

- 调用类型
- routeId
- provider
- model
- 状态
- 错误摘要
- 图片输出路径

不会记录完整密钥。
