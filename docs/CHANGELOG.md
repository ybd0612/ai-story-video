# 更新记录

> 本文档隶属 [项目总纲](PROJECT_INDEX.md)。
>
> 约定：所有面向结果的变更（功能、行为、口径、目录）按日期倒序在此追加一条，一次交付一行结论。
> 某轮工作的完整交付概览与评审报告归档在 [docs/history/](history/)，它们是时点快照、不再更新；
> 其结论一旦变化，本文件必须先更新，历史快照只加顶部警示。

## 2026-09-21

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
