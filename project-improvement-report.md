# DSP 项目改进审查报告

> 🔴 **时点快照（2026-09-04）**：本报告描述的是当日状态，正文不再更新。其中两条现状描述已被代码推翻——仓库当前跟踪 **100 个文件**（非 42），且已存在 `npm test`（15 个测试文件、37 项）。
> 逐条建议的落地状态以当前代码为准：
>
> | 建议 | 状态 | 代码依据 |
> |---|---|---|
> | P0-1 任务状态、失败记录、恢复入口 | ✅ 已实现 | `task-state.mjs`（`status.json`、阶段/镜头状态、`retryableStage`）、`JOB_ID + RESUME=1` |
> | P0-2 外部调用超时、重试、退避、原子落盘 | ✅ 已实现 | `generate-story-images.mjs` `fetchWithRetry`（`AGNES_REQUEST_TIMEOUT_MS`、`AGNES_MAX_RETRIES`、尊重 `Retry-After`、5xx/429 才重试）、`writeAtomically` |
> | P0-3 集中命令与环境变量 SSOT、增加 `doctor` | ✅ 已实现 | `npm run doctor`、`PROJECT_INDEX.md` §2 |
> | P1-4 schema 成为唯一校验入口 | 🟡 部分 | `schemas/` 已按产物分层，`storyRepository` 进入渲染前做运行时校验；`story.schema.json` 与脚本校验规则仍未合并 |
> | P1-5 并发与重复运行边界 | ✅ 已实现 | `run.lock`、已存在 `status.json` 时拒绝覆盖、渲染经 `--props` 不再写共享 `src/story/currentStory.json` |
> | P1-6 自动化测试与无密钥 dry-run | ✅ 已实现 | `npm test`（`node --test`）、`npm run dry-run` |
> | P1-7 媒体缓存绑定输入指纹 | ❌ 未实现 | 图片/音频仍按 `NN-<scene-id>` 文件是否存在决定复用，未校验 prompt/model/size/ratio；风险由「媒体只落在本 job 目录」+ 审核 SHA-256 指纹门禁部分缓解 |
> | P2-8 视频质量验收 | 🟡 部分 | `stage-contracts.mjs` 校验存在、非空、路径受控与交付 hash；未校验时长误差、分辨率、帧率、编码与音轨 |
> | P2-9 可观测性与成本统计 | 🟡 部分 | `events.jsonl` 追加式事件并脱敏；无成本/配额账本 |
> | P2-10 内容运营闭环 | ❌ 未实现 | `data/analytics/` 仍是 `history.md` 镜像，无 `publications.csv`/`insights.md` 结构化数据 |
> | P2-11 可配置 BGM/混音 | ❌ 未实现 | `StoryScene.tsx` 仅逐镜头旁白 |
> | P2-12 依赖与环境锁定 | 🟡 部分 | 已固定 `remotion@4.0.459`、`edge-tts@1.0.1`；`react`/`react-dom`/类型包仍用 `^`。Python 个人绝对路径已由 `bb3f710` 移除，改由 `scripts/runtime-tools.mjs` 探测（见总纲 §2.4）；Node 版本仍未锁定 |
>
> 现行事实一律以 [项目总纲](PROJECT_INDEX.md) 为准；后续路线见 [`docs/enterprise-roadmap.md`](docs/enterprise-roadmap.md)。

审查日期：2026-09-04
审查范围：项目结构、文档与 SSOT、故事审核门禁、图片/TTS/Remotion 生成链路、类型与脚本检查、数据与 Git 边界。

## 一、结论

项目已经完成了第一轮“可控生成流水线”的整理：代码、隐私数据、任务产物和交付物分离；故事有 schema 和审核指纹门禁；图片、音频和视频按任务目录隔离；当前代码静态检查通过。

当前主要短板不在目录整理，而在“生产可靠性、可测试性、可恢复性和运营闭环”还没有形成。建议先不要继续堆视觉特效，优先把一次失败可诊断、可重试、可恢复，以及发布后的数据反馈闭环做扎实。

## 二、证据与当前状态

