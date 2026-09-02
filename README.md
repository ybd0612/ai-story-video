# DSP 故事短视频生成项目

> 代码、用户数据、生成任务和最终输出严格分离。
>
> 项目总纲：[`PROJECT_INDEX.md`](PROJECT_INDEX.md)

## 目录原则

```text
app/create-video/  固定代码路径：Remotion、脚本和运行配置
 data/              用户隐私路径：资料、偏好、反馈、历史记录
 jobs/              每次生成的完整任务目录，按时间戳隔离
 outputs/           最终交付文件汇总，按任务隔离
 docs/              结构化项目文档
 templates/         可复用创作模板
```

`data/`、`.claude/`、`.neuralmemory/`、`.workbuddy/`、`jobs/` 和 `outputs/` 均不会提交到 Git。

## 标准生成流程

1. Agent 读取 `data/` 下的用户资料、偏好、知识和历史反馈。
2. 生成或接收故事 JSON，并等待用户确认。
3. 每次运行创建 `jobs/<时间戳>-<任务名>/`。
4. 图片、音频、JSON 中间文件和视频全部写入本次任务目录。
5. 最终视频复制到 `outputs/<任务 ID>/`，不会覆盖其他任务。
6. 用户对脚本或成片的反馈追加记录到 `data/`，供后续生成读取。

## 运行

```powershell
cd app/create-video
npm install
$env:STORY_FILE = "C:/path/to/approved-story.json"
$env:STORY_APPROVAL_FILE = "C:/path/to/story.approved"
npm run make:video
```

标准代码入口：`app/create-video`。

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

- [项目总纲](PROJECT_INDEX.md)：目录、SSOT、同步规则和状态
- [架构说明](docs/architecture.md)：代码、数据、任务、输出边界
- [生成工作流](docs/workflow.md)：从用户反馈到成片的完整流程
- [数据与隐私](docs/data-and-privacy.md)：忽略规则和隐私边界
- [维护指南](docs/maintenance.md)：新增功能和排查问题
- [视频代码说明](app/create-video/README.md)
- [故事工作流](app/create-video/AGENT_STORY_WORKFLOW.md)
