# DSP 项目总纲

> 本文档是项目导航与 SSOT（单一权威源）。代码、用户数据、生成任务、最终输出和文档各自有固定边界。
>
> 权威判定规则：**任何口径冲突以可执行代码为准**（`app/create-video/` 下的脚本、`package.json`、`.gitignore`）。本文件先改，引用方随后同步。

## 1. 项目结构

| 路径 | 职责 | Git 状态 |
|---|---|---|
| `app/create-video/` | 唯一固定代码路径，Remotion 与生成脚本 | 提交 |
| `data/` | 用户运行时上下文；`memory/` 保存 DSP 自身可提交的创作规则，其他子目录为 `context/`、`knowledge/`、`analytics/`、`operations/`、`feedback/` | `memory/README.md` 与 `memory/style-preferences.json` 提交，其余忽略 |
| `jobs/<job-id>/` | 单次生成的输入、中间文件、媒体和视频 | 忽略 |
| `outputs/<job-id>/` | 单次生成的最终交付物 | 忽略 |
| `docs/` | 全部项目文档：顶层 `PROJECT_INDEX.md`（本总纲）与 `CHANGELOG.md`，分区 `design/`、`guides/`、`roadmap/`、`adr/`、`history/` | 提交 |
| `templates/` | 可复用模板：`workflows/`、`style/`、`voice/`、`platform/`、`policy/` 及根 `title/script` 模板 | 提交（`templates/story/` 为本机镜像产物，忽略） |
| `.claude/` | 本地 Agent 规则和技能 | 忽略 |
| `.neuralmemory/` | 本地记忆数据 | 忽略 |
| `.workbuddy/` | WorkBuddy 的项目状态和开发工具记忆，不属于 DSP 创作记忆 | 忽略 |
| `temp/` | 草稿与中间暂存 | 忽略 |

Git 跟踪范围以 `git ls-files | wc -l` 的实时输出为准，本文件不复述具体数量；`data/` 与 `templates/story/` 的多数内容是本机运行时文件，不入版本库。

## 2. SSOT 权威口径

### 2.1 路径与入口

| 事实 | 权威值 | 代码依据 |
|---|---|---|
| 代码根目录 | `app/create-video/` | `package.json` |
| 任务目录 | `jobs/<job-id>/`，`job-id` = `YYYYMMDD-HHmmss-<slug>` | `scripts/job-paths.mjs` `createJobId()` |
| 任务内部布局 | `input/`、`work/`、`media/images/`、`media/audio/`、`output/`、`status.json`、`events.jsonl`、`job.json`、`run.lock` | `scripts/job-paths.mjs` `getJobPaths()` |
| 任务输入快照 | `jobs/<job-id>/input/story.source.json` + `input/story.approved` + `input/snapshot.manifest.json` + `input/refs/` | `job-paths.mjs`、`task-snapshot.mjs` |
| 最终输出 | `outputs/<job-id>/story-video.mp4` | `pipeline.mjs` `delivered` |
| 用户数据根目录 | `data/memory/`（DSP 创作规则）；`data/context/`、`data/knowledge/`、`data/feedback/`、`data/analytics/`、`data/operations/` | `.gitignore`、`job-paths.mjs` `DATA_ROOT` |
| 模板索引 | `templates/catalog.json`（含 sha256，改动后必须重算） | `migrate-layout.mjs` `checkCatalogHashes()` |

### 2.2 命令（以 `package.json` scripts 为唯一来源）

| 目的 | 命令 | 备注 |
|---|---|---|
| 完整闭环 | `npm run make:video` | 唯一推荐入口，走 `pipeline.mjs` |
| 环境检查 | `npm run doctor` | 只检查密钥是否存在，不输出值 |
| 无副作用预检 | `npm run dry-run -- <story.json>` | 不调用外部服务、不渲染 |
| 结构与产物校验 | `npm run validate:story -- ./story.json`、`npm run validate:audio` | |
| 故事保存 / 审核 | `npm run save:story -- ./story.draft.json`、`npm run approve:story` | 审核用 SHA-256 指纹绑定 |
| 单阶段（需注入环境变量） | `npm run generate:images`、`npm run generate:tts`、`npm run prepare:story`、`npm run render:video` | 见 §2.6 |
| 类型检查 / 测试 | `npm run typecheck`、`npm test` | `node --test test/*.test.mjs` |
| 依赖升级 | `npm run upgrade` | `npx remotion upgrade` |
| 断点续跑 | `JOB_ID=<job-id>` + `RESUME=1 npm run make:video` | `resume` 无 `JOB_ID` 报 `JOB_ID_REQUIRED`；已 `delivered` 拒绝续跑 |
| 镜头级补偿 | `RETRY_STAGE=images\|tts` + `SCENE_ID=<scene-id>` | 仅这两个阶段支持，其它值直接拒绝 |

