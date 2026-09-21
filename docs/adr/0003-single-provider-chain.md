# ADR-0003：固定单一 Provider 链路，不提前引入多 Provider 抽象

- 状态：已接受
- 日期：2026-09-07
- 相关：[roadmap/openmontage-comparison.md](../roadmap/openmontage-comparison.md) §3.4、§7，[roadmap/enterprise.md](../roadmap/enterprise.md) §P1-3，`scripts/providers/`

## 背景

DSP 只生产一种成片：故事短视频。链路固定为 Agnes 配图 → Edge TTS 旁白 → Remotion 渲染。OpenMontage 用 selector、provider registry 与 fallback chain 支持多类视频与多供应商调度，但 DSP 当前没有第二种稳定视频类型，也没有跨供应商的可靠性或成本调度需求。

## 决策

1. 默认链路固定为 `agnes-images` → `edge-tts` → `remotion`，`DEFAULT_PROVIDERS` 只登记描述符（id、kind、handler、capabilities），不做运行时选择。
2. 不引入 provider selector、fallback chain、多 pipeline YAML 与自动工具注册。
3. 只在出现下列任一需求时才扩展：同一能力要切换多个图片或 TTS 服务；某服务经常不可用；需要本地模型作降级路径；需要按成本或质量自动选 provider。
4. 扩展时先实现第二个具体 Provider，再抽象公共契约，不为"看起来通用"预留空抽象层。
5. API 字段变化只改 Provider 或脚本，不改故事 JSON 结构与 Remotion 组件。

## 后果

- 正面：调用路径可读、排障面小；一处 `AGNES_USER_TYPE` 与尺寸档位即可解释限流行为。
- 代价：真要接第二个供应商时需要在 `providers/` 与 `pipeline.mjs` 的 commands 表上做一次改造，而不是配置项切换。
- 已知缺口：无任务级成本账本（估算/预留/对账），见 [roadmap/enterprise.md](../roadmap/enterprise.md) P1-6。
