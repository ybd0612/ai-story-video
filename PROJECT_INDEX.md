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
| `docs/` | 项目架构、工作流、隐私和维护文档 | 提交 |
| `templates/` | 可复用模板：`workflows/`、`style/`、`voice/`、`platform/`、`policy/` 及根 `title/script` 模板 | 提交（`templates/story/` 为本机镜像产物，忽略） |
| `.claude/` | 本地 Agent 规则和技能 | 忽略 |
| `.neuralmemory/` | 本地记忆数据 | 忽略 |
| `.workbuddy/` | WorkBuddy 的项目状态和开发工具记忆，不属于 DSP 创作记忆 | 忽略 |
| `temp/` | 草稿与中间暂存 | 忽略 |

Git 当前跟踪 100 个文件（`git ls-files | wc -l`）；`data/` 与 `templates/story/` 的多数内容是本机运行时文件，不入版本库。

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
| 镜头时长 | ffprobe 实测音频时长 + 0.5 秒余量 | `validate-audio-duration.mjs` |
| 渲染 Provider | `remotion` → `scripts/render-video.mjs` | `providers/default-providers.mjs` |

### 2.4 运行时依赖与环境解析

| 事实 | 权威值 |
|---|---|
| API Key | 环境变量 `AGNES_API_KEY`，禁止写入任何文件与 Git |
| Python 解析 | 统一由 `scripts/runtime-tools.mjs` 负责（`doctor.mjs`、`pipeline.mjs`、`run-edge-tts.mjs` 共用）。设置 `PYTHON_BIN` 时**只用它且不回退**，不可用即报 `PYTHON_BIN_UNUSABLE`；未设置时按 `VIRTUAL_ENV` 解释器 → `py -3`（Windows）→ `python` → `python3` 依次探测，且要求能成功 `import edge_tts`，全部失败报 `PYTHON_RUNTIME_NOT_FOUND`。探测超时 `PYTHON_PROBE_TIMEOUT_MS`，默认 15000 |
| ffprobe 默认 | `FFPROBE_BIN`，缺省 `ffprobe`（依赖 PATH） |
| 阶段顺序 | `validate → images → tts → audio-validation → prepare → render → deliver`（`task-state.mjs` `STAGE_ORDER`） |
| 测试基线 | `npm test` 共 37 项；2026-09-21 实测 35 通过、2 失败，两个失败同源（`Migration target differs: data/operations/tasks.md`），见 §7 C-01 |

### 2.5 `data/` 与 `templates/` 镜像口径（易错，务必照此执行）

`scripts/migrate-layout.mjs` 的 `MAPPINGS` 定义了**唯一允许的同步方向**：左侧是主源（source），右侧是必须字节一致的镜像副本（target）。

| 主源（写入这里） | 镜像副本（由 `mirror` 生成，禁止单独编辑） |
|---|---|
| `data/profile.md` | `data/context/profile.md` |
| `data/preferences.md` | `data/context/preferences.md` |
| `data/knowledge.md` | `data/knowledge/legacy.md` |
| `data/history.md` | `data/analytics/history.md` |
| `data/tasks.md` | `data/operations/tasks.md` |
| `templates/title-template.md` | `templates/story/title-template.md` |
| `templates/script-template.md` | `templates/story/script-template.md` |

强制规则：

