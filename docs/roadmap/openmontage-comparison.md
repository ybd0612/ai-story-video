# AI 视频工作流待做方案：DSP 与 OpenMontage 对比

> 本文档隶属 [DSP 项目总纲](../PROJECT_INDEX.md)，关键路径和当前实现状态以总纲 SSOT 为准。
>
> 文档状态：P0/P1 已实施并通过最终 QA
>
> 本文记录方案、设计取舍、验收标准和实施结果。当前未建设可视化界面，Agent 仍是唯一控制面。

## 1. 结论摘要

DSP 和 OpenMontage 采用的是同一种大方向：

> 由 Agent 负责理解需求、做创作决策和推进流程，由项目代码负责工具调用、文件处理、状态持久化和视频渲染。

两者都属于 **Agent-first 的 AI 视频生产工作流**，不是传统的可视化拖拽工作流。

DSP 不需要建设可视化工作流界面。后续应保持：

- 聊天 Agent 是主要控制面；
- Markdown / JSON / 脚本是工作流的可读执行协议；
- `jobs/<job-id>/status.json` 是任务状态事实源；
- 命令行脚本是确定性工具和执行节点；
- 可视化界面不是 P0/P1 目标；
- 如果未来需要观察任务，只增加日志、状态摘要或命令行查询，不反向建设一套 UI 编排系统。

## 2. 两个项目的共同点

| 维度 | DSP | OpenMontage |
|---|---|---|
| 控制面 | 聊天中的 Agent + 项目规则 | IDE 中的 LLM Agent + Agent Guide |
| 内容输入 | 主题 / 灵感 / 用户资料 | 主题 / 灵感 / 可选参考视频 |
| 中间协议 | `story.json` + `story.schema.json` | pipeline manifest + 多种 artifact schema |
| 人工门禁 | 故事审核文件 + SHA-256 指纹 | 各阶段 checkpoint + human approval |
| AI 节点 | Agnes 配图、Edge TTS | 多 provider 图片、视频、TTS、音乐等工具 |
| 程序节点 | 校验、音频测量、Remotion 渲染 | 工具注册、素材处理、渲染、检查点持久化 |
| 任务隔离 | `jobs/<job-id>/` | `projects/<project_id>/` |
| 反馈方式 | 写回 `data/`，影响下一次创作 | 阶段决策、审查结果和历史 checkpoint |
| 运行方式 | `npm run make:video` 一键执行 | Agent 按阶段读取规则并逐步推进 |
| 可视化界面 | 没有，且不计划建设 | Backlot 观察看板，但不是控制面 |

## 3. 关键差异

### 3.1 DSP 是“固定产品流水线”，OpenMontage 是“通用视频生产框架”

DSP 当前聚焦一种明确产品：

```text
故事主题 → 故事短视频 → MP4
```

OpenMontage 则通过多个 YAML pipeline 支持解释视频、动画、口播、混剪、播客复用等多类视频。

因此 DSP 不应直接复制 OpenMontage 的多 pipeline、57+ 工具或多渲染器体系。当前更适合先把一条故事视频流水线做稳，再考虑是否出现第二种稳定的视频类型。

### 3.2 DSP 的执行编排目前更多在代码里，OpenMontage 更强调 Agent 按规则编排

DSP 的 `make-video.mjs` 会按固定顺序执行：

```text
validate → images → tts → audio-validation → prepare → render → deliver
```

OpenMontage 的 Agent 则先读 pipeline YAML 和阶段导演技能，再决定每个阶段如何执行；Python 主要提供工具和持久化能力，不承担创作决策。

这不是简单的优劣关系：

- DSP 的固定顺序更可靠，适合当前单一视频类型和批量生产；
- OpenMontage 的声明式阶段更灵活，适合多种视频类型和不同创作策略；
- DSP 后续可学习“阶段契约”和“阶段状态”，但不必马上把所有编排逻辑移出代码。

### 3.3 DSP 目前是“故事审核一次”，OpenMontage 是“阶段级审核”

DSP 的主要门禁在媒体生产之前：

```text
story.draft.json → 用户审核 → story.approved → 媒体生产
```

