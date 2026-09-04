# Agent 故事短视频工作流

> 本文档隶属 [DSP 项目总纲](../../PROJECT_INDEX.md)，路径和任务隔离规则以总纲为准。

## 项目入口规则

在 `dsp` 项目下生成视频，统一使用本目录的项目流水线：故事 JSON → Agnes 配图 → Edge TTS → Remotion → MP4。不得默认调用 WorkBuddy 内置视频生成能力；只有用户明确要求外部/内置生成时才切换，并说明将绕过本项目流程。每次生成必须使用新的时间戳任务目录。

## 目标

把一个主题或一句灵感，变成“故事文案 + 分镜提示词 + AI 配图 + Remotion 成片”。

## 标准流程

```text
用户主题
  ↓
Agent 输出 story.draft.json
  ↓
保存 + 结构校验 + 清除旧审核
  ↓
用户审核故事、人物、旁白和分镜
  ↓
审核指纹绑定 story.json
  ↓
统一入口 make:video
  ↓
复用/生成分镜图片
  ↓
Python Edge TTS 生成 MP3
  ↓
ffprobe 测量音频并回填镜头时长（音频 + 0.5 秒）
  ↓
旁白时长硬校验
  ↓
更新 currentStory.json
  ↓
Remotion StoryVideo 渲染 + MP4 验收
```

任何故事内容在审核后发生变化，都必须重新执行保存和审核；生产入口会通过 SHA-256 指纹拒绝使用旧审核。图片、配音和渲染失败时，保留已完成的中间产物，可从对应阶段继续。

## Agent 输出格式

Agent 必须输出符合 `story.schema.json` 的 JSON。每个镜头至少包含：

- `id`：稳定的英文标识
- `title`：镜头标题
- `narration`：该镜头旁白，短句优先
- `imagePrompt`：只描述本镜头动作和环境，不要重复人物固定设定；必须包含场景、情绪、风格、竖屏构图
- `durationInSeconds`：建议 4-10 秒
- `character`：每个视频必须有一套固定人物设定，包含外貌、视觉特征和服装
- `character.referenceImage`：可选；提供公共 HTTPS 图片 URL 或 Data URI，作为 Agnes 图生图参考图
- `subtitle`：可选，适合做金句或屏幕字幕
- `imageUrl`：图片生成成功后回填

## Agent 创作约束

1. 前 3 秒必须有冲突、悬念或反差。
2. 一个镜头只承载一个画面动作或情绪变化。
3. 旁白要适合口播，避免大段书面语。
4. 图片提示词不要包含中文或英文文字要求，避免图片出现乱码。
5. 所有镜头必须复用同一套人物设定；有参考图时优先使用图生图输入。
6. 故事结尾必须有情绪落点：反转、领悟、温暖或行动。
7. 涉及真实人物、医疗、法律和新闻时，不编造事实，不把虚构故事包装成真实经历。

## 运行前检查

```powershell
npm run doctor
npm run dry-run -- ./story.json
```

`doctor` 只检查运行环境和密钥是否存在，不输出密钥；`dry-run` 只读取故事并检查基本结构，不调用图片、配音服务，也不渲染视频。

## 本地开发

在 `app/create-video` 目录执行：

```bash
npm run start
```

Remotion 中选择 `StoryVideo` 预览故事样片。

渲染：

```bash
npm run build:story
```

输出文件：`jobs/<job-id>/output/story-video.mp4`，并复制到 `outputs/<job-id>/story-video.mp4`。

## Agnes 图片 API 接入

当前已按 Agnes Image 2.5 Flash 文档接入：

- Endpoint：`https://api.agnes-ai.cn/v1/images/generations`
- Model：`agnes-image-2.5-flash`
- 短视频默认：`size: "1K"`、`ratio: "9:16"`
- URL 输出：`extra_body.response_format: "url"`，读取 `data[0].url`
- Base64 输出：`return_base64: true`，读取 `data[0].b64_json`
- API Key：只读取环境变量 `AGNES_API_KEY`，不写入代码、记忆或故事文件

配置示例见 `.env.example`。批量生成脚本：

```bash
# PowerShell
$env:AGNES_API_KEY = "你的密钥"
$env:STORY_FILE = "./story.json"
$env:STORY_OUTPUT = "./story.with-images.json"
npm run generate:images
```

脚本会串行调用接口，并根据 `AGNES_USER_TYPE` 与 `AGNES_IMAGE_SIZE` 使用文档中的实际 RPM 限制：

| 用户类型 | 1K | 2K | 3K | 4K |
|----------|----:|----:|----:|----:|
| default | 20 | 10 | 1 | 1 |
| enterprise | 40 | 20 | 1 | 1 |
| TokenPlan | 100 | 80 | 1 | 1 |

具体 API 如果未来字段变化，只修改 Provider 或脚本，不改故事和视频组件。

## Edge TTS 配音

使用隔离环境中的 Python `edge-tts` 生成逐镜头 MP3：

```powershell
$env:EDGE_TTS_VOICE = "zh-CN-YunxiNeural"
$env:EDGE_TTS_RATE = "+0%"
$env:EDGE_TTS_PITCH = "+0Hz"
npm run generate:tts
```

脚本读取 `scene.narration`，生成到当前任务的 `jobs/<job-id>/media/audio/`，使用 `ffprobe` 回填 `audioDurationInSeconds` 和带 0.5 秒余量的 `durationInSeconds`，并输出到任务的 `work/`。图片生成到当前任务的 `media/images/`。Remotion 渲染时通过 `--public-dir` 使用当前任务目录，避免写入共享产物目录。

## 故事审核与一键生成

Agent 根据用户主题生成 `story.draft.json` 后，先保存为待审核故事：

```powershell
npm run save:story -- ./story.draft.json
# 用户确认后
npm run approve:story
npm run make:video
```

也可以分别执行阶段：

```powershell
npm run validate:story -- ./story.json
npm run generate:images
npm run generate:tts
npm run prepare:story
npm run render:video
```

用户确认标题、旁白、分镜和固定人物没有问题后，再放行媒体生成：

```powershell
npm run approve:story
npm run make:video
```

`make:video` 会检查审核文件。没有确认文件时会立即终止，不调用 Agnes、不生成 TTS，也不渲染视频。通过确认后，命令依次创建时间戳任务目录、执行 Agnes 配图、下载本地图片、Edge TTS 配音、生成任务工作文件、渲染到任务 `output/`，最后复制到 `outputs/<job-id>/`。图片和音频只在当前任务内复用，任务之间不会共享或覆盖。

> 说明：当前项目负责“故事 JSON 的保存、审核门禁和媒体生产”。聊天中的 Agent 负责根据主题生成草稿 JSON；项目尚未绑定独立的文本模型 API。