`npm run build:story` 只是 `render:video` 的别名，保留用于兼容；不要按独立命令书写使用方式（见 §2.6）。

### 2.3 Provider 与模型

| 事实 | 权威值 | 代码依据 |
|---|---|---|
| 图片 Provider | `agnes-images` → `scripts/generate-story-images.mjs` | `scripts/providers/default-providers.mjs` |
| 图片模型 | `agnes-image-2.5-flash` | `generate-story-images.mjs:5` |
| 图片 Endpoint | `https://api.agnes-ai.cn/v1/images/generations` | 同上 `:4` |
| 图片默认档位 | `AGNES_IMAGE_SIZE=1K`、`AGNES_IMAGE_RATIO=9:16` | 同上 `:6-7` |
| 图片响应格式 | **只支持 URL**（`extra_body.response_format: "url"`，读 `data[0].url`）；未实现 base64 分支 | 同上 `:107-116` |
| 图片 RPM | default 20/10/1/1，enterprise 40/20/1/1，TokenPlan 100/80/1/1（1K/2K/3K/4K），串行限速 | 同上 `:15-25` |
| 音频 Provider | `edge-tts` → `scripts/generate-edge-tts.py`（Python） | `providers/default-providers.mjs` |
| 旁白默认音色 | `zh-CN-YunxiNeural`，可用 `EDGE_TTS_VOICE` 覆盖；`EDGE_TTS_RATE=+0%`、`EDGE_TTS_PITCH=+0Hz` | `generate-edge-tts.py:12`、`generate-edge-tts.mjs:7-9` |
| 旁白重试 | 每镜头最多 `EDGE_TTS_MAX_RETRIES`（默认 3）次，**每次重新建连**、指数退避 1s/2s/4s，失败即删除半成品再试；全部失败才让 `tts` 阶段失败 | `scripts/tts_retry.py`、`test/tts-retry.test.mjs` |
| 镜头时长 | ffprobe 实测音频时长 + 0.5 秒余量 | `validate-audio-duration.mjs` |
| 渲染 Provider | `remotion` → `scripts/render-video.mjs` | `providers/default-providers.mjs` |

### 2.4 运行时依赖与环境解析

| 事实 | 权威值 |
|---|---|
| API Key | 环境变量 `AGNES_API_KEY`，禁止写入任何文件与 Git |
| Python 解析 | 统一由 `scripts/runtime-tools.mjs` 负责（`doctor.mjs`、`pipeline.mjs`、`run-edge-tts.mjs` 共用）。设置 `PYTHON_BIN` 时**只用它且不回退**，不可用即报 `PYTHON_BIN_UNUSABLE`；未设置时按 `VIRTUAL_ENV` 解释器 → `py -3`（Windows）→ `python` → `python3` 依次探测，且要求能成功 `import edge_tts`，全部失败报 `PYTHON_RUNTIME_NOT_FOUND`。探测超时 `PYTHON_PROBE_TIMEOUT_MS`，默认 15000 |
| ffprobe 默认 | `FFPROBE_BIN`，缺省 `ffprobe`（依赖 PATH） |
| 行尾与指纹稳定性 | `.gitattributes` 固定 `* text=auto eol=lf`（媒体与字体标 binary）。`templates/catalog.json` 与 `data/.migration/layout-map.json` 都按**字节**钉 sha256，若依赖 `core.autocrlf=true` 检出成 CRLF，克隆后指纹必然对不上 |
| 阶段顺序 | `validate → images → tts → audio-validation → prepare → render → deliver`（`task-state.mjs` `STAGE_ORDER`） |
| 运行时版本 | **统一 Node 24**。单一声明：仓库根 `.node-version` = `24` 与 `app/create-video/package.json` 的 `engines.node` = `>=24`；CI 用 `node-version-file` 读同一份，不再维护版本矩阵。下限取 24 的原因：测试用 `node --test` 且直接 `import` `.ts`，依赖默认开启的类型剥离（Node 22.18+/23.6+ 才有） |
| CI | `.github/workflows/ci.yml`：push/PR 上跑 `npm ci` → `npm run typecheck` → `npm test`（ubuntu-latest，Node 版本取自 `.node-version`）。**不安装 ffmpeg、不装 `edge_tts`**——测试不依赖外部程序；`migrate-layout` 与 `tts-retry` 用例会因缺 `data/` 主源或缺可用 Python 而 skip，属预期语义。注意 `cancel-in-progress: true`：连续推送时只有最新提交会被验证 |
| 渲染性能基线 | 呈现层改动必须用**定帧区间**测性能，不整片试错：`node node_modules/@remotion/cli/remotion-cli.js render src/index.ts StoryVideo out.mp4 --public-dir <job> --frames=200-499`。参考值（本机 2026-09-21）：300 帧约 22–26s，全片 1796 帧 123s。约束理由与归因数据见 [ADR-0005](adr/0005-atmosphere-render-cost.md) |
| 测试基线 | 以 `cd app/create-video && npm test` 的实时输出为准，本文件不复述项数（历史数字反复过期，见 §7 C-12）。语义：全部通过、无 skip 视为绿；**新克隆**上 `migrate-layout` 与 `tts-retry` 用例会因缺少 `data/` 个人主源或 Python 解释器而带原因 skip，属预期而非回归 |

