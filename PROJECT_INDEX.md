# DSP 项目总纲

> 本文档是项目导航与 SSOT。代码、用户数据、生成任务、最终输出和文档各自有固定边界。

## 1. 项目结构

| 路径 | 职责 | Git 状态 |
|---|---|---|
| `app/create-video/` | 唯一固定代码路径，Remotion 与生成脚本 | 提交 |
| `data/` | 用户资料、偏好、知识、历史、Agent 反馈 | 忽略 |
| `jobs/<job-id>/` | 单次生成的输入、中间文件、媒体和视频 | 忽略 |
| `outputs/<job-id>/` | 单次生成的最终交付物 | 忽略 |
| `docs/` | 项目架构、工作流、隐私和维护文档 | 提交 |
| `templates/` | 标题、脚本等可复用模板 | 提交 |
| `.claude/` | 本地 Agent 规则和技能 | 忽略 |
| `.neuralmemory/` | 本地记忆数据 | 忽略 |
| `.workbuddy/` | WorkBuddy 项目状态和记忆 | 忽略 |

## 2. SSOT 权威口径

| 事实 | 权威值 |
|---|---|
| 代码根目录 | `app/create-video/` |
| 用户数据根目录 | `data/`，不提交 Git |
| 任务目录 | `jobs/<时间戳>-<任务名>/` |
| 最终输出目录 | `outputs/<任务 ID>/` |
| 图片和音频 | 当前任务的 `jobs/<任务 ID>/media/` |
| 生成入口 | 在 `app/create-video/` 执行 `npm run make:video` |
| 图片模型 | `agnes-image-2.5-flash` |
| 旁白 | Edge TTS，默认 `zh-CN-YunxiNeural` |
| API Key | 环境变量 `AGNES_API_KEY`，禁止写入文件 |

其它文档不得自行定义以上路径和关键事实；变更时先改本表，再同步引用方。

## 3. 标准数据流

```text
data/ 用户资料与历史反馈
        ↓
Agent 生成/调整故事
        ↓
jobs/<job-id>/input/ 原始输入
        ↓
jobs/<job-id>/work/ 中间 JSON
        ↓
jobs/<job-id>/media/ 图片与音频
        ↓
jobs/<job-id>/output/ 本次视频
        ↓
outputs/<job-id>/ 最终交付副本
        ↓
data/ 记录用户反馈和任务摘要
```

## 4. 文档地图

| 文档 | 内容 |
|---|---|
| `README.md` | 快速入口和使用方式 |
| `PROJECT_INDEX.md` | 项目总纲、SSOT 和状态 |
| `CLAUDE.md` | Agent 行为规则 |
| `docs/architecture.md` | 分层架构和目录边界 |
| `docs/workflow.md` | 单次任务生成流程 |
| `docs/data-and-privacy.md` | 用户数据和 Git 隐私规则 |
| `docs/maintenance.md` | 维护、扩展和排查 |
| `app/create-video/README.md` | 视频子项目说明 |
| `app/create-video/AGENT_STORY_WORKFLOW.md` | 故事创作工作流 |

## 5. 同步铁律

- 路径或生成行为变更：先改本文件，再同步 `README.md`、`CLAUDE.md` 和 `docs/`。
- 每次生成必须创建新的 `job-id`，禁止覆盖历史任务。
- 用户反馈必须进入 `data/`，后续生成必须读取相关数据。
- API Key、用户资料、生成媒体和视频不进入 Git。
- 修改完成后执行类型检查和脚本静态检查，再提交 Git。

## 6. 已完成整理

- 旧版人体系统图片已清理。
- 旧版场景配置已从当前主题文件移除。
- `create-video` 已归入固定代码路径 `app/create-video/`。
- 现有故事、图片、音频和视频已迁移到时间戳任务目录。
- 已建立项目级 `.gitignore`。
- 已初始化 Git，首个提交待验证后创建。
