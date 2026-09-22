# Agent 故事短视频工作流

> 数据与模板口径：`data/` 写入分类目录主源（`memory/`、`context/`、`knowledge/`、`analytics/`、`operations/`、`feedback/`），`templates/` 写入根 `title/script` 模板与 `workflows/`、`platform/`；两者写完后执行 `migrate-layout.mjs mirror` 生成兼容副本（`data/` 根文件、`templates/story/`），副本不手改。方向差异与映射表见 `PROJECT_INDEX.md` §2.5。

> 本文档隶属 [DSP 项目总纲](../PROJECT_INDEX.md)，路径和任务隔离规则以总纲为准。

## 项目入口规则

在 `dsp` 项目下生成视频，统一使用本目录的项目流水线：故事 JSON → Agnes 配图 → Edge TTS → Remotion → MP4。不得默认调用 WorkBuddy 内置视频生成能力；只有用户明确要求外部/内置生成时才切换，并说明将绕过本项目流程。每次生成必须使用新的时间戳任务目录。

## 目标

把一个主题或一句灵感，变成“故事文案 + 分镜提示词 + AI 配图 + Remotion 成片”。

## 标准流程

```text
用户主题
  ↓
读取 `data/memory/style-preferences.json`，按题材匹配默认风格
  ↓
Agent 输出 story.draft.json（未指定 style 时自动注入项目风格）
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
任务故事作为 Remotion props 传入
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

## 本地检查与渲染

本项目**不提供 Remotion Studio 网页预览**，`package.json` 中也没有 `start` 脚本；观察任务只能靠命令行、`status.json` 和 `events.jsonl`。

本地开发在 `app/create-video` 目录执行：

```bash
npm run doctor
npm run dry-run -- ./story.json
npm run typecheck
npm test
```

渲染统一走一键入口，它会为本次运行创建独立任务目录并注入正确的路径：

```bash
npm run make:video
```

输出文件：`jobs/<job-id>/output/story-video.mp4`，并复制到 `outputs/<job-id>/story-video.mp4`。

`npm run render:video` 与别名 `npm run build:story` 只服务于流水线内部阶段：缺省输入是 `./src/story/sampleStory.json`（仓库中不存在，样片实际是 `src/story/sampleStory.ts`），缺省输出是 `./out/story-video.mp4`，缺省 `--public-dir` 是 `./public`。因此**不要把它们当独立渲染命令使用**；确需单跑时必须显式指定 `STORY_CURRENT_FILE`、`VIDEO_OUTPUT`、`JOB_PUBLIC_ROOT`（口径见 `PROJECT_INDEX.md` §2.6）。

## 呈现层与动效约束

渲染层分三块，职责严格分开：

| 文件 | 职责 |
|---|---|
| `src/lib/scene-plan.ts` | 纯时间轴数学：画面窗口重叠与音频绝对锚点、旁白分句与时间窗分配。唯一有不变量测试的地方 |
| `src/compositions/StoryVideo.tsx` | 只按 `planSceneWindows` 摆放 `Sequence`，并把 `Audio` 放在绝对帧上 |
| `src/components/StoryScene.tsx` | 单镜头视觉：缓动 Ken Burns、标题 spring、逐句字幕、氛围层 |

必须守住以下几条性质：

1. **音频绝对锚定**：交叉溶解会把后一镜的画面提前压进来，但旁白永远落在 `audioFrom` 这个绝对帧上。不变量 `audioFrom === visualFrom + audioOffset`，且合成总时长严格等于各镜头时长之和。改任何时间轴逻辑前先跑 `test/scene-plan.test.mjs`。
2. **切点不得回黑**：相邻镜头靠重叠交叉溶解衔接，画面层不再各自淡出到透明。回归探针是切点附近帧的平均亮度 `YAVG`——实测应保持三位数（97–110），掉到 20 上下就说明又变成闪黑。
3. **字幕区同一时刻只允许一种文字**：`subtitle` 常与旁白原句或其语序复述重合，会上下两屏显示同一句话。`shouldShowGoldenLine()` 按去标点后的字符重合度判定，≥ 0.6 视为复述并抑制。这是渲染层兜底；源头规范（是否禁止 `subtitle` 与旁白重叠）尚未写进 `story.schema.json` 与创作约束。

性能约束见 [ADR-0005](../adr/0005-atmosphere-render-cost.md)：不对全屏图层做 `transform` 位移，逐帧动画只用 `transform` / `opacity`；改完先用 `--frames=200-499` 定帧测量，再提交。

## Agnes 图片 API 接入

当前已按 Agnes Image 2.5 Flash 文档接入：

- Endpoint：`https://api.agnes-ai.cn/v1/images/generations`
- Model：`agnes-image-2.5-flash`
- 短视频默认：`size: "1K"`、`ratio: "9:16"`
- URL 输出：`extra_body.response_format: "url"`，读取 `data[0].url` 后再下载为本地 PNG
- Base64 输出：**当前脚本未实现**（不发送 `return_base64`，也不读 `data[0].b64_json`）；如后续需要，只改 Provider 或脚本
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