### 2.5 `data/` 与 `templates/` 镜像口径（易错，务必照此执行）

`scripts/migrate-layout.mjs` 的 `MAPPINGS` 定义了**唯一允许的同步方向**：左侧是主源（source），右侧是必须字节一致的镜像副本（target）。

| 主源（写入这里） | 镜像副本（由 `mirror` 生成，禁止单独编辑） |
|---|---|
| `data/context/profile.md` | `data/profile.md` |
| `data/context/preferences.md` | `data/preferences.md` |
| `data/knowledge/legacy.md` | `data/knowledge.md` |
| `data/analytics/history.md` | `data/history.md` |
| `data/operations/tasks.md` | `data/tasks.md` |
| `templates/title-template.md` | `templates/story/title-template.md` |
| `templates/script-template.md` | `templates/story/script-template.md` |

两个半区方向**刻意不同**：

- **`data/`：分类目录是权威**（兑现 D 阶段原意图），`data/` 根文件是向后兼容副本；
- **`templates/`：根文件是权威**，`templates/story/` 是副本——因为 `templates/catalog.json` 按根路径钉 `sha256`、`.gitignore` 已把 `story/` 副本排除在版本库外，反转会连带改动 Git 跟踪范围与指纹固定，收益为零。

强制规则：

1. 更新上述任一内容，**只写该行的主源**；
2. 写完立刻在 `app/create-video/` 执行 `node scripts/migrate-layout.mjs mirror` 重新生成副本并刷新 `data/.migration/layout-map.json`；
3. 只改镜像副本会触发 `Migration target differs`，并让 `node scripts/migrate-layout.mjs --check` 与 `npm test` 失败；
4. `data/feedback/` 不在映射内，可直接新增文件，无需 `mirror`。

### 2.6 单阶段命令的真实边界

`render-video.mjs` 的缺省值只服务于流水线内部调用：默认读 `./src/story/sampleStory.json`（仓库中不存在此文件，样片是 `src/story/sampleStory.ts`），默认写 `./out/story-video.mp4`，默认 `--public-dir ./public`。

因此单独执行 `npm run render:video` / `npm run build:story` 会因缺少输入文件直接报错。需要单跑时必须显式注入：

```powershell
$env:STORY_CURRENT_FILE = "../..path/jobs/<job-id>/work/currentStory.json"
$env:VIDEO_OUTPUT = ".../jobs/<job-id>/output/story-video.mp4"
$env:JOB_PUBLIC_ROOT = ".../jobs/<job-id>"
```

同理 `generate:images`、`generate:tts` 的缺省路径是 `./public/images`、`./public/audio`，仅供流水线覆盖。**成片与媒体的正式落点只有 `jobs/<job-id>/media|output/` 和 `outputs/<job-id>/`，由 `make:video` 保证。**

## 3. 标准数据流

```text
data/memory/style-preferences.json + data/context/ + data/knowledge/ + data/feedback/ + data/analytics/
        ↓ 按任务选择性加载（Agent 读取，不经过生成代码）
Agent 生成 story.draft.json → save:story → 用户审核 → approve:story
        ↓
jobs/<job-id>/input/    不可变快照（story.source.json + story.approved + refs + snapshot.manifest）
        ↓
validate → images → tts → audio-validation → prepare   中间 JSON 写 work/，媒体写 media/
        ↓
render   jobs/<job-id>/output/story-video.mp4
        ↓
deliver  outputs/<job-id>/story-video.mp4
        ↓
反馈与记录写 data/ 分类目录主源，再执行 migrate-layout mirror 生成 data/ 根兼容副本
```

## 4. 文档地图

状态：🟢 与代码一致 ｜ 🟡 部分过期（结论仍有效）｜ 🔴 已被代码推翻（仅作历史留存）

### 4.1 专属项目文档

文档根在 `docs/`；项目根只保留 `README.md`（门户）与 `CLAUDE.md`（Agent 入口，宿主按固定路径加载，不可移动）。

