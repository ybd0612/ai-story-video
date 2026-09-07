# 项目架构

> 本文档隶属 [项目总纲](../PROJECT_INDEX.md)，关键路径以总纲 SSOT 为准。

## 分层

### 代码层

`app/create-video/` 是唯一固定代码路径。它不保存用户故事、历史媒体或最终视频，只包含可复用的 Remotion 组件、生成脚本和配置。

### 数据层

`data/` 是项目运行时数据目录。其中 `data/memory/` 保存 DSP 自身可复用的创作规则，是项目记忆 SSOT；`data/context/`、`data/knowledge/`、`data/feedback/` 和 `data/analytics/` 保存用户上下文、知识、反馈和历史，默认不提交。Agent 每次创作前先读取项目记忆，再按任务读取其他资料；用户通过 Agent 提出的修改意见也写回对应目录。`.workbuddy/` 仅属于开发工具，不参与创作记忆。

### 任务层

每次生成创建唯一 `jobs/<job-id>/`，包含：

- `input/`：本次输入和审核文件；
- `work/`：配图、TTS、校验和准备阶段的 JSON；
- `media/`：本次任务的图片和音频；
- `output/`：本次任务的最终视频；
- `job.json`：任务元信息。

### 交付层

`outputs/<job-id>/` 保存最终交付副本。它与任务目录分开，便于用户只查看最终结果，同时保留任务完整上下文。

## 防重复策略

任务 ID 使用 `YYYYMMDD-HHmmss-任务名`，同一秒内重复执行时可通过 `JOB_ID` 显式指定唯一名称。生成脚本不覆盖已有任务目录。
