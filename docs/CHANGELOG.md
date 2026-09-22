# 更新记录

> 本文档隶属 [项目总纲](PROJECT_INDEX.md)。
>
> 约定：所有面向结果的变更（功能、行为、口径、目录）按日期倒序在此追加一条，一次交付一行结论。
> 某轮工作的完整交付概览与评审报告归档在 [docs/history/](history/)，它们是时点快照、不再更新；
> 其结论一旦变化，本文件必须先更新，历史快照只加顶部警示。

## 2026-09-22

### 金句规范落到创作入口（警告不阻断）

- 用真实数据复核渲染层的抑制逻辑时发现：那份 7 镜头故事里 **5 镜的 `subtitle` 只是旁白原句或改写**（"你还没有名字，也没见过光。""别怕，我在这儿。""欢迎你，我们等了你好久。"直接抄自旁白），只有 2 镜是独立金句。也就是说"金句"功能在真实产出中基本静默失效，而渲染层抑制只是把症状藏了起来。
- 按方案 A 在源头加非阻断检查：`scene-plan.ts` 抽出 `goldenLineOverlap()` 与 `findDuplicateGoldenLines()`，`save:story` 对重合度 ≥ 60% 的镜头打印警告但照常保存；创作规范补进 `CLAUDE.md` 规则 5 与 `docs/design/story-workflow.md` 第 8 条。
- 顺带消除 `save:story` 因 `import` `.ts` 触发的 `MODULE_TYPELESS_PACKAGE_JSON` 警告（脚本加 `--disable-warning`），输出恢复干净。
- 新增 1 条回归测试覆盖"只列复述、不误伤真金句"，`test/scene-plan.test.mjs` 现 8 项全过。

### 撤回一条站不住的耗时结论

- 前一天我在 ADR-0005、总纲 §2.4 与 CHANGELOG 里写了"全片渲染 123 秒，优于旧版 133.7 秒"。复测得到 **154 秒**（同版本、无并发任务），而 123 秒那次也是同版本——说明**本机全片单次测量波动约 ±25%**，旧版的 133.7 秒同样只是单点样本。
- 结论修正为：**不再引用全片单点耗时**，性能判断只用定帧对照口径（300 帧：无氛围层 22s、优化后 26s、优化前 63s），该口径下"优化有效"依然成立，但"比旧版更快"不成立，已删除。
- 教训：写进权威文档的性能数字必须标明测量口径与波动，单点值不足以支撑"优于"这种比较性结论。

### 统一 Node 运行时版本为 24

- 此前仓库对 Node 版本**没有任何约束**：无 `engines`、无 `.nvmrc`/`.node-version`，而 CI 跑 22.x 与 24.x 双矩阵，与"统一用 24"的约定不一致。
- 落地：新增根 `.node-version` = `24`；`app/create-video/package.json` 加 `engines.node` = `>=24`；CI 去掉矩阵，改用 `node-version-file: .node-version` 读同一份声明。
- 下限取 24 的依据：测试用 `node --test` 并直接 `import` `.ts`，依赖默认开启的类型剥离（Node 22.18+/23.6+ 才有），22.x 属于"恰好最新小版本才过"，不适合作为支持面。
- 总纲 §2.4 新增"运行时版本"口径行，并在 CI 行注明 `cancel-in-progress` 的语义（连续推送时只有最新提交被验证）；README 运行要求同步。

## 2026-09-21

### 呈现层改造（交叉溶解 + 逐句字幕 + 缓动运镜 + 氛围层）

- 修掉一个一直存在的硬伤：旧版每镜自行淡入淡出，导致每个切点压到近黑。同一素材 6 个切点的最低平均亮度 `YAVG` 由 20.5–21.6 提升到 97.6–110.1，闪黑消失。
- 新增 `src/lib/scene-plan.ts`：时间轴数学（画面窗口重叠、音频绝对锚点、旁白分句与时间窗）抽成纯函数；`StoryVideo` 只摆 `Sequence` 并把 `Audio` 放在绝对帧，转场因此不会拖动声音。
- `StoryScene` 重写：五组方向轮换的 Ken Burns（`Easing.bezier(breathe)`）、标题 `spring` 入场、旁白按句上屏（不再整段糊屏）、叠加 `AtmosphereLayer`（噪声驱动尘埃 + 静态光感 + 暗角）。`theme.ts` 中此前定义了却零引用的 `SPRING` / `EASING_BEZIER` 正式接入。
- 性能归因：首版 300 帧 63s（基线 22s）。逐项关闭法定位为"全屏渐变做 transform + 微粒用 left/top 定位"叠加触发整层重光栅化（关任一成分即回到 21–23s）。改为静态渐变的透明度呼吸 + 微粒 `translate3d` 后 300 帧 26s。约束写入 [ADR-0005](adr/0005-atmosphere-render-cost.md)，总纲 §2.4 新增定帧测量基线。
- 新增 6 项不变量测试并做变异验证（音频偏移写死立即红 2 项、取消交叉夹紧立即红 1 项）。
- 同素材 A/B：时长完全一致（59.925333s），体积 42.08 MB 对旧版 42.21 MB。
- **抽帧复查发现并修复一处同屏重复**：多个镜头的 `subtitle` 本身就是旁白原句或其语序复述，导致字幕区上下两行显示同一句话。新增 `shouldShowGoldenLine()`——金句与旁白去标点后字符重合度 ≥ 0.6 判定为复述并抑制，独立金句保留；4 条用例直接取自该 job 的真实镜头数据，先跑 RED 再实现。数据源头是否要在 `story.schema.json` 与创作约束里禁止"`subtitle` 与旁白重叠"仍待决定，当前只在渲染层兜底。