- 固定代码入口为 `app/create-video/`，标准命令为 `npm run make:video`。
- `make-video.mjs` 已具备审核指纹校验、任务目录创建、阶段串联和最终复制。
- `generate-story-images.mjs` 已支持按任务目录落盘、串行 RPM 限速和本地图片复用。
- `generate-edge-tts.py` 会测量真实音频时长，并给镜头增加 0.5 秒余量。
- 已执行并通过：关键 `.mjs` 脚本语法检查、TypeScript `tsc --noEmit`。
- 仓库当前仅跟踪 42 个文件，生成数据与媒体按规则忽略；未发现工作树未提交变更。
- 当前示例故事为 5 镜头“月亮兔的晚安邮差”，可作为回归样例，但尚未形成自动化测试样本集。

## 三、按优先级排列的改进项

### P0：建议优先处理

#### 1. 修复任务失败后的“半成品状态”与恢复机制

证据：`scripts/make-video.mjs` 会先创建任务目录，再依次调用外部服务和渲染；失败时没有统一的状态文件、阶段标记、失败原因和重试入口。`job.json` 直到全部流程完成后才写入，因此中途失败的任务缺乏机器可读状态。

建议：
- 创建任务后立即写 `job.json`，状态设为 `created`。
- 每个阶段写入 `status.json` 或更新 `job.json`：`validated`、`images_generated`、`tts_generated`、`prepared`、`rendered`、`delivered`、`failed`。
- 记录开始时间、结束时间、输入故事指纹、脚本版本、错误摘要和可重试阶段。
- 增加 `resume:job` 或按阶段重跑命令，避免图片和 TTS 已成功后因渲染失败而从头开始。

#### 2. 增加外部调用的超时、重试和退避

证据：图片 API、图片下载、Edge TTS 和 ffprobe 都是外部依赖；当前图片请求直接 `fetch`，没有 AbortController 超时，也没有针对 429、5xx、网络中断的有限重试。TTS 逐镜头生成失败时也没有重试策略。

建议：
- 图片 API 和下载分别设置超时。
- 对 429/5xx/网络错误做有限次数重试，指数退避并尊重 `Retry-After`。
- 对不可重试的 4xx 立即失败，并输出镜头 id、HTTP 状态和服务响应摘要。
- 重试前检查目标文件完整性，使用临时文件写入后原子改名，避免损坏 PNG/MP3 被误判为可复用。

#### 3. 消除路径与流程文档不一致

证据：`CLAUDE.md` 的标准命令仍包含 `npm run generate:tts`，但 `package.json` 的脚本实际是 `generate:tts` 调用 `scripts/run-edge-tts.mjs`，后者再调用 `scripts/generate-edge-tts.py`；`AGENT_STORY_WORKFLOW.md` 的流程图写成“Python Edge TTS”，而 README 运行说明没有明确 Python 环境、ffprobe 依赖检查。`docs/maintenance.md` 仍以旧的固定 public 路径作为反例，容易让维护者困惑。

建议：
- 将命令、环境变量、依赖检查和恢复方式集中到一份 SSOT 文档。
- 其它文档只引用该入口，不重复维护易漂移的命令细节。
- 增加 `npm run doctor`，统一检查 Node、Python、edge-tts、ffprobe、API Key（只检查是否存在，不输出值）和目录权限。

### P1：建议随后处理

#### 4. 让 schema 成为真正的唯一校验入口

证据：`story.schema.json`、`validate-story.mjs`、`save-story.mjs` 和 `src/story/types.ts` 各自重复校验，规则不完全一致。运行时 `storyRepository.ts` 通过类型断言直接接收 JSON，没有真正执行 schema 校验；`getStoryFromJson` 也是直接断言。schema 中 `imageUrl` 使用 URI 格式，但生成流程实际主要回填 `imagePath`，且 schema 未声明 `audioPath`、`audioDurationInSeconds` 等派生字段。

建议：
- 选定一个运行时 schema 校验器，所有 CLI 入口和 Remotion 数据加载统一使用。
- 明确“输入故事字段”和“阶段产物字段”两层 schema，或使用 `allOf`/扩展 schema。
- 增加 `additionalProperties` 策略、scene id 格式、时长上下限、镜头数量上限和字符串长度限制。
- 在 `getStory()` 加载时做运行时校验，避免坏 JSON 进入渲染。

#### 5. 修复并发与重复运行边界

证据：`remotion.config.ts` 开启 `Config.setOverwriteOutput(true)`；`make-video.mjs` 会把 `currentStory.json` 复制到共享的 `src/story/currentStory.json`。虽然任务目录隔离了大部分产物，但两个并发生成任务仍可能互相覆盖这个共享文件，渲染时产生串线风险。

