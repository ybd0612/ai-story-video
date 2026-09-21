# DSP 故事短视频生成项目

> 代码、用户数据、生成任务和最终输出严格分离。
>
> 项目总纲：[`PROJECT_INDEX.md`](docs/PROJECT_INDEX.md)

## 目录原则

```text
 app/create-video/  固定代码路径：Remotion、脚本和运行配置
 data/              用户隐私路径：context、knowledge、analytics、operations、feedback 为写入主源；根下同名 md 为兼容副本；memory/ 为项目创作规则
 jobs/              每次生成的完整任务目录，按时间戳隔离
 outputs/           最终交付文件汇总，按任务隔离
 docs/              全部项目文档：PROJECT_INDEX 总纲、CHANGELOG、design/guides/roadmap/adr/history 分区
 templates/         可复用创作模板（workflows、style、voice、platform、policy 与根 title/script）
```

`data/context/`、`data/knowledge/`、`data/feedback/`、`data/analytics/`、`data/operations/`、`data/` 根文件、`templates/story/`、`.claude/`、`.neuralmemory/`、`.workbuddy/`、`jobs/` 和 `outputs/` 均不会提交到 Git；`data/memory/` 仅提交 DSP 自身的结构化创作规则。

读写口径见 [项目总纲](docs/PROJECT_INDEX.md) §2.5：`data/` 只写分类目录主源，`templates/` 只写根模板主源，写完统一执行 `node scripts/migrate-layout.mjs mirror` 生成副本；直接编辑副本会让一致性校验失败。

## 标准生成流程

1. 生成故事前先读取 `data/memory/style-preferences.json`，按题材匹配项目创作风格；再由 Agent 读取 `data/context/profile.md`、`data/context/preferences.md`，按任务选择 `data/knowledge/`、`data/feedback/`、`data/analytics/`；`data/operations/` 仅维护和复盘时读取。
2. 生成或接收故事 JSON；若草稿未显式填写 `style`，保存故事时自动注入匹配的项目风格，并等待用户确认。
3. 每次运行创建 `jobs/<时间戳>-<任务名>/`。
4. 图片、音频、JSON 中间文件和视频全部写入本次任务目录。
5. 最终视频复制到 `outputs/<任务 ID>/`，不会覆盖其他任务。
6. 用户对脚本或成片的反馈与任务记录追加到 `data/` 分类目录主源（`feedback/`、`operations/`、`analytics/`、`context/`），供后续生成读取；写完后执行 `node scripts/migrate-layout.mjs mirror` 同步 `data/` 根下的兼容副本。

## 运行

```powershell
cd app/create-video
npm install
npm run doctor
$env:STORY_FILE = "C:/path/to/approved-story.json"
$env:STORY_APPROVAL_FILE = "C:/path/to/story.approved"
npm run make:video
```

标准代码入口：`app/create-video`。正式生产请先经 `npm run save:story` 与 `npm run approve:story` 生成审核指纹，`make:video` 会校验指纹并在缺失审核文件时立即终止；直接设置环境变量仅用于复用已审核的输入。断点续跑、镜头补偿和单阶段命令的适用边界见 [项目总纲](docs/PROJECT_INDEX.md) §2.2 与 §2.6。

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

先按你要解决的问题挑一条路：

| 你想做什么 | 看哪份 |
|---|---|
| 跑通一次生成 | [故事工作流](docs/design/story-workflow.md) → [视频代码说明](app/create-video/README.md) |
| 弄清路径、命令、限额的权威口径 | [项目总纲 §2](docs/PROJECT_INDEX.md) |
| 改代码前了解边界与流程 | [架构说明](docs/design/architecture.md) → [生成工作流](docs/guides/workflow.md) → [维护指南](docs/guides/maintenance.md) |
| 动 `data/` 或 `templates/` 内容 | [总纲 §2.5](docs/PROJECT_INDEX.md) → [边界方案](docs/design/data-template-boundary.md) → [ADR-0002](docs/adr/0002-data-templates-mirror-direction.md) |
| 看项目做了什么、为什么这样取舍 | [更新记录](docs/CHANGELOG.md) → [决策记录](docs/adr/README.md) |
| 判断下一步演进方向 | [企业级路线图](docs/roadmap/enterprise.md) → [OpenMontage 对比](docs/roadmap/openmontage-comparison.md) |

### 分区清单

```text
docs/PROJECT_INDEX.md   总纲：结构、SSOT 权威口径、同步铁律、冲突登记
docs/CHANGELOG.md       更新记录（按日期倒序，单一入口）
docs/adr/               决策记录：背景、决策、后果、证据
docs/design/            设计与边界：architecture、data-template-boundary、story-workflow
docs/guides/            操作指南：workflow、maintenance、data-and-privacy
docs/roadmap/           演进路线：enterprise、openmontage-comparison
docs/history/           时点快照：各轮交付概览与评审报告，入库即冻结、不再更新
```

其它入口：[数据与隐私](docs/guides/data-and-privacy.md)、[模板目录说明](templates/README.md)、[Agent 行为规则](CLAUDE.md)。

除本文件与 `CLAUDE.md`（Agent 入口，宿主按固定路径加载）外，项目根不放 Markdown；新文档的落点规则见 [总纲 §4.4](docs/PROJECT_INDEX.md)。历史快照中的数字与结论均为其记录时点的状态，现状一律以总纲为准。