### 最小 CI（并借此暴露 C-16 两个依赖缺陷）

- 新增 `.github/workflows/ci.yml`：push/PR 上跑 `npm ci` → `npm run typecheck` → `npm test`，Node 矩阵 22.x / 24.x（ubuntu-latest），带并发取消与 npm 缓存。不装 ffmpeg 与 `edge_tts`——测试不依赖外部程序，依赖个人 `data/` 或 Python 的用例按设计 skip。
- **C-16 ①**：`package-lock.json` 与 `package.json` 不同步，缺 `@remotion/compositor-darwin-x64`，`npm ci` 在非 Windows 上直接失败；本机一直用 `npm install` 所以从未暴露。已用 `npm install --package-lock-only` 补齐（仅 +1 包）。
- **C-16 ②**：lockfile 里 241 条 `resolved` 全部指向本机配置的 `registry.npmmirror.com`，会把个人网络环境钉进公开仓库。已全部改回 `registry.npmjs.org`。
- 验证（不是推测）：在等价干净克隆、不带 `PYTHON_BIN`/`AGNES_API_KEY` 的条件下，`npm ci` → `typecheck` → `npm test` 三步全过（2 项 skip、0 fail）；改用官方源后本机重跑 `npm ci` 实装 197 个包、无 integrity 报错。
- **CI 立刻抓到一条只在 Windows 绿的测试**（登记 C-17）：`runtime-tools` 两条用例把 Windows 行为写死（反斜杠正则、假设存在 `py -3` 启动器），Linux 上 `not ok 10 / 12`。修法不是放宽断言，而是给 `listPythonCandidates` / `resolvePython` 增加可注入 `platform`，用例改为同时断言 win32 与 POSIX 两条分支；并做变异验证（改死平台判断即红、还原即绿）。
- 同步：README 快速开始改为 `npm ci`、状态一节写明 CI 覆盖与 skip 语义；总纲 §2.4 新增 CI 口径行、§5 新增"改依赖必须同步 lock 与 CI"、§7 登记 C-16 与 C-17；维护指南补 lockfile 校验要求。

### 旁白合成加入逐镜头重试（登记 C-15）

- 真跑端到端时复现：`tts` 阶段因微软端点对第 2 个镜头返回 `NoAudioReceived` 而整阶段失败，`RESUME=1` 续跑一次即成功——图片阶段被正确跳过，没有二次消耗已付费的 2 张图。定位过程中排除两个非因：系统时钟零偏移、端点可达（400/0.12s）。
- 新增 `scripts/tts_retry.py`：每次重试重新构造 `Communicate`（避免复用过期会话凭据）、1s/2s/4s 指数退避、失败即删除半成品，`EDGE_TTS_MAX_RETRIES` 默认 3；已接入 `scripts/generate-edge-tts.py`。
- 回归 `test/tts-retry.test.mjs` 走完整 TDD：先跑 RED（模块缺失即失败）→ 实现后 GREEN → **变异验证**（去掉指数退避后测试立即变红并指出 `delays` 断言）确认这条测试真会咬人。自测不依赖网络与 `edge_tts`，找不到 Python 时按原因 skip。
- 真实通路复验：重构后跑 2 镜头旁白 5.4s 完成，音频时长与已交付成片完全一致（6.936s / 7.728s）。
- 更正一处我自己的误标：2026-09-04 报告 P0-2"外部调用重试"此前被我在全仓核查中标为 ✅ 已实现，实际只有图片侧做了；历史快照顶部状态表已降为 🟡 分侧完成并说明漏查。

### 新克隆自测修复（登记 C-14）

