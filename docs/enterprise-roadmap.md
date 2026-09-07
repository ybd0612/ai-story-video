# DSP 企业级演进路线图

> 本文档隶属 [DSP 项目总纲](../PROJECT_INDEX.md)，关键路径和当前实现状态以总纲 SSOT 为准。
>
> 文档性质：架构评审与后续路线图，不代表本轮已实施。

## 1. 目标定义

如果 DSP 要从“个人可用的视频生成项目”演进为“稳定、可复用、可自定义的企业级 AI 视频工作流方案”，目标不是先做 Web 界面，而是建立下面四层能力：

```text
Agent 控制面
    ↓
声明式工作流与模板
    ↓
可靠执行引擎与 Provider 适配层
    ↓
任务、审计、成本、安全和质量治理
```

仍然保持当前原则：

- Agent 是主要控制面；
- 命令行和文件协议是第一执行入口；
- 不以可视化流程编辑器作为前置条件；
- Agnes → Edge TTS → Remotion 是默认 Provider 链路；
- 企业级能力通过配置、契约和治理增加，而不是把所有逻辑都塞进 Agent Prompt。

## 2. 当前已经具备的基础

| 能力 | 当前情况 |
|---|---|
| Agent-first 控制面 | 已具备，规则在 `CLAUDE.md` 和故事工作流文档中 |
| 结构化故事输入 | 已具备，`story.schema.json` |
| 单任务目录隔离 | 已具备，`jobs/<job-id>/` |
| 阶段状态和失败恢复 | 已具备，`task-state.mjs`、`pipeline.mjs` |
| 任务锁 | 已具备，本地 `run.lock` |
| 阶段产物契约 | 已具备，`stage-contracts.mjs` |
| 图片/TTS 镜头补偿 | 已具备，目标镜头参数 |
| 媒体有效性复用 | 已具备，图片和 TTS 的有效产物复用 |
| 交付 hash 校验 | 已具备 |
| 领域扩展能力 | 目前主要固定为故事短视频 |
| 多租户、权限、成本和审计 | 尚未形成企业级实现 |

## 3. 当前代码中需要优先修正的真实缺口

### 3.1 状态迁移并未真正完成

`task-state.mjs` 的 `readTaskState()` 当前遇到非当前版本会直接抛出 `Unsupported task state schema`。这意味着旧版状态文件不是“自动迁移”，而是“不支持读取”。

企业级要求：

- 支持 v1 → v2 的显式迁移器；
- 迁移前备份原状态；
- 迁移结果写入新版本；
- 旧 `completed` 不能直接当作可信完成，必须重新执行阶段契约；
- 迁移失败必须保留原文件并给出结构化错误；
- 每次状态升级记录 migration history。

### 3.2 命令执行输入仍存在“外部源”和任务副本不一致

`pipeline.mjs` 的 contexts 使用了 `jobs/<job-id>/input/story.source.json`，但 commands 中的 validate/images 仍将 `sourcePath` 作为脚本输入。

这会让“状态契约检查的输入”和“实际执行使用的输入”出现分离。企业级执行必须保证：

```text
状态记录的输入 = 实际执行的输入 = 任务目录中的不可变快照
```

建议：新任务初始化后，后续所有阶段只读取任务快照；原始外部路径只保存在 metadata 中。

### 3.3 故事 Schema 与阶段产物 Schema 尚未分层

`story.schema.json` 主要定义原始故事字段，但图片和音频阶段还会增加 `imagePath`、`audioPath` 等运行时字段。当前这些字段没有独立 schema。

建议拆分：

```text
StoryDraft        草稿
ApprovedStory     审核后的故事
ImageManifest     图片阶段产物
AudioManifest     配音阶段产物
PreparedStory     Remotion 输入
RenderReport      渲染报告
DeliveryManifest  交付记录
```

每个产物应带：

- `schemaVersion`；
- `jobId`；
- `storyFingerprint`；
- `producer`；
- `createdAt`；
- `artifacts`；
- `warnings`；
- `qualityChecks`。

### 3.4 阶段状态完成与阶段契约没有形成强制闭环

当前 `runStage()` 本身只要 action 不抛错就写 `completed`；契约校验主要由 pipeline 的跳过判断和部分阶段逻辑负责。

企业级执行器应当统一为：

```text
执行 action
  → 验证阶段契约
  → 记录产物清单和 hash
  → 验证通过后才写 completed
```

