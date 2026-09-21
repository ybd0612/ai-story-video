# 决策记录（ADR）

> 本文档隶属 [项目总纲](../PROJECT_INDEX.md)。

记录已经生效且会影响后续改动的取舍。规则：

- 一条决策一个文件，编号递增，文件名 `NNNN-短横线标题.md`；
- 状态只用 `已提议 / 已接受 / 已废弃 / 被 ADR-XXXX 取代`；
- 只写背景、决策、后果与证据（提交号、文件、命令），不写实施流水账——那属于 [CHANGELOG](../CHANGELOG.md)；
- 决策被推翻时不改写原文，新增一条并把旧条状态改为"被取代"。

| 编号 | 决策 | 状态 |
|---|---|---|
| [ADR-0001](0001-agent-only-control-plane.md) | Agent 是唯一控制面，不建可视化编排界面 | 已接受 |
| [ADR-0002](0002-data-templates-mirror-direction.md) | `data/` 分类目录与 `templates/` 根文件各自的镜像写入方向 | 已接受 |
| [ADR-0003](0003-single-provider-chain.md) | 固定单一 Provider 链路，不提前抽象多 Provider | 已接受 |
| [ADR-0004](0004-python-runtime-resolution.md) | Python 解释器解析收敛为单一入口且不静默回退 | 已接受 |
