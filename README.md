# ai-story-video

> 一句主题 → 一条竖屏成片。**Agent 负责创作决策，代码负责确定性生产。**

给做 AI 短视频的人用的本地流水线：把"主题/灵感"交给 Agent 产出结构化故事 JSON，人工审核一次，之后配图、旁白、按真实音频时长定镜头节奏、渲染 MP4 全部由脚本完成，产物按任务隔离、可断点续跑、可审计。

它刻意不做成可视化编排平台。项目边界很小——**一种视频类型、一条固定链路**，把"一次失败可诊断、可重试、可复现"这件事做扎实。

## 特性

- **人工审核指纹门禁**：故事经 SHA-256 指纹绑定，审核后再改内容会直接拒绝生产，不会静默用旧审核出片。
- **任务级隔离**：每次运行创建独立 `jobs/<YYYYMMDD-HHmmss>-<slug>/`，图片、音频、中间 JSON、成片、状态、事件日志全在里面，任务之间不共享、不覆盖。
- **外部调用会自己重试**：图片请求带超时、指数退避并尊重 `Retry-After`；旁白合成按镜头重试（每次重新建连，默认 3 次），失败先删除半成品再试，避免坏文件被当成有效音频复用。
- **断点续跑与镜头级补偿**：`RESUME=1` 从失败阶段继续；配图/配音失败时可只补单个镜头（`RETRY_STAGE` + `SCENE_ID`），并复用仍然有效的媒体，不重复烧 API 调用。
- **阶段产物契约**：状态标记为 `completed` 但产物不满足契约时停止并报错，不假装成功。
- **音频驱动节奏**：`ffprobe` 测量每段旁白真实时长，按"+0.5s 余量"回填镜头时长，渲染前再做硬校验。
- **可审计**：追加式 JSONL 事件日志，写入前对密钥与敏感字段脱敏；工作流、平台规格、模板索引在任务创建时固化进任务目录，resume 时检测篡改。
- **输入快照不可变**：任务只读自己的输入快照，外部文件中途变化不影响正在跑的任务。

## 快速开始

```bash
cd app/create-video
npm ci                  # 按 package-lock.json 装出与 CI 一致的依赖树
npm run doctor          # 检查 Node / Python+edge_tts / ffprobe / API Key 是否就绪
```

跑一次真实生成需要图片服务的密钥（只从环境变量读，不落盘）：

```bash
export AGNES_API_KEY=<你的密钥>        # Windows PowerShell: $env:AGNES_API_KEY="<你的密钥>"
npm run save:story -- ./story.draft.json   # 结构校验 + 清除旧审核状态
npm run approve:story                      # 人工确认后放行媒体生成
npm run make:video                         # 一键出片
```

没有密钥或真实素材时，可以先做无副作用预检：

```bash
npm run dry-run -- ./story.json
```

输出：`jobs/<job-id>/output/story-video.mp4`，并复制到 `outputs/<job-id>/`。个人上下文（账号定位、创作偏好）不入库，clone 后按需自备 `data/` 内容即可运行。

## 它是怎么跑起来的

```text
主题 / 灵感
   ↓  Agent 产出 story.draft.json（含固定人物设定 character + 逐镜 imagePrompt）
save:story → 人工审核 → approve:story（SHA-256 指纹绑定）
   ↓
validate → images → tts → audio-validation → prepare → render → deliver
   │         │       │          │
   │         │       │          └ ffprobe 实测时长回填镜头
   │         │       └ Edge TTS 逐镜头 MP3
   │         └ Agnes 图生图（复用同一套人物设定，保证人物一致）
   └ story.schema.json 结构校验
   ↓
jobs/<job-id>/{media,output}/  →  outputs/<job-id>/story-video.mp4
```

整条链路由 `pipeline.mjs` 驱动，每个阶段都是可独立执行的脚本 + 一份产物契约，Agent 不参与生产环节的判断。

## 故事输入长什么样

Agent 必须输出符合 `story.schema.json` 的 JSON，而不是让视频组件去猜自然语言。必填字段为 `id`、`title`、`topic`、`style`、`character`、`scenes`；`character` 必填 `id`、`name`、`description`、`visualTraits`、`wardrobe`；每个 scene 必填 `id`、`title`、`narration`、`imagePrompt`、`durationInSeconds`。

仓库自带示例 `src/story/sampleStory.ts`（节选）：

```jsonc
{
  "id": "the-last-lamp",
  "title": "巷口最后一盏灯",
  "topic": "一个普通人，在低谷里重新找回生活的故事",
  "style": "电影感、克制、温暖、现实主义",
  "character": {                       // 角色圣经：全片复用，保证人物一致
    "id": "young-programmer-dad",
    "name": "林默",
    "description": "a 30-year-old Chinese man, calm and slightly tired, an ordinary office worker and new father",
    "visualTraits": "short black hair, oval face, warm brown eyes, slim build, subtle tired expression, realistic East Asian features",
    "wardrobe": "dark navy hoodie, white T-shirt, black casual trousers, simple canvas shoes"
  },
  "scenes": [{
    "id": "opening",
    "title": "开场：灯还亮着",
    "narration": "那天晚上，我加班到十一点，整条街都熄了灯，只有巷口那一盏还亮着。",
    "imagePrompt": "深夜的老城区巷口，一盏暖黄色路灯，湿润的石板路，远处一个疲惫的年轻人背影，电影感，竖屏构图，无文字",
    "durationInSeconds": 6,
    "subtitle": "有些灯，不是为了照亮路。"   // 可选，屏幕字幕
  }]
}
```

