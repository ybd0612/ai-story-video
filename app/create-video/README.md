# Agent Story Video

> 本文档隶属 [DSP 项目总纲](../../PROJECT_INDEX.md)，项目路径和输出规则以总纲为准。

Agent 故事短视频生成器：使用 Agent 生成故事 JSON，使用 Agnes Image 2.5 Flash 生成固定人物配图，使用 Edge TTS 生成旁白，最后由 Remotion 导出竖屏短视频。

## 项目入口规则

在 `dsp` 项目下生成视频，统一使用本目录的项目流水线，不默认调用 WorkBuddy 内置视频生成。标准入口是 `npm run make:video`。每次运行会创建独立的 `jobs/<job-id>/`，最终视频写入任务的 `output/`，并复制到 `outputs/<job-id>/`；只有用户明确指定外部/内置生成能力时才切换。

## 快速开始

```powershell
npm install
npm run typecheck
```

Agent 先根据主题生成符合 `story.schema.json` 的草稿文件，例如 `story.draft.json`，然后保存并等待审核：

```powershell
npm run save:story -- ./story.draft.json
```

保存阶段会校验故事结构，并清除旧审核状态。确认故事、人物、旁白和分镜无误后，再执行：

```powershell
npm run approve:story
npm run make:video
```

`make:video` 会校验审核指纹；故事内容在审核后变更时会拒绝生产。流程会自动复用已有图片，生成旁白后按真实音频时长加 0.5 秒调整镜头，并在 Remotion 渲染前执行硬校验。默认输出：`out/story-video.mp4`

完整工作流和环境变量说明见 `AGENT_STORY_WORKFLOW.md`。