| 文档 | 管什么 | 状态 | 权威度 |
|---|---|---|---|
| `README.md` | 开源门面：项目定位与动机、特性、快速开始、流水线、输入示例、精简导航 | 🟢 | 面向外部读者，事实引用本总纲 |
| `LICENSE` | MIT 许可（非 Markdown，允许留在根） | 🟢 | 法律文本 |
| `CLAUDE.md` | Agent 创作与读取行为规则 | 🟢 | 行为规范，路径引用本总纲 |
| `docs/PROJECT_INDEX.md` | 本文件：结构、SSOT、同步铁律、冲突登记 | 🟢 | **最高（SSOT）** |
| `docs/CHANGELOG.md` | 按日期倒序的更新记录 | 🟢 | 更新史唯一入口 |
| `docs/adr/README.md` | 决策记录索引与写法 | 🟢 | 决策依据 |
| `docs/design/architecture.md` | 分层架构与目录边界 | 🟢 | 设计说明 |
| `docs/guides/workflow.md` | 单次任务生成流程 | 🟢 | 设计说明 |
| `docs/guides/data-and-privacy.md` | 隐私与 Git 边界 | 🟢 | 隐私说明 |
| `docs/guides/maintenance.md` | 变更检查、排查、体积维护 | 🟢 | 操作手册 |
| `docs/design/data-template-boundary.md` | data/templates 分层方案 | 🟡 | 方案文档：A–C 为设计时点描述，落地口径见 §2.5 |
| `docs/roadmap/openmontage-comparison.md` | 与 OpenMontage 对比、P0/P1 方案 | 🟡 | 方案文档：§9 结果数字为实施时点 |
| `docs/roadmap/enterprise.md` | E0–E3 演进路线图 | 🟡 | 路线图：§3 缺口清单已被 E0 实现，见该节标注 |
| `app/create-video/README.md` | 视频子项目说明（随代码放置） | 🟢 | 操作手册 |
| `docs/design/story-workflow.md` | 故事工作流、Provider 参数、环境变量 | 🟢 | 操作手册，代码级细节最贴近实现 |
| `templates/README.md` | 模板分类与写入口径 | 🟢 | 导航 |

### 4.2 时点快照（评审与交付记录，不再更新）

以下 6 份是某一轮工作的完成记录，**只保留历史，不作为当前事实来源**；其中数字与代码现状不符，引用前先看本总纲。

| 文档 | 记录时点 | 状态 |
|---|---|---|
| `docs/history/overview-e0-e1-a-d.md` | E0/E1 与 A–D 交付 | 🟡 测试数过期；「新目录为 SSOT」结论已于 2026-09-21 随映射反转重新成立 |
| `docs/history/overview-p0-p1-workflow.md` | P0/P1 工作流实施 | 🔴 测试数过期 |
| `docs/history/overview-data-template.md` | data/templates 分层评审 | 🟡 结论有效，落地口径见 §2.5 |
| `docs/history/overview-enterprise-review.md` | 企业级评审 | 🟡 优先级仍有效 |
| `docs/history/project-improvement-report-2026-09-04.md` | 2026-09-04 全面审查 | 🔴 「无 npm test」「42 个跟踪文件」等现状描述已过期 |
| `docs/history/project-improvement-report-phase2-2026-09-04.md` | 第二阶段记录 | 🔴 测试数过期 |

### 4.3 阅读路径

- 新人上手：`README.md` → `docs/design/architecture.md` → `docs/guides/workflow.md` → `app/create-video/README.md`
- 改生成代码：本总纲 §2 → `docs/design/story-workflow.md` → `docs/guides/maintenance.md` → `docs/roadmap/`
- 改数据/模板目录：本总纲 §2.5 → `docs/design/data-template-boundary.md` → `docs/adr/0002-data-templates-mirror-direction.md` → `templates/README.md`
- 发布/交付核对：`docs/guides/workflow.md` → `docs/guides/data-and-privacy.md`
- 查历史与依据：`docs/CHANGELOG.md`（做了什么）→ `docs/adr/`（为什么这么做）→ `docs/history/`（当轮完整快照）

### 4.4 文档放置规则

新写一份文档时按"它回答什么问题"决定落点，**不放项目根**：

| 它回答什么 | 放哪里 | 命名 |
|---|---|---|
| 怎么跑、怎么操作 | `docs/guides/` | `<动名词>.md`，如 `workflow.md`、`maintenance.md` |
| 为什么这样设计、边界在哪 | `docs/design/` | 主题名，如 `architecture.md`、`data-template-boundary.md` |
| 为什么这样取舍（含被否掉的方案） | `docs/adr/` | `NNNN-短横线标题.md`，状态字段必写 |
| 还要做什么、差距在哪 | `docs/roadmap/` | `<主题>-roadmap.md` 或对比名 |
| 这一轮交付了什么（时点快照） | `docs/history/` | `<主题>-<YYYY-MM-DD>.md`，入库即冻结 |
| 按日期的变更流水 | `docs/CHANGELOG.md` | 单一文件，倒序追加 |
| 路径、命令、限额、版本等事实 | 本总纲 §2 | 其它文档只引用，不复述 |