这样任意未来新增阶段都不会忘记质量门。

## 4. P0：企业级稳定性（必须先做）

### P0-1 不可变任务快照

- 任务创建时复制所有必要输入；
- 后续阶段禁止读取原始外部文件；
- 记录输入文件 hash；
- 任务中途外部源变化不影响当前任务；
- job 目录可独立归档和复现。

### P0-2 状态迁移和状态机严格化

- v1/v2/v3 显式迁移；
- 固定合法状态迁移表；
- 禁止 `completed → running` 的隐式覆盖；
- 状态和产物不一致时输出结构化诊断；
- 每次状态变更追加事件记录，不只覆盖 `status.json`。

### P0-3 原子产物和恢复一致性

当前状态文件已使用临时文件重命名，但阶段 marker、音频和部分 JSON 产物也应统一采用：

```text
写入临时文件 → fsync（可行时）→ rename → 更新状态
```

恢复顺序应为：

```text
读取状态 → 校验产物 → 修正可恢复状态 → 决定下一阶段
```

### P0-4 并发与锁治理

当前 `run.lock` 只解决单机单 job 并发。企业级版本还需要：

- 锁文件包含 pid、主机、开始时间、jobId；
- stale lock 检测和人工确认机制；
- 不自动删除未知进程留下的锁；
- 将来多机运行时改用数据库/Redis/对象存储锁，不能继续依赖本地文件锁。

### P0-5 真实可观测性

至少输出结构化 JSONL 事件：

```text
job_created
stage_started
provider_called
artifact_created
quality_check_passed
stage_failed
stage_retried
job_delivered
```

事件字段应包括：

- `eventId`；
- `jobId`；
- `stage`；
- `sceneId`；
- `provider`；
- `model`；
- `durationMs`；
- `attempt`；
- `cost`；
- `errorCode`。

禁止记录 API Key、完整 Authorization Header 和不必要的用户隐私内容。

## 5. P1：可复用能力

### P1-1 声明式工作流定义

当前阶段顺序硬编码在 `STAGE_ORDER` 和 `pipeline.mjs`。单一故事类型时可以接受，但企业复用需要把“流程定义”和“执行引擎”分离。

建议先采用轻量 YAML/JSON 配置，不急于做可视化：

```yaml
name: story-video
version: "1.0"
stages:
  - name: validate
    handler: validate-story
    approval: false
  - name: images
    handler: generate-images
    provider: agnes
    approval: false
  - name: tts
    handler: generate-tts
    provider: edge-tts
    approval: false
  - name: render
    handler: remotion
    approval: false
```

配置只描述：阶段、输入、输出、工具、门禁、重试和质量标准；创作决策仍由 Agent 结合模板完成。

### P1-2 模板与工作流参数分离

不要把客户定制写进脚本。建议分为：

```text
templates/
├─ workflow/       阶段和门禁
├─ story/          故事结构
├─ visual/         视觉风格
├─ voice/          旁白配置
├─ platform/       平台输出规格
└─ policy/         企业内容安全规则
```

每次任务记录实际使用的 template version，保证历史任务可复现。

### P1-3 Provider 适配层

当前 Provider 主要固定在图片 Agnes、TTS Edge TTS、渲染 Remotion。下一步不应直接把 Provider 判断散落在 pipeline 中，而应抽象最小契约：

```text
ImageProvider.generate(scene, options) -> Artifact
TtsProvider.synthesize(text, options) -> AudioArtifact
RenderProvider.render(story, assets, options) -> RenderArtifact
```

先实现现有 Provider 适配器，再考虑第二个 Provider。不要为了抽象而提前引入大量 selector。

Provider 契约必须包括：

- capability；
- model/version；
- dependency check；
- retry policy；
- timeout；
- rate limit；
- cost estimate；
- output schema；
- fallback 是否允许。

### P1-4 平台 Profile

将当前固定的竖屏 `9:16`、`1K`、字幕和视频时长约束提取成平台配置：

```text
wechat-mini-program
抖音短视频
youtube-shorts
internal-review
```

平台 Profile 应控制：

- 分辨率和比例；
- 最大时长；
- 音频采样率；
- 字幕安全区；
- 文件格式；
- 文件大小；
- 禁用内容规则。

## 6. P1：企业治理能力

### P1-5 配置、密钥和环境分离

建议分三类：