- 用等价新克隆复现：`npm test` 36 项中 2 项失败，而本机全绿，所以此前完全不可见。
- 根因一：`core.autocrlf=true` 检出时把 LF 转成 CRLF，字节变化导致 `templates/catalog.json` 钉的 sha256 对不上，catalog 一致性用例在任何 Windows 克隆上必红。修复：新增 `.gitattributes` 固定 `* text=auto eol=lf`（媒体与字体标 binary），并复核 `git add --renormalize .` 为零改动——索引本就是 LF，不产生大规模换行重排。
- 根因二：布局镜像用例以 `data/` 分类目录为主源，而这些个人文件按设计不入库，干净克隆报 `Migration source missing`。修复：先探测五组主源，缺失时带明确原因 skip，而不是当失败。
- 文档同步：总纲 §2.4 新增行尾与指纹稳定性口径、README 状态一节说明新克隆可跑与 skip 语义、维护指南新增「新克隆注意」。

### 推送前安全审查（登记 C-13）

- 审查公开范围时发现：总纲 §1 声明 `temp/` 不入库，但 `.gitignore` 从未有过该条目，`temp/prenatal-lullaby/` 下 4 份个人题材故事草稿处于**已跟踪**状态，推送即公开。
- 处置：`.gitignore` 补 `temp/*` 与 `!temp/.gitkeep`，`git rm --cached -r temp/prenatal-lullaby` 取消跟踪（磁盘文件完整保留）。该路径从未进入远程，因此没有发生过泄露。
- 同时确认：`.env` 与 `data/` 个人上下文均未跟踪；`data/memory/style-preferences.json` 只含通用题材规则；`edge-tts-adapter.mjs` 里的 GUID 是 Edge TTS 协议的公开常量、并非账号凭据。
- 教训已写入总纲 §7：**审查公开范围要看 `git ls-files` 全集，不能只看本次 diff。**

### README 改写为开源门面

- 原 `README.md` 是内部作业说明（目录原则 + 流程 + 运行 + 大张导航表），对第一次接触项目的人没有介绍价值。重写为开源门面：一句定位与动机开头，随后是特性清单（审核指纹门禁、任务级隔离、断点续跑与镜头补偿、阶段产物契约、音频驱动节奏、可审计、输入快照不可变）、快速开始、文字版流水线、逐字取自仓库的真实输入示例、设计取舍指针、运行要求、状态与已知边界、许可与 AI 生成内容声明。
- 示例 JSON 与字段清单按 `story.schema.json` 与 `src/story/sampleStory.ts` 实测核对，个人题材内容不出现在门面文档中。
- 新增根目录 `LICENSE`（MIT）。
- 详细导航表从 README 收进本总纲 §4，README 只保留精简"文档"一节；总纲 §4.4 放置规则同步改为「README 介绍优先、导航精简、完整文档地图归总纲维护」，并注明 LICENSE 等非 Markdown 法律文本允许留在根。

### 文档结构与口径治理

- **文档分类**：除项目根的 `README.md`（门户）与 `CLAUDE.md`（Agent 入口）外，全部文档收进 `docs/` 并按作用分区——`design/` 设计与架构、`guides/` 操作指南、`roadmap/` 演进路线、`adr/` 决策记录、`history/` 时点快照；本文件与 [项目总纲](PROJECT_INDEX.md) 置于 `docs/` 顶层。跨文档链接全量重写并验证无断链。
- **口径统一**（`35df6e2`）：以可执行代码为唯一权威核对全仓文档，修正 11 项漂移——删除不存在的 `npm run start` 指引、标注 `build:story`/`render:video` 只能由流水线注入变量后使用、`data/` 忽略范围补 `memory/` 例外、Agnes Base64 输出标注未实现、四处互相矛盾的测试数字收敛到一个基线、`roadmap/enterprise` 四条"当前缺口"标注为 E0 已实现。总纲新增 SSOT 细则、文档状态与权威度表、冲突登记、变更日志。
- **决策记录落地**：新增 [adr/](adr/)，把散在方案文档里的重大取舍写成可追溯的决策记录。
- **重组后增量复核**（登记 C-12）：复跑治理发现一个新暴露的漂移层——上一轮"为纠正旧数字而写的快照顶部修订注记"自己钉上了 `37 项` / `100 个文件`，代码继续推进后注记比正文过期得更快。四处注记与总纲 §1 一律改成指向 §2.4 或实时命令（`git ls-files | wc -l`），不再复述数值；并把「修订注记只写指针、不写数值」写进总纲 §5 禁止清单。实测复核基线：15 个测试文件 36 项全通过。

### 修复