项目根的 Markdown 只允许两份：`README.md`（**介绍优先**——是什么、为什么值得看、怎么跑起来；导航只留精简一节指向本总纲，完整文档地图归 §4 维护）与 `CLAUDE.md`（Agent 入口）。`LICENSE` 等非 Markdown 法律文本允许留在根。`app/create-video/README.md`、`templates/README.md` 是所在目录的说明页，随其内容放置，不算破例。

## 5. 同步铁律

总原则：**代码、决策或事实变更 ⇒ 同一次工作内同步文档，不留「以后再改」。**

| 你改了什么 | 必须同步 |
|---|---|
| `package.json` scripts / 新增环境变量 | 本总纲 §2.2、`CLAUDE.md` 标准命令、`docs/design/story-workflow.md`、`README.md` 运行段 |
| 阶段顺序、状态模型、契约 | `docs/guides/workflow.md`、`docs/design/story-workflow.md` 标准流程、`docs/roadmap/openmontage-comparison.md` §9 |
| Provider / 模型 / 限额 / 默认档位 | 本总纲 §2.3、`docs/design/story-workflow.md` 对应章节、`templates/catalog.json` hash |
| 目录与路径边界 | 本总纲 §1 与 §2.5、`README.md` 目录原则、`docs/design/architecture.md`、`docs/guides/data-and-privacy.md`、`templates/README.md`、`.gitignore` |
| `data/` 或根模板内容 | 只改主源，执行 `migrate-layout.mjs mirror`（§2.5） |
| `templates/` 任何被 catalog 收录的文件 | `templates/catalog.json` 的 path/sha256，然后 `node scripts/migrate-layout.mjs --check` |
| 一轮方案实施完成 | 对应 roadmap 文档的状态标记 + §4 状态列 + 新增一份时点快照并登记进 §4.2 |
| 任何面向结果的变更落地 | `docs/CHANGELOG.md` 追加一条（做了什么、提交号、影响口径） |
| 做了有影响后续的技术取舍 | 新增 `docs/adr/NNNN-*.md`，并更新 `docs/adr/README.md` 索引；被推翻时旧条目改状态、不删原文 |
| 新增或移动文档 | 按 §4.4 选目录；更新本总纲 §4 文档地图与 `README.md` 门户导航；跑链接解析校验无断链 |
| 改依赖 / 改安装方式 | 同步 `package-lock.json`（`npm install --package-lock-only`，且 `resolved` 必须是 `registry.npmjs.org`，不得留本机镜像），并在干净克隆验证 `npm ci`；必要时同步 `.github/workflows/ci.yml` |

必做 4 步：① 先改本总纲 §2；② `grep` 全仓扫旧值残留（含根 README 与快照文档）；③ 更新受影响文档头部状态标记与 §4 状态列；④ 在 §7 登记未解决冲突、在 §8 追加变更日志。

禁止：在其它文档复述 §2 的数值与路径；用「待统一更正」让不一致过夜；未跑代码核实就写命令、路径或测试数字；改完代码不改文档；**给快照写"顶部修订注记"时复述具体数值**——注记只准指向 §2 或可执行命令（如 `git ls-files | wc -l`），钉上数字就等于制造一个比正文更快过期的第二层漂移源（见 §7 C-12）。

完成代码变更后在 `app/create-video/` 执行：`npm run typecheck` → `npm test` → `node scripts/migrate-layout.mjs --check`，通过后再提交 Git（不自动 push）。

## 6. 已完成整理

- 旧版人体系统图片已清理。
- 旧版场景配置已从当前主题文件移除。
- `create-video` 已归入固定代码路径 `app/create-video/`。
- 现有故事、图片、音频和视频已迁移到时间戳任务目录。
- 已建立项目级 `.gitignore`。
- 已移除 Remotion Studio 启动入口和未使用的 transitions 依赖（因此**不存在** `npm run start`）。
- 已删除当前 StoryVideo 未引用的旧视觉组件 `DataViz.tsx`、`GlobalLayers.tsx`、`TextAnimations.tsx`。
- 已清理 Remotion 本地缓存，`app` 体积从约 741 MB 降至约 225 MB。
- 已初始化 Git，并完成首个整理提交。
- 已建立 `data/` → 分类目录的镜像与一致性校验（`migrate-layout.mjs`）。

## 7. 冲突登记

严重度：🔴 会让命令或校验直接失败 ｜ 🟡 会误导操作 ｜ ⬜ 表述不一致

