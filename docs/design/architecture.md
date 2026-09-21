# 项目架构

> 本文档隶属 [项目总纲](../PROJECT_INDEX.md)，关键路径以总纲 SSOT 为准。

## 分层

### 代码层

`app/create-video/` 是唯一固定代码路径。它不保存用户故事、历史媒体或最终视频，只包含可复用的 Remotion 组件、生成脚本和配置。

### 数据层

`data/` 是项目运行时数据目录。其中 `data/memory/` 保存 DSP 自身可复用的创作规则，是项目记忆 SSOT（随 Git 提交）；`data/context/`、`data/knowledge/`、`data/feedback/`、`data/analytics/` 和 `data/operations/` 保存用户上下文、知识、反馈、发布数据和运营记录，默认不提交。

`data/` 根部的 `profile.md`、`preferences.md`、`knowledge.md`、`history.md`、`tasks.md` 是上述分类目录的**兼容副本**，由 `migrate-layout.mjs mirror` 生成、不提交也不手工编辑：写入一律落在分类目录主源，写完执行 `mirror`，映射与规则见 [项目总纲 §2.5](../PROJECT_INDEX.md)。

Agent 每次创作前先读取项目记忆，再按任务读取其他资料；用户通过 Agent 提出的修改意见也写回对应目录。`.workbuddy/` 仅属于开发工具，不参与创作记忆。

### 任务层

每次生成创建唯一 `jobs/<job-id>/`，包含：

- `input/`：本次不可变输入快照（`story.source.json`、`story.approved`、`snapshot.manifest.json`）与固化的 `refs/`（workflow、platform profile、catalog），resume 时校验其未被篡改；
- `work/`：配图、TTS、校验和准备阶段的中间 JSON；
- `media/images/`、`media/audio/`：本次任务的图片和音频；
- `output/`：本次任务的最终视频；
- `status.json`：阶段状态、失败原因与可重试阶段，是任务状态的唯一事实源；
- `events.jsonl`：追加式事件日志，密钥等敏感字段写入前脱敏；
- `job.json`：任务元信息与 metadata manifest；
- `run.lock`：运行期本地互斥锁，结束时移除。

### 交付层

`outputs/<job-id>/` 保存最终交付副本。它与任务目录分开，便于用户只查看最终结果，同时保留任务完整上下文。

## 防重复策略

任务 ID 使用 `YYYYMMDD-HHmmss-任务名`，同一秒内重复执行时可通过 `JOB_ID` 显式指定唯一名称。生成脚本不覆盖已有任务目录。