OpenMontage 通常在 proposal、script、scene_plan、assets 等阶段分别停下来审查。

对 DSP 的建议：

- P0 不增加大量人工停顿；
- 保留当前“故事审核门禁”；
- 将图片/配音完成后的机器校验纳入状态；
- 未来如果创作复杂度上升，再考虑增加“分镜/素材审核”门禁。

### 3.4 OpenMontage 的工具层更通用，DSP 的 provider 更固定

DSP 当前明确使用 Agnes 和 Edge TTS，这符合项目的实际目标，也减少了选择复杂度。

OpenMontage 使用 selector、provider registry 和 fallback chain，能够根据可用能力、成本、可靠性和任务适配度选择工具。

DSP 当前不应为了“看起来通用”而引入多 provider 抽象。只有出现以下需求时再引入：

- 同一能力需要切换多个图片或 TTS 服务；
- 某个服务经常不可用；
- 需要本地模型作为降级路径；
- 需要按成本或质量自动选择 provider。

### 3.5 OpenMontage 有预算治理，DSP 当前主要是 API 配额和串行限速

OpenMontage 在调用前估算、预留和对账成本。DSP 当前已经关注 Agnes RPM，并通过串行调用降低超限风险，但还没有统一的费用预算对象。

当前不把预算系统列入 P0/P1。后续若图片、视频和 TTS provider 增多，再增加成本记录。

### 3.6 OpenMontage 支持参考视频分析，DSP 当前是原创故事生产

OpenMontage 把“给一个参考视频，分析节奏、结构、风格，再产出差异化方案”作为一等入口。

DSP 当前输入是主题和创作资料，不负责分析参考视频。这个能力有参考价值，但不应在本轮 P0/P1 中加入，否则会扩大项目边界。

## 4. OpenMontage 对 DSP 最有价值的参考

### 4.1 学习“Agent 是控制面”，而不是建设 UI

OpenMontage 的核心观点是：

```text
Agent 读取规则 → 选择阶段 → 调用工具 → 评估结果 → 保存状态 → 等待审批
```

这与 DSP 的使用方式高度匹配。DSP 后续应该继续强化 Agent 工作规则、阶段说明和输出契约，而不是优先建设可视化流程编辑器。

### 4.2 学习阶段契约

OpenMontage 每个阶段都定义：

- 输入 artifact；
- 输出 artifact；
- 可用工具；
- 是否需要 checkpoint；
- 是否需要人工审批；
- 审查重点；
- 成功标准。

DSP 后续可把现有流程明确成下面的阶段契约：

| 阶段 | 输入 | 输出 | 主要成功标准 |
|---|---|---|---|
| validate | story JSON | 校验结果 | schema 合法、内容满足基础约束 |
| images | story JSON | 带图片故事 + 图片文件 | 每个镜头图片存在且路径可用 |
| tts | 带图片故事 | 带音频故事 + 音频文件 | 每个镜头音频生成成功 |
| audio-validation | 带音频故事 | 校验后的故事 | 音频可读、时长可测量、镜头时长合理 |
| prepare | 校验后的故事 | Remotion 输入 JSON | 所有资源路径可解析 |
| render | Remotion 输入 JSON | MP4 + 渲染报告 | 文件存在、可播放、时长合理 |
| deliver | MP4 | outputs 交付副本 | 输出路径明确且不覆盖历史任务 |

### 4.3 学习“状态先行”和断点续跑

OpenMontage 的 checkpoint 不只是记录成功或失败，还记录：

- 当前阶段；
- 阶段产物；
- 审查结果；
- 部分进度；
- 历史版本；
- 下一阶段。

DSP 已经有基础：`task-state.mjs` 会写入 `status.json`，记录 `status`、`currentStage`、`retryableStage`、各阶段状态和错误信息。

因此 DSP 不需要从零引入 OpenMontage 的 checkpoint 系统，应该在现有 `status.json` 基础上渐进增强。

### 4.4 学习质量门，而不是只检查命令退出码

OpenMontage 的 compose 阶段不仅要求命令成功，还要求：