1. 更新上述任一内容，**只写主源**；
2. 写完立刻在 `app/create-video/` 执行 `node scripts/migrate-layout.mjs mirror` 重新生成镜像并刷新 `data/.migration/layout-map.json`；
3. 只改镜像副本会触发 `Migration target differs` 并让 `node scripts/migrate-layout.mjs --check` 与 `npm test` 失败；
4. 分类目录中的 `context/`、`knowledge/`、`analytics/`、`operations/` 路径仍是 Agent 读取上下文的推荐入口（内容等价，任选其一读取）；写入一律走主源。

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
反馈与记录写 data/ 主源，再执行 migrate-layout mirror 同步镜像
```

## 4. 文档地图

状态：🟢 与代码一致 ｜ 🟡 部分过期（结论仍有效）｜ 🔴 已被代码推翻（仅作历史留存）

### 4.1 专属项目文档

| 文档 | 管什么 | 状态 | 权威度 |
|---|---|---|---|
| `README.md` | 仓库入口、目录原则、运行方式 | 🟢 | 导航，事实引用本总纲 |
| `PROJECT_INDEX.md` | 本文件：结构、SSOT、同步铁律、冲突登记 | 🟢 | **最高（SSOT）** |
| `CLAUDE.md` | Agent 创作与读取行为规则 | 🟢 | 行为规范，路径引用本总纲 |
| `docs/architecture.md` | 分层架构与目录边界 | 🟢 | 设计说明 |
| `docs/workflow.md` | 单次任务生成流程 | 🟢 | 设计说明 |
| `docs/data-and-privacy.md` | 隐私与 Git 边界 | 🟢 | 隐私说明 |
| `docs/maintenance.md` | 变更检查、排查、体积维护 | 🟢 | 操作手册 |
| `docs/data-template-boundary.md` | data/templates 分层方案 | 🟡 | 方案文档：A–C 为设计时点描述，落地口径见 §2.5 |
| `docs/workflow-roadmap-openmontage.md` | 与 OpenMontage 对比、P0/P1 方案 | 🟡 | 方案文档：§9 结果数字为实施时点 |
| `docs/enterprise-roadmap.md` | E0–E3 演进路线图 | 🟡 | 路线图：§3 缺口清单已被 E0 实现，见该节标注 |
| `app/create-video/README.md` | 视频子项目说明 | 🟢 | 操作手册 |
| `app/create-video/AGENT_STORY_WORKFLOW.md` | 故事工作流、Provider 参数、环境变量 | 🟢 | 操作手册，代码级细节最贴近实现 |
| `templates/README.md` | 模板分类与 A–D 阶段 | 🟢 | 导航 |

### 4.2 时点快照（评审与交付记录，不再更新）

以下 6 份是某一轮工作的完成记录，**只保留历史，不作为当前事实来源**；其中数字与代码现状不符，引用前先看本总纲。

| 文档 | 记录时点 | 状态 |
|---|---|---|
| `overview-final.md` | E0/E1 与 A–D 交付 | 🔴 测试数与「新目录为 SSOT」结论已被代码推翻 |
| `overview.md` | P0/P1 工作流实施 | 🔴 测试数过期 |
| `overview-data-template.md` | data/templates 分层评审 | 🟡 结论有效，落地口径见 §2.5 |
| `overview-enterprise-review.md` | 企业级评审 | 🟡 优先级仍有效 |
| `project-improvement-report.md` | 2026-09-04 全面审查 | 🔴 「无 npm test」「42 个跟踪文件」等现状描述已过期 |
| `project-improvement-report-phase2.md` | 第二阶段记录 | 🔴 测试数过期 |

### 4.3 阅读路径

- 新人上手：`README.md` → `docs/architecture.md` → `docs/workflow.md` → `app/create-video/README.md`
- 改生成代码：`PROJECT_INDEX.md` §2 → `app/create-video/AGENT_STORY_WORKFLOW.md` → `docs/maintenance.md` → 对应 `docs/*-roadmap*.md`
- 改数据/模板目录：`PROJECT_INDEX.md` §2.5 → `docs/data-template-boundary.md` → `templates/README.md`
- 发布/交付核对：`docs/workflow.md` → `docs/data-and-privacy.md`

## 5. 同步铁律

总原则：**代码、决策或事实变更 ⇒ 同一次工作内同步文档，不留「以后再改」。**

| 你改了什么 | 必须同步 |
|---|---|
| `package.json` scripts / 新增环境变量 | 本总纲 §2.2、`CLAUDE.md` 标准命令、`AGENT_STORY_WORKFLOW.md`、`README.md` 运行段 |
| 阶段顺序、状态模型、契约 | `docs/workflow.md`、`AGENT_STORY_WORKFLOW.md` 标准流程、`docs/workflow-roadmap-openmontage.md` §9 |
| Provider / 模型 / 限额 / 默认档位 | 本总纲 §2.3、`AGENT_STORY_WORKFLOW.md` 对应章节、`templates/catalog.json` hash |
| 目录与路径边界 | 本总纲 §1 与 §2.5、`README.md` 目录原则、`docs/architecture.md`、`docs/data-and-privacy.md`、`templates/README.md`、`.gitignore` |
| `data/` 或根模板内容 | 只改主源，执行 `migrate-layout.mjs mirror`（§2.5） |
| `templates/` 任何被 catalog 收录的文件 | `templates/catalog.json` 的 path/sha256，然后 `node scripts/migrate-layout.mjs --check` |
| 一轮方案实施完成 | 对应 roadmap 文档的状态标记 + §4 状态列 + 新增一份时点快照并登记进 §4.2 |

必做 4 步：① 先改本总纲 §2；② `grep` 全仓扫旧值残留（含根 README 与快照文档）；③ 更新受影响文档头部状态标记与 §4 状态列；④ 在 §7 登记未解决冲突、在 §8 追加变更日志。

禁止：在其它文档复述 §2 的数值与路径；用「待统一更正」让不一致过夜；未跑代码核实就写命令、路径或测试数字；改完代码不改文档。

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
| C-01 | 文档称「分类目录是 SSOT，旧根文件只读不再写入」，代码却把根文件定义为 mirror **source**、镜像必须字节一致 | 🔴 | 起源：提交 `af46bfc`（align D writes）把 `CLAUDE.md` 规则 7 改成写分类目录 ↔ `migrate-layout.mjs:8-15,32,54` 仍固定根文件为主源 | ✅ **2026-09-21 按用户指示「以代码为准」裁定**：文档统一为 §2.5（读分类、写主源、写完 mirror）。遗留故障仍待处理：2026-09-08 有一条任务记录只写进了镜像 `data/operations/tasks.md`，触发 `Migration target differs`，使 `npm test` 2 项失败。恢复：把该行并回主源 `data/tasks.md` 后执行 `node scripts/migrate-layout.mjs mirror`（涉及个人运行时数据，需用户确认）。替代方案：若更想保留 `af46bfc` 的原意图（分类目录为写入权威），则应反转 `MAPPINGS` 的方向并同步修订 §2.5——属代码改动，未在本次授权内 |
| C-02 | 文档记录 `npm run start`（Remotion Studio 预览），但 `package.json` 无此脚本，且总纲已声明该入口已移除 | 🔴 | `AGENT_STORY_WORKFLOW.md` 本地开发段 ↔ `package.json:5-21`、`docs/maintenance.md:38` | ✅ 已删除该指引，并说明无网页预览入口 |
| C-03 | 文档把 `npm run build:story` 当独立可用命令且声称输出进任务目录，实际缺省输入 `src/story/sampleStory.json` 不存在、缺省输出 `./out/` | 🔴 | `AGENT_STORY_WORKFLOW.md` 渲染段、`CLAUDE.md` 标准命令 ↔ `render-video.mjs:11,23` | ✅ 已在 §2.6 与各文档标注为流水线内部命令 |
| C-04 | 测试数字四处不一致：7/7、26/26、5 项、「没有 npm test」 | 🟡 | `overview.md`、`overview-final.md`、`project-improvement-report*.md`、`docs/workflow-roadmap-openmontage.md:379` | ✅ 快照文档标 🔴 并加时点说明；权威数字统一到 §2.4（15 个测试文件、37 项，实测 35 通过 2 失败） |
| C-05 | `docs/data-and-privacy.md` 称整个 `data/` 不进 Git，实际 `data/memory/` 两份文件已提交 | 🟡 | `docs/data-and-privacy.md:9` ↔ `.gitignore:2-6`、`git ls-files` | ✅ 已补例外说明 |
| C-06 | `docs/data-template-boundary.md` §5 把「CLAUDE.md 当前要求读取 `data/profile.md` 等根文件」当作现状描述；§7 迁移策略只写到 C 阶段 | 🟡 | 该文件 §5、§7 ↔ `CLAUDE.md` 规则 1 | ✅ 已标注为设计时点，并补 D 阶段与 §2.5 实际方向 |
| C-07 | `docs/enterprise-roadmap.md` §3 列的 4 条「当前代码缺口」已被 E0 实现（状态迁移、快照唯一输入、契约闭环） | 🟡 | 该文件 §3 ↔ `task-state-migrations.mjs`、`pipeline.mjs:58,79` | ✅ 已加时点与实现状态标注 |
| C-08 | 文档称 Agnes 支持 Base64 输出（`return_base64` / `data[0].b64_json`），代码只实现 URL | 🟡 | `AGENT_STORY_WORKFLOW.md` Agnes 段 ↔ `generate-story-images.mjs:107-116` | ✅ 已标注为未实现 |
| C-09 | 根目录 6 份快照文档未登记在 `README.md` 与总纲文档地图中，导致同一事实多版本并存 | 🟡 | 根 `overview*.md`、`project-improvement-report*.md` | ✅ 已登记 §4.2 并加顶部时点警示 |
| C-10 | `migrate-layout.mjs` 在文件底部直接执行 CLI，任何 `import` 它的测试都会连带跑一次 `mirror()`，使数据漂移放大为测试失败 | ⬜ 待拍板 | `migrate-layout.mjs:76-81`；受影响 `test/catalog-consistency.test.mjs:5` | ⬜ 属代码改动，超出本次文档整理授权。建议加 `import.meta.url` 守卫 |
| C-11 | 生成链路曾把某台机器的 WorkBuddy Python 绝对路径写死在 `doctor.mjs`、`pipeline.mjs`、`run-edge-tts.mjs`，换环境即断链；文档原先也未记录该依赖 | ✅ 已解决 | 提交 `bb3f710` 新增 `scripts/runtime-tools.mjs` 统一解析（含 `runtime-tools.test.mjs`） | ✅ 硬编码路径已移除，解析规则写入 §2.4。本机仍需注意：PATH 上的 Python 未装 `edge_tts`，跑 `doctor`/`make:video` 前要设置 `PYTHON_BIN`，否则三项候选全报 ModuleNotFound 并以 exit=1 结束（刻意的诚实失败，非回归） |

## 8. 变更日志

| 日期 | 变更 | 责任人 |
|---|---|---|
| 2026-09-01 | 建立总纲与 SSOT 表，统一代码/数据/任务/输出边界 | Ybond |
| 2026-09-02 | 固化项目级视频生成入口硬规则 | Ybond |
| 2026-09-04 | 全仓评审，输出 P0/P1 改进项 | Ybond |
| 2026-09-07 | P0/P1、E0/E1、A–D 阶段实施概览并入文档 | Ybond |
| 2026-09-21 | 以代码为准做全量文档一致性核对：新增 §2.5 镜像主源方向、§2.6 单阶段命令边界、§2.3 Provider 事实与代码行号依据、§2.4 环境解析规则、§4 文档状态与权威度、§5 同步映射表、§7 冲突登记（C-01～C-11）、§8 变更日志；修正 `npm run start` 失效指引、`build:story` 误用、Base64 未实现、`data/` 忽略范围、过期测试数字、roadmap 缺口清单时点、根 6 份快照文档登记。同日本项目 HEAD 前进至 `bb3f710`（移除硬编码 Python 绝对路径），§2.4 与 C-11 已按新实现记录。**本次仅改文档**：未修改任何代码，未改写 `data/` 下运行时数据（C-01 遗留的镜像漂移待用户确认后再并回主源） | Qoder 代理 |