- `3b9cf02` **`data/` 镜像写入方向反转**：`migrate-layout.mjs` 的 5 组 data 映射交换 source/target，分类目录（`context/`、`knowledge/`、`analytics/`、`operations/`）成为写入主源，`data/` 根同名文件降级为自动生成的兼容副本；`templates/` 半区保持根模板为权威（`catalog.json` 钉 sha256、`.gitignore` 已排除副本）。同时给底部 CLI 派发加 `import.meta.url` 守卫，`import` 该模块不再连带执行 `mirror()`。`npm test` 由 35/37 恢复为 **36/36 全通过**。详见 [ADR-0002](adr/0002-data-templates-mirror-direction.md)。
- `bb3f710` **Python 解释器解析收敛为单一入口**：移除三处硬编码的个人机器绝对路径，改由 `scripts/runtime-tools.mjs` 统一解析，`PYTHON_BIN` 显式优先且不静默回退。详见 [ADR-0004](adr/0004-python-runtime-resolution.md)。

## 2026-09-08

- `f6755b5` 修复流水线 TTS 阶段 Python 路径与 `doctor` 不一致导致 `edge_tts` 缺失；新增一分钟胎教故事草稿。交付 `jobs/20260908-062234-你在海里-听见光/` 与 `outputs/20260908-062234-你在海里-听见光/story-video.mp4`（7 镜头，成片 59.9s / 1080x1920）。
- 遗留：一条任务记录只写进了镜像副本，与当时的主源方向相反，成为上面 3b9cf02 要修的那处漂移。

## 2026-09-07

- `8c7bbbd` 接入项目创作记忆自动注入：`data/memory/style-preferences.json` 成为按题材匹配的项目风格规则，`save:story` 在草稿未填 `style` 时自动注入。
- **E0 执行一致性**（`acbb2bb`→`da7e413`）：任务输入与审核快照不可变并校验 hash、v1→v2 状态迁移与 migrationHistory、阶段契约强制闭环、JSONL 事件日志与密钥脱敏、`resume` 缺 `JOB_ID` 报错、状态损坏 fail-closed。
- **E1 可复用核心**（`d73cefb`→`ccee24a`、`2b1abec`）：Artifact Schema 分层、Workflow Manifest、模板 Catalog 带版本与 sha256、抖音竖屏 Platform Profile、最小 Provider descriptor、workflow/profile/catalog 固化进 job `input/refs/` 并在 resume 时检测篡改。
- **P0/P1 工作流**（`a04b26b`→`4322d18`、`0c1daf2`）：schema v2 状态与原子写入、阶段产物契约与受控路径、本地 `run.lock`、`JOB_ID + RESUME=1` 断点续跑、图片与 TTS 指定镜头补偿、`render`/`deliver` 纳入统一阶段状态。
- **A–D 分层迁移**（`0cf8e67`→`af46bfc`）：模板分类与按需上下文选择器、兼容镜像与 `layout-map`、source/target 与 catalog hash 一致性校验、镜像副本不入库。D 阶段当时只切换了读取路径，写入方向于 2026-09-21 补齐。
- 文档：新增 [roadmap/openmontage-comparison](roadmap/openmontage-comparison.md)、[roadmap/enterprise](roadmap/enterprise.md)、[design/data-template-boundary](design/data-template-boundary.md) 及四份交付概览（现归档于 [history/](history/)）。

## 2026-09-04

- `cc60fed`、`4591c3d` 增强流水线可靠性：音频时长校验参数传递修复，故事校验前移。
- `dcbe048` 任务故事隔离：Remotion 渲染改用 `--props` 接收当前任务故事，不再写共享 `src/story/currentStory.json`；`validateStory` 接收 `unknown` 并补齐重复镜头 ID 与时长校验；进入渲染前执行运行时校验。
- 输出首份全仓评审报告（现归档为 [history/project-improvement-report-2026-09-04](history/project-improvement-report-2026-09-04.md)），其 P0/P1 项在 09-07 两轮内基本落地，未落地项见该报告顶部的状态表。

## 2026-09-02

- `11d77fc`→`b27b81b` 项目骨架定型：代码归入 `app/create-video/` 唯一固定路径，用户数据、任务目录 `jobs/<时间戳>-<任务名>/` 与交付 `outputs/<job-id>/` 严格分离，建立项目级 `.gitignore`。
- 固化项目级生成入口硬规则：本项目视频一律走 `create-video` 流水线，不默认调用外部内置生成能力。

## 2026-09-01

- 旧版人体系统素材与场景配置清理；建立首版 [项目总纲](PROJECT_INDEX.md) 与 SSOT 表；移除 Remotion Studio 启动入口与未使用的 transitions 依赖，`app` 体积从约 741 MB 降至约 225 MB；初始化 Git。
