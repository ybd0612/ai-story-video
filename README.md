# DSP 故事短视频生成项目

> 代码、用户数据、生成任务和最终输出严格分离。
>
> 项目总纲：[`PROJECT_INDEX.md`](PROJECT_INDEX.md)

## 目录原则

```text
 app/create-video/  固定代码路径：Remotion、脚本和运行配置
 data/              用户隐私路径：根文件为镜像主源，context、knowledge、analytics、operations、feedback 为分类副本；memory/ 为项目创作规则
 jobs/              每次生成的完整任务目录，按时间戳隔离
 outputs/           最终交付文件汇总，按任务隔离
 docs/              结构化项目文档
 templates/         可复用创作模板（workflows、style、voice、platform、policy 与根 title/script）
```

`data/context/`、`data/knowledge/`、`data/feedback/`、`data/analytics/`、`data/operations/`、`templates/story/`、`.claude/`、`.neuralmemory/`、`.workbuddy/`、`jobs/` 和 `outputs/` 均不会提交到 Git；`data/memory/` 仅提交 DSP 自身的结构化创作规则。

读写口径见 [项目总纲](PROJECT_INDEX.md) §2.5：更新 `data/` 或根模板内容只写主源，随后执行 `node scripts/migrate-layout.mjs mirror` 生成镜像；单独编辑分类目录副本会让一致性校验失败。

## 标准生成流程

1. 生成故事前先读取 `data/memory/style-preferences.json`，按题材匹配项目创作风格；再由 Agent 读取 `data/context/profile.md`、`data/context/preferences.md`，按任务选择 `data/knowledge/`、`data/feedback/`、`data/analytics/`；`data/operations/` 仅维护和复盘时读取。
2. 生成或接收故事 JSON；若草稿未显式填写 `style`，保存故事时自动注入匹配的项目风格，并等待用户确认。
3. 每次运行创建 `jobs/<时间戳>-<任务名>/`。
4. 图片、音频、JSON 中间文件和视频全部写入本次任务目录。
5. 最终视频复制到 `outputs/<任务 ID>/`，不会覆盖其他任务。
6. 用户对脚本或成片的反馈追加记录到 `data/` 主源文件，供后续生成读取；写完后执行 `node scripts/migrate-layout.mjs mirror` 同步分类目录镜像。

## 运行

```powershell
cd app/create-video
npm install
npm run doctor
$env:STORY_FILE = "C:/path/to/approved-story.json"
$env:STORY_APPROVAL_FILE = "C:/path/to/story.approved"
npm run make:video
```

标准代码入口：`app/create-video`。正式生产请先经 `npm run save:story` 与 `npm run approve:story` 生成审核指纹，`make:video` 会校验指纹并在缺失审核文件时立即终止；直接设置环境变量仅用于复用已审核的输入。断点续跑、镜头补偿和单阶段命令的适用边界见 [项目总纲](PROJECT_INDEX.md) §2.2 与 §2.6。

生成结果示例：

```text
jobs/20260902-122542-moon-rabbit-goodnight/
├─ input/       原始故事和审核信息
├─ work/        配图、配音和渲染中间 JSON
├─ media/       本次任务的图片和音频
└─ output/      本次任务的视频

outputs/20260902-122542-moon-rabbit-goodnight/story-video.mp4
```

## 文档入口

- [项目总纲](PROJECT_INDEX.md)：目录、SSOT 权威口径、同步铁律、文档状态与冲突登记
- [架构说明](docs/architecture.md)：代码、数据、任务、输出边界
- [生成工作流](docs/workflow.md)：从用户反馈到成片的完整流程
- [模板目录说明](templates/README.md)：模板分类与 A–D 阶段现状
- [data 与 templates 边界方案](docs/data-template-boundary.md)：运行时上下文、模板和任务目录分层
- [工作流演进方案](docs/workflow-roadmap-openmontage.md)：DSP 与 OpenMontage 对比、P0/P1 实施结果
- [企业级演进路线图](docs/enterprise-roadmap.md)：稳定性、复用、定制和治理方向
- [数据与隐私](docs/data-and-privacy.md)：忽略规则和隐私边界
- [维护指南](docs/maintenance.md)：新增功能和排查问题
- [视频代码说明](app/create-video/README.md)
- [故事工作流](app/create-video/AGENT_STORY_WORKFLOW.md)
- [Agent 行为规则](CLAUDE.md)

根目录的 `overview*.md` 与 `project-improvement-report*.md` 是各轮交付/评审的**时点快照**，只保留历史、不再更新；其中的数字以总纲为准，清单与状态见 [项目总纲 §4.2](PROJECT_INDEX.md)。
