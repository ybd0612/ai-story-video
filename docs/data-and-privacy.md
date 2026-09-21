# 数据与隐私

> 本文档隶属 [项目总纲](../PROJECT_INDEX.md)，关键路径以总纲 SSOT 为准。

## 隐私目录

以下目录不进入 Git：

- `data/`：用户资料、偏好、知识、历史和反馈。**例外**：`data/memory/README.md` 与 `data/memory/style-preferences.json` 是 DSP 自身的可复用项目创作规则，随仓库提交；
- `templates/story/`：由 `migrate-layout.mjs mirror` 生成的本机兼容镜像，不提交（权威内容为 `templates/` 根模板）；
- `data/.migration/`：镜像一致性清单；
- `.claude/`：本地 Agent 规则和状态；
- `.neuralmemory/`：本地记忆数据；
- `.workbuddy/`：WorkBuddy 项目状态和记忆；
- `jobs/`：可能包含用户输入、提示词、媒体和中间结果；
- `outputs/`：最终视频等交付文件。

忽略规则的权威定义在 `.gitignore`；本文件若与 `.gitignore` 不一致，以 `.gitignore` 为准并立即修正本文件。

## 密钥

`AGNES_API_KEY` 只能通过环境变量提供，禁止写入故事 JSON、日志、文档、任务目录或 Git。

## Git 中允许的内容

Git 只保存可复用代码、模板、公开文档、示例配置和项目规则，不保存用户隐私、生成媒体、视频和本地工具状态。