- 输出视频存在；
- 文件可以被 ffprobe 读取；
- 时长符合目标；
- 音频清晰且混音合理；
- 运行时和已批准决策一致。

DSP 目前已有音频时长校验和视频输出，但后续应把“交付前质量检查”明确为独立阶段，而不是默认认为 Remotion 退出码为 0 就代表成片合格。

### 4.5 学习追加式决策和失败说明

OpenMontage 要求重要决策在执行前说明；如果中途改变 provider、声音、渲染器或创作方向，要追加新决策，不静默覆盖旧决定。

DSP 可借鉴为 Agent 协作约定：

- 产生 API 成本前，说明将调用什么能力以及原因；
- 发现阻塞时说明尝试了什么、哪里失败、下一步有哪些选择；
- 不要在用户未确认时静默切换生成路径；
- 任务状态中保留失败阶段和错误原因。

## 5. P0：统一任务状态与状态驱动执行

### 5.1 目标

在不建设 UI、不改变当前视频生产链路的前提下，让 `status.json` 成为一次任务的唯一运行状态来源，能够回答：

- 任务当前处于哪个阶段；
- 哪些阶段已完成；
- 哪个阶段失败；
- 是否允许重试；
- 最终产物在哪里；
- 是否已经交付。

### 5.2 建议状态模型

任务级状态建议保留并规范为：

```text
created
running
awaiting_human
failed
completed
delivered
```

阶段级状态建议使用：

```text
pending
running
completed
failed
skipped
```

人工审核可以作为故事阶段或任务级状态，不需要引入 UI 状态。

### 5.3 建议状态字段

```json
{
  "jobId": "任务 ID",
  "workflow": "story-video",
  "workflowVersion": "版本号",
  "source": "输入故事路径",
  "storyFingerprint": "故事指纹",
  "status": "running",
  "currentStage": "tts",
  "retryableStage": "tts",
  "stages": {
    "validate": {
      "status": "completed",
      "startedAt": "时间",
      "finishedAt": "时间",
      "input": "路径",
      "outputs": ["路径"]
    },
    "images": {
      "status": "completed",
      "startedAt": "时间",
      "finishedAt": "时间",
      "outputs": ["路径"]
    },
    "tts": {
      "status": "running",
      "startedAt": "时间",
      "outputs": []
    }
  },
  "output": null,
  "error": null,
  "createdAt": "时间",
  "updatedAt": "时间"
}
```

字段最终命名以实现前的代码审查为准；本节是目标模型，不是本轮实现结果。

### 5.4 P0 验收标准

- 每个阶段开始前写入 `running`；
- 每个阶段成功后写入 `completed` 及输出路径；
- 任一阶段失败后写入 `failed`、错误信息和可重试阶段；
- 状态文件损坏或缺失时不得假装任务已完成；
- 已存在任务目录仍然拒绝覆盖；
- 任务状态和实际产物路径一致；
- 不增加可视化界面；
- 不改变 Agnes → Edge TTS → Remotion 的默认链路；
- 现有审核指纹门禁继续有效。

## 6. P1：阶段契约与断点续跑

### 6.1 目标

在 P0 状态基础上，使 Agent 或用户能够根据状态文件继续任务，而不是每次从头执行全部流程。

目标命令形态可考虑：

```powershell
npm run resume -- --job-id <job-id>
```

本命令仅作为方案，不代表本轮已经存在。

### 6.2 断点续跑规则

| 当前情况 | 续跑行为 |
|---|---|
| validate 已完成 | 跳过 validate，检查输出是否仍存在 |
| images 已完成 | 跳过已完成图片，只补失败或缺失镜头 |
| tts 已完成 | 跳过已有音频，只补失败或缺失音频 |
| audio-validation 已完成 | 重新确认输入文件和校验结果 |
| prepare 已完成 | 检查当前故事和资源指针是否有效 |
| render 失败 | 从 render 开始，不重复调用图片和 TTS |
| 任务已 delivered | 默认拒绝重复执行，除非显式指定新任务 |
| 状态与产物矛盾 | 停止并报告，不静默覆盖或猜测 |

### 6.3 阶段契约

每个阶段应明确以下信息：