`character.referenceImage` 可选，提供公共 HTTPS 图片或 Data URI 时走图生图。创作约束写在 [`docs/design/story-workflow.md`](docs/design/story-workflow.md)：前 3 秒要有钩子、一镜一动作、提示词不要求画面内文字、结尾必须有情绪落点、涉及真实人物与医疗法律题材不编造事实。

## 设计取舍

- **不建可视化界面**，Agent 是唯一控制面 → [ADR-0001](docs/adr/0001-agent-only-control-plane.md)
- **固定单一 Provider 链路**，不提前抽象多供应商 selector → [ADR-0003](docs/adr/0003-single-provider-chain.md)
- **`data/` 与 `templates/` 的镜像写入方向**（谁是主源） → [ADR-0002](docs/adr/0002-data-templates-mirror-direction.md)
- **运行时解释器解析不静默回退** → [ADR-0004](docs/adr/0004-python-runtime-resolution.md)

其余决策与全部待做项见 [`docs/adr/`](docs/adr/README.md) 与 [`docs/roadmap/`](docs/roadmap/enterprise.md)。

## 项目结构

```text
app/create-video/   代码：Remotion 组件、生成脚本、阶段契约、schema、测试
data/               个人上下文与项目创作记忆（默认不入库）
jobs/<job-id>/      单次任务的输入快照、中间产物、媒体、成片、状态与事件日志
outputs/<job-id>/   最终交付副本
docs/               总纲、更新记录、决策记录、设计、指南、路线、历史快照
templates/          可复用创作模板（工作流、平台规格、标题与脚本模板）
```

## 文档

| 你要做什么 | 看哪份 |
|---|---|
| 查路径、命令、Provider 参数、限额的**唯一权威口径** | [`docs/PROJECT_INDEX.md`](docs/PROJECT_INDEX.md) |
| 跑通一次生成 / 排查失败 | [`docs/guides/workflow.md`](docs/guides/workflow.md)、[`docs/guides/maintenance.md`](docs/guides/maintenance.md) |
| 改代码前了解边界与阶段契约 | [`docs/design/architecture.md`](docs/design/architecture.md)、[`docs/design/story-workflow.md`](docs/design/story-workflow.md) |
| 看项目做了什么 / 为什么这样取舍 | [`docs/CHANGELOG.md`](docs/CHANGELOG.md)、[`docs/adr/`](docs/adr/README.md) |

## 运行要求

| 依赖 | 说明 |
|---|---|
| Node.js | 运行脚本与 Remotion；测试用内置 `node --test`，无额外测试框架 |
| Python + `edge_tts` | 旁白合成。由 `PYTHON_BIN` 指定解释器，不设置时按 `VIRTUAL_ENV` → `py -3` → `python` → `python3` 探测，要求能 `import edge_tts`；**显式指定的解释器不可用时直接失败，不回退** |
| `ffprobe`（FFmpeg） | 测量音频时长 |
| 图片服务 | Agnes Image 2.5 Flash，密钥 `AGNES_API_KEY`，只读环境变量 |

`npm run doctor` 会一次性检查以上全部项（密钥只检查是否存在，不回显）。

## 状态

- 单机、命令行、单人使用；已交付过多条完整成片，测试覆盖状态机、阶段契约、快照不可变性、镜像一致性与故事校验。
- **新克隆直接 `npm test` 可跑**：涉及个人运行时上下文的镜像用例会在缺 `data/` 主源时带原因自动跳过，其余用例应当全绿（`jobs/`、`outputs/`、`data/` 个人内容均不入库）。
- **CI**：`.github/workflows/ci.yml` 在 push 与 PR 上跑 `npm ci` → `npm run typecheck` → `npm test`，覆盖 Node 22 与 24；不装 ffmpeg 与 `edge_tts`，因此依赖个人 `data/` 或 Python 解释器的用例会带原因 skip（预期语义，见 `docs/PROJECT_INDEX.md` §2.4）。
- **没有托管的演示视频**，`jobs/` 与 `outputs/` 不入库。
- 未做：任务级成本账本、配置化审批策略、provenance 审计、多工作流与平台化。顺序与理由见 [`docs/roadmap/enterprise.md`](docs/roadmap/enterprise.md)。

## 许可

MIT，见 [LICENSE](LICENSE)。

## 声明

本项目生成 AI 图片与合成语音，成片内容不代表事实陈述；用于真实人物、医疗、法律、新闻题材前请自行核实，并确保遵守所使用模型服务的条款与发布平台规则。