建议：
- 渲染入口不要依赖共享 `src/story/currentStory.json`，改为通过 Remotion `inputProps` 传入当前任务故事，或为每个任务使用隔离的临时 bundle/public 根目录。
- 默认关闭全局覆盖，输出文件存在时显式拒绝；只有确认是当前任务时才允许覆盖。
- 增加任务锁（lock file）或明确声明单任务互斥，至少先阻止两个任务同时渲染。

#### 6. 补齐自动化测试和无密钥 dry-run

证据：目前只有 `typecheck` 和脚本语法检查，没有 `npm test`，也没有针对审核指纹、重复 scene id、路径穿越、任务 id 冲突、音频时长回填、失败恢复的测试。

建议：
- 先不引入新 Maven 依赖；Node 侧可优先使用 Node 内置 test runner。
- 建立 fixtures：合法故事、缺字段故事、重复 id、恶意路径、旧审核指纹、阶段半成品。
- `npm run test` 覆盖纯函数和 CLI 行为；外部 API 通过 mock/fake server 测试。
- 增加 `--dry-run`：只校验输入、依赖和将要执行的路径，不调用 Agnes/TTS、不渲染。

#### 7. 图片缓存策略需要绑定输入指纹

证据：`generate-story-images.mjs` 只按 `01-<scene.id>.png` 判断是否复用，没有校验人物设定、imagePrompt、style、模型、尺寸和比例是否变化。故事修改后可能复用旧图片，造成画面与新脚本不一致。

建议：为每个媒体文件保存 sidecar 元数据或在任务 work JSON 中记录 prompt/model/size/ratio 的 hash；只有 hash 完全一致才复用。若是同一任务重试，复用成功文件；若是新故事或提示词变更，必须重新生成。

### P2：中长期增强

#### 8. 增加视频质量验收而不仅是文件存在

当前已做音频时长硬校验和 MP4 生成，但建议进一步检查：视频时长与故事总时长误差、分辨率/帧率/编码格式、音频轨存在、每个镜头图片可读、音频无静音/零时长、输出文件大小和 ffprobe 元数据。

#### 9. 引入可观测性与成本统计

每次任务记录图片数量、缓存命中数、API 请求次数、重试次数、TTS 时长、渲染耗时、产物大小和估算成本。这样才能判断每条视频的真实生产成本，并优化 1K/2K 档位与缓存策略。

#### 10. 形成内容运营闭环

`data/history.md` 目前仍是空模板，`data/preferences.md` 中开场、结尾、选题和镜头偏好大量待填写。项目应把发布平台、发布时间、播放、完播、点赞、评论、收藏、转发、关注转化等字段结构化，再将复盘结论回写偏好和模板。

#### 11. 增加可配置的音频混音层

当前 `StoryScene.tsx` 只有逐镜头旁白，没有 BGM、环境音、音量 ducking、淡入淡出和音频轨统一验收。建议先支持可选 BGM 与总音量配置，再做旁白期间自动压低背景音乐，避免直接把音频逻辑散落在组件内。

#### 12. 依赖与运行环境锁定

`react`、`react-dom`、TypeScript 类型包使用 `^` 范围，Node/Python/ffprobe 依赖未在 doctor 中集中声明。建议锁定经过验证的 Node 版本，明确 Python venv 初始化方式，并定期执行依赖审计和升级验证。

## 四、建议执行顺序

1. P0-1：任务状态、失败记录、恢复入口。
2. P0-2：外部调用超时、重试、临时文件原子落盘。
3. P1-5：移除共享 `currentStory.json` 并处理并发渲染。
4. P1-4：统一 schema 与运行时校验。
5. P1-6：测试夹具、dry-run、`npm run doctor`。
6. P1-7：媒体缓存指纹。
7. P2-8/9：质量验收、成本与耗时统计。
8. P2-10/11：运营数据闭环和音频混音。

## 五、暂不建议做的事

- 暂不建议继续删除或重写现有共享组件；当前代码量不大，先用测试和状态机制验证真实问题。
- 暂不建议在没有发布数据前大规模调整视觉特效；先把“稳定产出一条可复盘视频”作为成功标准。
- 暂不建议把 API Key、用户资料、任务媒体重新纳入 Git；现有隐私边界应继续保持。
