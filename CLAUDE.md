# CLAUDE.md

> 短视频创作助手核心配置
>
> 项目总纲：`PROJECT_INDEX.md`。视频代码和运行细节：`app/create-video/AGENT_STORY_WORKFLOW.md`。

## 项目定位

本项目是一个以 Agent 为创作入口的故事短视频生成器：

```text
主题/灵感 → Agent 输出 story.draft.json → 用户确认 → Agnes 配图 → Edge TTS → Remotion → MP4
```

## Agent 工作规则

> **项目级生成入口硬规则：** 在 `dsp` 项目下生成视频，必须优先使用本项目 `create-video` 的故事视频流水线（Agnes 配图 → Edge TTS → Remotion），不得默认调用 WorkBuddy 内置视频生成能力。只有用户明确指定外部/内置生成能力时，才允许切换，并需说明会绕过本项目流程。

1. 每次生成前必读 `data/context/profile.md`、`data/context/preferences.md`、`templates/workflows/`、`templates/story/`、`templates/platform/`；按任务选择 `data/knowledge/`、`data/feedback/`、`data/analytics/`。`data/operations/` 仅维护/复盘时读取。旧 `data/*.md` 与 templates 根 title/script 仅只读兼容，不再新增。
2. 将主题整理为符合 `create-video/story.schema.json` 的结构化 JSON，不要让视频组件直接解析自然语言。
3. 每个故事必须建立 `character` 角色圣经，固定人物描述、外貌特征和服装；可提供 `referenceImage`。
4. 每个镜头只描述一个动作或情绪变化，图片提示词不要求图片生成文字。
5. 旁白必须适合口播，前三秒有冲突、悬念或反差，结尾有情绪落点。
6. 涉及真实人物、医疗、法律、新闻时，不编造事实，不把虚构内容包装成真实经历。
7. 完成创作任务后，将任务摘要写入 `data/operations/tasks.md`，用户反馈写入 `data/feedback/`；发布内容与复盘写入 `data/analytics/history.md`；确认新的表达偏好后更新 `data/context/preferences.md`。旧 `data/tasks.md`、`data/history.md`、`data/preferences.md` 仅只读兼容，不再写入。

## 标准命令

在 `app/create-video` 目录执行：

```powershell
npm run typecheck
npm run generate:images
npm run generate:tts
npm run prepare:story
npm run build:story
```

完整闭环：

```powershell
npm run make:video
```

输出：`jobs/<job-id>/output/story-video.mp4`，并复制到 `outputs/<job-id>/story-video.mp4`。

## 安全与配置

- Agnes API Key 只能从系统环境变量 `AGNES_API_KEY` 读取。
- 禁止把 API Key 写入代码、故事 JSON、文档、Skill、日志或 Git。
- 图片和音频保存到当前任务的 `jobs/<job-id>/media/`。
- 图片只在当前任务内复用，不跨任务共享，避免产物串线。
- Agnes 默认使用 `1K + 9:16`，批量脚本按实际 RPM 串行限速。