| ID | 冲突 | 严重度 | 涉及位置 | 处置 |
|---|---|---|---|---|
| C-01 | 文档称「分类目录是写入权威」，代码却把 `data/` 根文件定义为 mirror **source**、副本必须字节一致，二者相反 | ✅ 已解决 | 起源 `af46bfc`（改文档）↔ `migrate-layout.mjs` MAPPINGS（改代码前） | ✅ **2026-09-21 用户拍板：改代码，让分类目录成为权威。** `MAPPINGS` 中 5 组 data 映射已交换方向，`data/` 根文件降级为向后兼容副本；`data/operations/tasks.md` 独有的 2026-09-08 记录以较新版本覆盖到根副本，`mirror` 与 `--check` 均通过。`templates/` 半区保持根文件为权威（catalog 与 .gitignore 已钉死），该非对称是有意决定，理由记在 §2.5 |
| C-02 | 文档记录 `npm run start`（Remotion Studio 预览），但 `package.json` 无此脚本，且总纲已声明该入口已移除 | 🔴 | `docs/design/story-workflow.md` 本地开发段 ↔ `package.json:5-21`、`docs/guides/maintenance.md:38` | ✅ 已删除该指引，并说明无网页预览入口 |
| C-03 | 文档把 `npm run build:story` 当独立可用命令且声称输出进任务目录，实际缺省输入 `src/story/sampleStory.json` 不存在、缺省输出 `./out/` | 🔴 | `docs/design/story-workflow.md` 渲染段、`CLAUDE.md` 标准命令 ↔ `render-video.mjs:11,23` | ✅ 已在 §2.6 与各文档标注为流水线内部命令 |
| C-04 | 测试数字四处不一致：7/7、26/26、5 项、「没有 npm test」 | 🟡 | `docs/history/overview-p0-p1-workflow.md`、`docs/history/overview-e0-e1-a-d.md`、`project-improvement-report*.md`、`docs/roadmap/openmontage-comparison.md:379` | ✅ 快照文档标 🔴 并加时点说明；权威数字统一到 §2.4（15 个测试文件、36 项，2026-09-21 全部通过） |
| C-05 | `docs/guides/data-and-privacy.md` 称整个 `data/` 不进 Git，实际 `data/memory/` 两份文件已提交 | 🟡 | `docs/guides/data-and-privacy.md:9` ↔ `.gitignore:2-6`、`git ls-files` | ✅ 已补例外说明 |
| C-06 | `docs/design/data-template-boundary.md` §5 把「CLAUDE.md 当前要求读取 `data/profile.md` 等根文件」当作现状描述；§7 迁移策略只写到 C 阶段 | 🟡 | 该文件 §5、§7 ↔ `CLAUDE.md` 规则 1 | ✅ 已标注为设计时点，并补 D 阶段与 §2.5 实际方向 |
| C-07 | `docs/roadmap/enterprise.md` §3 列的 4 条「当前代码缺口」已被 E0 实现（状态迁移、快照唯一输入、契约闭环） | 🟡 | 该文件 §3 ↔ `task-state-migrations.mjs`、`pipeline.mjs:58,79` | ✅ 已加时点与实现状态标注 |
| C-08 | 文档称 Agnes 支持 Base64 输出（`return_base64` / `data[0].b64_json`），代码只实现 URL | 🟡 | `docs/design/story-workflow.md` Agnes 段 ↔ `generate-story-images.mjs:107-116` | ✅ 已标注为未实现 |
| C-09 | 根目录 6 份快照文档未登记在 `README.md` 与总纲文档地图中，导致同一事实多版本并存 | 🟡 | 根 `overview*.md`、`project-improvement-report*.md` | ✅ 已登记 §4.2 并加顶部时点警示 |
| C-10 | `migrate-layout.mjs` 在文件底部无条件执行 CLI，任何 `import` 它的测试都会连带跑一次 `mirror()`，把一条数据漂移放大为多个测试文件失败 | ✅ 已解决 | `migrate-layout.mjs` 底部；原受影响 `test/catalog-consistency.test.mjs:5`、`test/migrate-layout.test.mjs:6` | ✅ 2026-09-21 已加 `pathToFileURL(process.argv[1])` 直接执行守卫，`import` 只导出函数无副作用；`migrate-layout.test.mjs` 的 targets 列表同步改为真实副本路径，若守卫回归该测试会以未捕获异常失败 |
| C-11 | 生成链路曾把某台机器的 WorkBuddy Python 绝对路径写死在 `doctor.mjs`、`pipeline.mjs`、`run-edge-tts.mjs`，换环境即断链；文档原先也未记录该依赖 | ✅ 已解决 | 提交 `bb3f710` 新增 `scripts/runtime-tools.mjs` 统一解析（含 `runtime-tools.test.mjs`） | ✅ 硬编码路径已移除，解析规则写入 §2.4。本机仍需注意：PATH 上的 Python 未装 `edge_tts`，跑 `doctor`/`make:video` 前要设置 `PYTHON_BIN`，否则三项候选全报 ModuleNotFound 并以 exit=1 结束（刻意的诚实失败，非回归） |
| C-12 | **快照的"顶部修订注记"本身发生漂移**：为纠正旧数字而写的注记又钉上了新瞬时数字（`37 项`、`100 个文件`），代码继续推进后注记比正文更快过期，形成"三层数字"（正文时点值 / 注记值 / §2.4 实测值） | 🟡 | `docs/history/overview-p0-p1-workflow.md:5`、`overview-e0-e1-a-d.md:6`、`project-improvement-report-2026-09-04.md:3`、`phase2-...md:3` ↔ 本文件 §1 与 §2.4 | ✅ 2026-09-21 复跑治理时发现：四处注记全部改为**只指向 §2.4 或实时命令**（`git ls-files \| wc -l`、`node --test test/*.test.mjs`），不再复述项数与文件数；§1 同步去掉「跟踪 100 个文件」。实测基线复核为 15 个测试文件 36 项全通过。**规则补进 §5：修订注记只写指针，不写数值。** |
| C-13 | §1 声明 `temp/` 为"草稿与中间暂存 · 忽略"，但 `.gitignore` 从未包含 `temp/`，导致 `temp/prenatal-lullaby/` 下 4 份个人题材故事草稿处于**已跟踪**状态，一旦推送即公开 | 🔴 | `.gitignore` ↔ 本文件 §1；受影响 `temp/prenatal-lullaby/{story.draft.json,story.json,story.approved,story.approval-state.json}` | ✅ 2026-09-21 推送前审查发现：`.gitignore` 补 `temp/*` + `!temp/.gitkeep`，并 `git rm --cached -r temp/prenatal-lullaby`（磁盘文件保留，仓库不再跟踪；该路径从未进入远程，故未被公开过）。**教训：审查公开范围要看 `git ls-files` 全集，不能只看本次 diff。** |
| C-14 | **新克隆的仓库自测不通过**（本机却全绿，故此前不可见）：`core.autocrlf=true` 在检出时把 LF 转 CRLF，使 `templates/catalog.json` 记录的 sha256 与实际字节不符；同时 `migrate-layout.test` 以 `data/` 分类目录为主源，而这些个人文件不入库，干净克隆报 `Migration source missing` | ✅ 已解决 | 实测于等价新克隆：`npm test` 36 项中 2 失败（`catalog-consistency.test.mjs:17`、`migrate-layout.test.mjs:11`） | ✅ 2026-09-21 修复：新增 `.gitattributes`（`* text=auto eol=lf` + 媒体 binary）固定行尾，`git add --renormalize .` 复核为**零改动**（索引本就是 LF，无大规模换行重排）；`migrate-layout.test` 改为探测五组 data 主源，缺失时带原因 skip。本机复验 36/36 通过、`--check` 通过 |
| C-15 | 2026-09-04 审查报告 P0-2 把"外部调用超时、重试、退避、原子落盘"记为已落地，**实际只对图片调用实现**（`fetchWithRetry` + `writeAtomically`）；TTS 一条 `NoAudioReceived` 就让整个 `tts` 阶段失败，无重试。⚠️ 我 2026-09-21 做全仓核查时把该行标注成 ✅ 已实现，属漏查——只核对了图片侧 | ✅ 已解决 | `generate-edge-tts.py` 原 save 段 ↔ `docs/history/project-improvement-report-2026-09-04.md` P0-2 与顶部状态表；2026-09-21 真跑复现（第 2 镜失败，续跑第 2 次成功） | ✅ 新增 `scripts/tts_retry.py`（逐次新建连接、指数退避 1s/2s/4s、失败删半成品、`EDGE_TTS_MAX_RETRIES` 默认 3）并接入 `generate-edge-tts.py`。回归 `test/tts-retry.test.mjs` 先跑 RED 再跑 GREEN，并做**变异验证**（去掉退避即红、还原即绿）确认真的会咬人；真实 TTS 通路复跑 2 镜头 5.4s 成功、时长与交付片一致。报告顶部状态表已改为 🟡 并注明漏查 |
| C-16 | 加 CI 时暴露两个依赖管理缺陷：① `package-lock.json` 与 `package.json` **不同步**，缺 `@remotion/compositor-darwin-x64`，`npm ci` 在 Linux/macOS 上直接 EUSAGE 失败（本机是 Windows、一直用 `npm install`，所以看不见）；② lockfile 中 241 条 `resolved` 全部指向本机配置的私人镜像 `registry.npmmirror.com`，等于把个人网络环境钉进公开仓库 | ✅ 已解决 | `app/create-video/package-lock.json`；首次复现于等价新克隆执行 `npm ci` | ✅ `npm install --package-lock-only` 补齐平台条目（仅 +1 包，7 个平台 compositor 齐全），`resolved` 全量改回 `registry.npmjs.org`。验证：干净克隆在无 `PYTHON_BIN`/`AGNES_API_KEY` 下 `npm ci` → `typecheck` → `npm test` 三步全过（2 项按设计 skip）；改官方源后重跑 `npm ci` 实装 197 包、无 integrity 报错 |
| C-17 | `runtime-tools` 的两条用例把 Windows 行为写死（反斜杠正则、假设存在 `py -3` 启动器），只在开发机上绿，Linux CI 首次运行即 2 项失败 | ✅ 已解决 | `test/runtime-tools.test.mjs` 首跑日志 `not ok 10`、`not ok 12`（`expected` 反斜杠模式 vs `actual: C:/venvs/dsp/bin/python`） | ✅ `listPythonCandidates` / `venvCandidate` / `resolvePython` 增加可注入 `platform`（默认 `process.platform`），用例改为**同时断言 win32 与 POSIX 两条分支**，覆盖强于原状。变异验证：把平台判断改死 → 立刻 1 红；还原 → 7/7 绿 |

