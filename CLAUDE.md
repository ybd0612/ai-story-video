# CLAUDE.md

> 短视频创作助手核心配置
>
> 项目总纲：[docs/PROJECT_INDEX.md](docs/PROJECT_INDEX.md)。视频代码和运行细节：[docs/design/story-workflow.md](docs/design/story-workflow.md)。

## 项目定位

本项目是一个以 Agent 为创作入口的故事短视频生成器：

```text
主题/灵感 → Agent 输出 story.draft.json → 用户确认 → Agnes 配图 → Edge TTS → Remotion → MP4
```

## Agent 工作规则

> **项目级生成入口硬规则：** 在 `dsp` 项目下生成视频，必须优先使用本项目 `create-video` 的故事视频流水线（Agnes 配图 → Edge TTS → Remotion），不得默认调用 WorkBuddy 内置视频生成能力。只有用户明确指定外部/内置生成能力时，才允许切换，并需说明会绕过本项目流程。

1. 每次生成前必读 `data/memory/style-preferences.json`、`data/context/profile.md`、`data/context/preferences.md`、`templates/workflows/`、`templates/platform/`；按任务选择 `data/knowledge/`、`data/feedback/`、`data/analytics/`。`data/operations/` 仅维护/复盘时读取。`data/` 分类目录是**写入主源**，`data/` 根下的同名文件是 `mirror` 生成的兼容副本；写完后执行一次 `node scripts/migrate-layout.mjs mirror`（口径见 `PROJECT_INDEX.md` §2.5）。`templates/` 方向相反：根 `title/script` 模板是主源，`templates/story/` 是镜像产物，不直接编辑、不新增。
2. 将主题整理为符合 `app/create-video/story.schema.json` 的结构化 JSON，不要让视频组件直接解析自然语言。
3. 每个故事必须建立 `character` 角色圣经，固定人物描述、外貌特征和服装；可提供 `referenceImage`。
4. 每个镜头只描述一个动作或情绪变化，图片提示词不要求图片生成文字。
5. 旁白必须适合口播，前三秒有冲突、悬念或反差，结尾有情绪落点。
6. 涉及真实人物、医疗、法律、新闻时，不编造事实，不把虚构内容包装成真实经历。
7. 完成创作任务后，把任务摘要追加到 `data/operations/tasks.md`，发布内容与复盘写入 `data/analytics/history.md`，确认新的表达偏好后更新 `data/context/preferences.md`；用户反馈直接写入 `data/feedback/`（该目录不在镜像映射内，可自由新增文件）。这些分类目录文件是**主源**，`data/` 根下的 `tasks.md`、`history.md`、`preferences.md`、`profile.md`、`knowledge.md` 是 `mirror` 生成的兼容副本，**不要直接编辑**。每次写完在 `app/create-video/` 执行 `node scripts/migrate-layout.mjs mirror`，并保证 `node scripts/migrate-layout.mjs --check` 通过（映射表见 `PROJECT_INDEX.md` §2.5）。

## 标准命令

在 `app/create-video` 目录执行：

```powershell
npm run doctor
npm run typecheck
npm test
npm run save:story -- ./story.draft.json
npm run approve:story
npm run validate:story -- ./story.json
```

完整闭环（唯一推荐的生产入口）：

```powershell
npm run make:video
```

`generate:images`、`generate:tts`、`prepare:story`、`render:video`（及别名 `build:story`）是流水线内部阶段，缺省读写路径指向共享的 `./public/`、`./out/`，且 `render:video` 缺省输入 `src/story/sampleStory.json` 在仓库中并不存在——单独执行会失败，必须显式注入任务目录环境变量。用法与变量清单见 `PROJECT_INDEX.md` §2.2、§2.6 和 `docs/design/story-workflow.md`。

输出：`jobs/<job-id>/output/story-video.mp4`，并复制到 `outputs/<job-id>/story-video.mp4`。

## 安全与配置

- Agnes API Key 只能从系统环境变量 `AGNES_API_KEY` 读取。
- 禁止把 API Key 写入代码、故事 JSON、文档、Skill、日志或 Git。
- 图片和音频保存到当前任务的 `jobs/<job-id>/media/`。
- 图片只在当前任务内复用，不跨任务共享，避免产物串线。
- Agnes 默认使用 `1K + 9:16`，批量脚本按实际 RPM 串行限速。
