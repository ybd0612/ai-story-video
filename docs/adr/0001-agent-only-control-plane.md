# ADR-0001：Agent 是唯一控制面，不建可视化编排界面

- 状态：已接受
- 日期：2026-09-07
- 相关：[roadmap/openmontage-comparison.md](../roadmap/openmontage-comparison.md) §1、§7，[roadmap/enterprise.md](../roadmap/enterprise.md) §8

## 背景

同类项目 OpenMontage 提供 Backlot 可视化看板，容易导向"先做界面"。DSP 的实际使用方式是聊天里的 Agent 读规则、做创作决策、按阶段推进，人只在故事审核点介入。可视化编辑器会和"Markdown / JSON / 脚本是可读执行协议"这一现状冲突，并把工程投入从生产可靠性转移到 UI。

## 决策

1. 聊天中的 Agent 是唯一控制面；项目代码只承担工具调用、文件处理、状态持久化与渲染等确定性工作。
2. 工作流以 `story.schema.json`、阶段契约、`status.json`、`events.jsonl` 表达，不用图形化流程定义。
3. 需要观察任务时，只增加日志、状态摘要与命令行查询，不反向建 UI 编排系统。
4. 已移除 Remotion Studio 网页预览入口（`package.json` 无 `start` 脚本），本地检查一律走 `doctor` / `dry-run` / `typecheck` / `test`。
5. 不建数据库任务中心、多机队列、多租户 RBAC、Web API——除非出现真实的多人或多机负载。

## 后果

- 正面：链路短、可审计、无 UI 维护成本；Agent 规则改动即时生效。
- 代价：非技术用户必须经 Agent 操作；任务状态只能命令行查看，排障依赖 `status.json` 与事件日志的可读性。