## 8. 变更日志

| 日期 | 变更 | 责任人 |
|---|---|---|
| 2026-09-01 | 建立总纲与 SSOT 表，统一代码/数据/任务/输出边界 | Ybond |
| 2026-09-02 | 固化项目级视频生成入口硬规则 | Ybond |
| 2026-09-04 | 全仓评审，输出 P0/P1 改进项 | Ybond |
| 2026-09-07 | P0/P1、E0/E1、A–D 阶段实施概览并入文档 | Ybond |
| 2026-09-21 | 以代码为准做全量文档一致性核对：新增 §2.5 镜像方向、§2.6 单阶段命令边界、§2.3 Provider 事实与代码行号依据、§2.4 环境解析规则、§4 文档状态与权威度、§5 同步映射表、§7 冲突登记（C-01～C-11）、§8 变更日志；修正 `npm run start` 失效指引、`build:story` 误用、Base64 未实现、`data/` 忽略范围、过期测试数字、roadmap 缺口清单时点，并把根目录 6 份快照登记进 §4.2。核对期间本项目 HEAD 前进至 `bb3f710`（移除硬编码 Python 路径），§2.4 与 C-11 已按新实现记录。此提交（`35df6e2`）只改文档 | Qoder 代理 |
| 2026-09-21 | 用户就 C-01 拍板「改代码让分类目录成为写入权威」（`3b9cf02`）：`migrate-layout.mjs` 交换 5 组 data 映射方向（templates 半区保持不动并写明理由），`data/operations/tasks.md` 独有的 2026-09-08 记录以较新版本覆盖根副本；补 `import.meta.url` 守卫消除 import 副作用（C-10），`migrate-layout.test.mjs` 的 targets 列表改为真实副本路径。`npm test` 由 35/37 恢复为 **36/36 全通过**，`mirror` 与 `--check` 通过。§2.4/§2.5/§7 与 README、CLAUDE、workflow、architecture、data-template-boundary、story-workflow、overview-final 的写入口径同步反转。改动前已备份 `data/` 双侧文件与 layout-map 至 `C:\Users\ybd06\temp\dsp-data-backup-20260921` | Qoder 代理 |
| 2026-09-21 | **文档结构重组**：除根级 `README.md` 与 `CLAUDE.md` 外全部文档迁入 `docs/` 并按作用分区（`design/`、`guides/`、`roadmap/`、`adr/`、`history/`），本总纲与新增的 `docs/CHANGELOG.md` 置于 `docs/` 顶层；`AGENT_STORY_WORKFLOW.md` 更名 `docs/design/story-workflow.md`，四份 overview 与两份 report 归档进 `docs/history/` 并带日期；新增 4 条 ADR 与 `CHANGELOG`，把散落各处的"更新内容"与"取舍依据"收敛到单一入口；脚本化重写全部跨文档链接（幂等复跑零改动），链接解析器全量校验无断链。§1 结构表、§4 文档地图、§4.4 放置规则、§5 同步映射同步更新 | Qoder 代理 |
| 2026-09-21 | **重组后增量复核**（登记 C-12）：复跑治理发现"为纠正旧数字而写的快照顶部修订注记"自身已成新的漂移源——四处注记钉了 `37 项` / `100 个文件`，与 §2.4 实测及真实 `git ls-files` 均不符。`overview-p0-p1-workflow`、`overview-e0-e1-a-d`、两份 `project-improvement-report*` 的注记与 §1 一律改为指向 §2.4 或实时命令、不再复述数值；§5 禁止清单补入「修订注记只写指针」这条规则。本轮只改文档，未触碰代码 | Qoder 代理 |
| 2026-09-21 | **新克隆自测修复**（登记 C-14）：新增 `.gitattributes` 固定 `eol=lf`（autocrlf 检出 CRLF 会破坏 catalog 的 sha256），布局镜像用例在缺 `data/` 个人主源时带原因 skip；`git add --renormalize .` 复核为零改动。明细见 `docs/CHANGELOG.md`。**今后逐轮变更明细只写 `docs/CHANGELOG.md`，本表只保留里程碑级条目，不再逐条膨胀** | Qoder 代理 |
