# DSP E0/E1 与 data/templates A-D 最终交付概览

> 🔴 **时点快照（E0/E1 与 A–D 轮次，提交于 2026-09-07），其中两条结论已被代码推翻**，请勿按此执行。
> 修订后口径（依据见 [项目总纲 §2.4、§2.5、§7](PROJECT_INDEX.md)）：
> 1. D 阶段切换的是**读取路径**。写入主源仍是 `data/` 根文件与 `templates/` 根模板，`data/context/`、`data/operations/` 等分类目录是 `migrate-layout.mjs` 生成并强制字节一致的**镜像副本**；只写副本会触发 `Migration target differs`。
> 2. 「`npm test` 26/26 通过」是当时基线，现为 15 个测试文件共 37 项，且因上述镜像漂移（`data/operations/tasks.md` 比主源多一条 2026-09-08 记录）当前 35 通过、2 失败。
> 下列内容为原始记录，保留作历史。

## 最终结论

本轮企业级基础能力改造已完成，并通过独立 QA。项目仍保持 Agent-first、命令行驱动和 Agnes → Edge TTS → Remotion 默认视频链路，不建设可视化界面、数据库、队列或多租户平台。

## 已完成

### E0：执行一致性

- 任务输入快照和审核快照；
- 快照 hash 与不可变校验；
- v1 → v2 状态迁移、备份和迁移历史；
- 阶段契约强制闭环；
- JSONL 事件日志和敏感信息脱敏；
- resume 的 `JOB_ID_REQUIRED` 校验；
- 状态损坏 fail-closed。

### E1：可复用核心

- Artifact Schema 分层；
- Workflow Manifest；
- 模板 Catalog 与版本；
- Douyin 竖屏 Platform Profile；
- 最小 Provider descriptor/interface；
- workflow/catalog/profile refs 固化到 job；
- refs hash 篡改检测；
- status/job/metadata manifest 版本和 hash 固化。

### A-D：data/templates 分层迁移

- A：模板分类和上下文按需选择器；
- B：兼容镜像与 layout-map；
- C：source/target、mapping、catalog hash 一致性检查；
- D：新目录切换为 SSOT，旧路径保留为只读兼容入口；
- 测试镜像不再污染 Git 工作区。

## 验证结果

- `npm test`：26/26 通过；
- `npm run typecheck`：通过；
- 关键 Node 脚本语法检查：通过；
- mirror/check：通过且无副作用；
- catalog 篡改：能够被非零失败拦截；
- refs 篡改：能够 fail-closed；
- 事件日志密钥脱敏：通过；
- Git 工作区：干净；
- 未调用真实 Agnes 或 Edge TTS 服务做高成本集成测试。

## 关键最终提交

- E0：`da7e413`
- E1：`ccee24aa`
- A：`0cf8e675`
- B：`408269e`
- C：`800aac3`
- D：`af46bfc`

## 后续建议

- 真实密钥和低成本素材下做一次端到端视频生成验证；
- ~~新任务按新 SSOT 路径选择上下文和模板；旧根路径只读，不再新增写入~~ → **已修正**：分类路径用于读取，写入一律用根主源并执行 `migrate-layout.mjs mirror`（见总纲 §2.5）；
- 后续新增模板时同步更新 `templates/catalog.json` 及 hash；
- 暂不引入 UI、数据库、队列或多租户平台化。