```text
阶段名称
输入文件/字段
输出文件/字段
执行命令或工具
状态变化
失败原因
是否可重试
是否可能产生外部费用
完成验收条件
```

阶段契约应优先写入工作流文档或独立 schema，避免把所有规则隐含在 `make-video.mjs` 的顺序代码中。

### 6.4 P1 验收标准

- 可以从最后一个可靠完成阶段继续；
- 续跑不会重复调用已经完成且有效的付费媒体节点；
- 单个镜头失败时可以只补该镜头，至少不重复全部任务；
- 续跑前检查故事指纹、任务目录和中间产物；
- 关键输入发生变化时拒绝续跑并要求重新审核；
- 失败后能够给出明确的恢复建议；
- 不引入可视化工作流编辑器或看板依赖。

## 7. 暂不实施的 OpenMontage 能力

以下内容有参考价值，但不纳入当前 P0/P1：

| 能力 | 暂不实施原因 |
|---|---|
| Backlot 可视化看板 | 用户明确采用 Agent 作为控制面，当前不需要 UI |
| 多 pipeline YAML 框架 | DSP 当前只有故事短视频一种稳定产品 |
| 57+ 工具自动注册 | 当前工具数量少，自动发现会增加抽象成本 |
| 多 provider selector | Agnes 和 Edge TTS 是当前明确路径 |
| 成本预算预留/对账 | 当前重点是稳定生产链路，不是多 provider 成本调度 |
| 参考视频分析 | 会扩大输入类型和创作边界，后续单独评估 |
| 多渲染运行时 | 当前 Remotion 已满足故事视频需求 |
| 全阶段人工审批 | 当前故事审核门禁已经覆盖主要风险 |

## 8. 推荐实施顺序

```text
阶段 0：确认本方案，不改代码
   ↓
阶段 1：P0 状态字段和阶段输出登记
   ↓
阶段 2：P0 状态一致性与异常测试
   ↓
阶段 3：P1 resume 入口和阶段跳过逻辑
   ↓
阶段 4：P1 单镜头失败补偿
   ↓
阶段 5：根据实际生产反馈调整阶段契约
```

每个阶段完成后都应：

1. 先执行无副作用测试；
2. 再使用真实但低成本的输入验证；
3. 检查任务目录和状态文件；
4. 更新本文档的实施状态；
5. 通过 Git 提交，不自动推送。

## 9. 实施结果

> ⏱ 本节为 P0/P1 轮次（2026-09-07 之前）的交付快照，测试数字与提交号只描述当时状态。当前测试基线与实时结果见 `PROJECT_INDEX.md` §2.4。

本轮已完成 P0/P1 实施，最终 QA 通过：

- P0：schema v2 状态、原子写入、阶段契约、任务锁、`render/deliver` 状态纳入；
- P1：`JOB_ID + RESUME=1` 断点续跑、图片/TTS 指定镜头补偿、有效媒体复用、无效目标拒绝；
- 交付策略：`completed` 阶段契约失败时停止并报告，不静默覆盖；
- 该轮验证：`npm test` 当时 7 项全部通过、`npm run typecheck`、Node/Python 语法检查通过；未调用真实 Agnes 或 Edge TTS；
- 最终修复提交：`a04b26b`、`ca54c58`、`9977ca8`、`4322d18`。

## 10. 最终建议

DSP 最应该向 OpenMontage 学习的不是“做一个界面”，而是：

1. **Agent-first**：Agent 是控制面；
2. **阶段契约**：每一步都有明确输入、输出和验收条件；
3. **状态持久化**：任务随时可恢复、可审计；
4. **质量门**：产物质量不能只依赖命令退出码；
5. **失败透明**：阻塞时说明原因和恢复路径；
6. **决策可追踪**：重要 provider 和路径切换不能静默发生。

DSP 应保留自己的优势：

- 流程短而聚焦；
- 故事 JSON 结构清晰；
- 审核指纹门禁简单可靠；
- 任务目录隔离明确；
- Agnes、Edge TTS、Remotion 链路稳定；
- 不为通用化而过早引入复杂平台抽象。