解释器由 `scripts/runtime-tools.mjs` 统一解析（`doctor`、`pipeline`、`generate:tts` 共用同一入口）：设置了 `PYTHON_BIN` 就只用它、不可用时直接报 `PYTHON_BIN_UNUSABLE` 而不静默回退；未设置时依次探测 `VIRTUAL_ENV` 解释器、`py -3`（Windows）、`python`、`python3`，并要求能成功 `import edge_tts`，全部失败报 `PYTHON_RUNTIME_NOT_FOUND`。本机 PATH 上的 Python 未装 `edge_tts`，跑 TTS 前需先设置 `PYTHON_BIN`。

每个镜头最多重试 `EDGE_TTS_MAX_RETRIES`（默认 3）次。微软端点会偶发返回"无音频"（`NoAudioReceived`），助手 `scripts/tts_retry.py` 为此**每次重试都重新构造 `Communicate`**（避免复用已过期的会话凭据）、按 1s/2s/4s 指数退避，并在每次失败后删除半成品，防止坏音频被后续复用当作有效产物。全部尝试失败才会让 `tts` 阶段失败并写下 `retryableStage`。回归见 `test/tts-retry.test.mjs`（内部执行 `python scripts/tts_retry.py --selftest`，不依赖网络与 `edge_tts`）。

生成逐镜头 MP3：

```powershell
$env:EDGE_TTS_VOICE = "zh-CN-YunxiNeural"
$env:EDGE_TTS_RATE = "+0%"
$env:EDGE_TTS_PITCH = "+0Hz"
$env:EDGE_TTS_MAX_RETRIES = "3"
npm run generate:tts
```

脚本读取 `scene.narration`，用 `ffprobe` 测量时长并回填 `audioDurationInSeconds` 与带余量的 `durationInSeconds`（余量由 `AUDIO_PAUSE_SECONDS` 控制，默认 `0.5`），同时把 `audioPath` 写成相对任务根的 `media/audio/<序号>-<scene-id>.mp3`。

⚠️ 落点由环境变量决定，不由脚本自己判断：`STORY_AUDIO_DIR` 缺省 `./public/audio`、`STORY_PUBLIC_ROOT` 缺省 `./`。只有 `make:video` 会注入本任务的 `media/audio/` 与任务根目录，从而写出 `jobs/<job-id>/media/audio/` 与 `work/`。单独执行本命令会落到共享 `public/` 目录，而 JSON 中记录的却是 `media/audio/...`，路径不可解析——正式生产一律走 `make:video`。图片同理（`STORY_IMAGE_DIR` 缺省 `./public/images`）。

## 故事审核与一键生成

Agent 根据用户主题和 `data/memory/style-preferences.json` 生成 `story.draft.json` 后，先保存为待审核故事；若草稿未填写 `style`，`save:story` 会按题材自动注入项目记忆中的默认风格：

```powershell
npm run save:story -- ./story.draft.json
# 用户确认后
npm run approve:story
npm run make:video
```

仅 `validate:story`、`validate:audio`、`dry-run`、`doctor` 可以不带任务上下文直接执行。其余阶段命令（`generate:images`、`generate:tts`、`prepare:story`、`render:video`）的缺省路径指向共享的 `public/`、`out/`，只用于调试；要在调试时复现正式落点，必须自行注入 `STORY_FILE`、`STORY_OUTPUT`、`STORY_IMAGE_DIR`、`STORY_AUDIO_DIR`、`STORY_PUBLIC_ROOT`、`JOB_PUBLIC_ROOT`、`VIDEO_OUTPUT`。

用户确认标题、旁白、分镜和固定人物没有问题后，再放行媒体生成：

```powershell
npm run approve:story
npm run make:video
```

`make:video` 会检查审核文件。没有确认文件时会立即终止，不调用 Agnes、不生成 TTS，也不渲染视频。通过确认后，命令依次创建时间戳任务目录、固化 `input/` 不可变快照与 `refs/`、执行 Agnes 配图、下载本地图片、Edge TTS 配音、生成任务工作文件，并通过 Remotion `--props` 将当前任务故事传入渲染，不再复制到共享的 `src/story/currentStory.json`。最后复制到 `outputs/<job-id>/`。图片和音频只在当前任务内复用，任务之间不会共享或覆盖。

失败后可按 `status.json` 恢复：`JOB_ID=<job-id>` 配合 `RESUME=1` 续跑（已 `delivered` 的任务拒绝续跑）；图片与配音支持 `RETRY_STAGE` 加 `SCENE_ID` 做单镜头补偿，并复用仍然有效的产物。

> 说明：当前项目负责“故事 JSON 的保存、审核门禁和媒体生产”。聊天中的 Agent 负责根据主题生成草稿 JSON；项目尚未绑定独立的文本模型 API。