```text
代码默认值：可提交
项目配置：按环境管理
密钥：只读环境变量或密钥管理服务
```

企业部署不能依赖个人绝对路径，例如当前脚本中的 Python 默认路径应改为环境探测或部署配置。

配置启动时应做 schema 校验，并在日志中输出脱敏后的配置摘要。

### P1-6 成本和配额治理

当前已有 API RPM 约束意识，但企业级还需要任务级成本账本：

```text
估算 → 预留 → 调用 → 实际对账
```

至少记录：

- 图片张数和尺寸；
- TTS 字数/时长；
- 重试次数；
- Provider 和模型；
- 估算成本和实际成本；
- 按项目、部门、租户聚合。

达到预算上限时应 fail-closed，不能自动切换到未知成本 Provider。

### P1-7 内容安全与人工审批策略

当前已有故事审核门禁，但企业场景需要配置化审批策略：

- 普通内部草稿：单次故事审核；
- 对外发布：故事、素材、成片三道门；
- 医疗、法律、新闻、真人：强制人工审核；
- 触发敏感词或事实风险：禁止自动发布；
- 审批人、审批时间、审批版本进入审计记录。

### P1-8 审计与可复现

每个交付物必须可以回答：

```text
谁发起？
使用了哪份输入？
使用了哪个工作流版本？
使用了哪些模板和 Provider？
调用了哪些模型？
花费多少？
经过哪些审核？
最终文件 hash 是什么？
```

建议新增 `manifest.json` 或 `provenance.json`，但不要把密钥和完整敏感输入写进去。

## 7. P2：可定制扩展

### P2-1 多工作流但保持轻量

当第二种稳定视频类型出现后，再引入多个工作流：

```text
story-video
product-demo
knowledge-explainer
reference-remix
```

每条工作流独立定义阶段、模板和质量标准，共享执行器和 Provider 契约。

不要在只有一种工作流时先建设通用工作流平台。

### P2-2 插件边界

第三方扩展应通过清晰边界接入：

- Provider 插件；
- 质量检查插件；
- 内容分析插件；
- 发布插件。

插件必须声明能力、依赖、输入输出 schema 和权限，不允许任意读取整个项目目录。

### P2-3 人类可读的命令行运维入口

不做 UI，但应提供：

```powershell
npm run job:inspect -- --job-id <id>
npm run job:resume -- --job-id <id>
npm run job:validate -- --job-id <id>
npm run job:events -- --job-id <id>
npm run workflow:list
```

这些命令是企业运维和 Agent 共同使用的观察面。

## 8. P3：平台化前置条件

以下能力只有在真实企业多人、多项目、多机器运行后再考虑：

- 数据库任务索引；
- 对象存储；
- 队列和 worker；
- 多租户与 RBAC；
- Web API；
- Web 控制台；
- 分布式锁；
- Prometheus/OpenTelemetry；
- 统一发布中心。

这些不是当前个人 Agent-first 方案的第一优先级。

## 9. 推荐实施顺序

```text
E0 先修正执行一致性
  ├─ 任务快照真正成为唯一输入
  ├─ 状态迁移器
  ├─ 状态/契约强制闭环
  └─ 结构化事件日志

E1 做可复用核心
  ├─ 产物 schema 分层
  ├─ workflow manifest
  ├─ template version
  ├─ platform profile
  └─ 最小 Provider 接口

E2 做企业治理
  ├─ 成本/配额
  ├─ 审批策略
  ├─ provenance 审计
  ├─ 配置和密钥分离
  └─ CLI 运维命令

E3 观察真实负载后平台化
  ├─ 多工作流
  ├─ 对象存储/数据库
  ├─ 队列 worker
  ├─ RBAC/多租户
  └─ Web API/UI（如确有需要）
```

## 10. 最终判断

DSP 当前已经是一个可靠的单机 Agent 视频流水线，但还不是企业级平台。最关键的升级顺序不是“加更多 AI 模型”，而是：

1. 先保证任务输入、状态、产物和恢复完全一致；
2. 再把阶段、模板、平台规格和 Provider 变成版本化契约；
3. 然后补齐成本、审批、审计和安全治理；
4. 最后根据真实的多项目、多用户负载决定是否平台化。

在没有第二种稳定工作流、没有多人并发和没有真实成本治理需求前，不建议引入可视化编排器、数据库任务中心或复杂的多 Agent 框架。
