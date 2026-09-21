# data 与 templates 分层评审概览

> 🔒 **时点快照（分层评审轮次，提交于 2026-09-07）**。三层边界结论仍成立；目录落地口径已在代码中确定，与下文推荐方向有差异——**写入主源是根文件，分类目录是镜像副本**，见 [项目总纲 §2.5](PROJECT_INDEX.md) 与已修订的 [`docs/data-template-boundary.md`](docs/data-template-boundary.md)。

## 核心结论

`data/` 不应删除，但不能继续承担所有职责。建议明确：

```text
data       = 可变化的事实、上下文和反馈
templates  = 可复用的规则、结构和风格
jobs        = 单次运行的输入、状态和产物
```

## 当前发现

现有 `data/` 混合了：

- 个人档案和账号定位；
- 创作偏好；
- 知识、事实和选题灵感；
- 发布历史和运营数据；
- AI 任务日志；
- 用户反馈。

这会导致 Agent 每次全量读取无关上下文，也让可复用规则和个人事实混在一起。

## 推荐方向

- `data/context/`：profile、preferences、constraints；
- `data/knowledge/`：facts、ideas、resources；
- `data/analytics/`：发布数据和复盘；
- `data/feedback/`：用户反馈；
- `data/operations/`：维护日志；
- `templates/workflows/`：工作流定义；
- `templates/style/`：视觉和表达风格；
- `templates/platform/`：平台规格；
- `templates/policy/`：安全和审核策略。

本轮只完成方案文档和导航同步，没有迁移现有文件，也没有改变生成代码。

详细方案：`docs/data-template-boundary.md`
