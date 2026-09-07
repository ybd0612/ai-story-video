# data 与 templates 边界方案

> 本文档隶属 [DSP 项目总纲](../PROJECT_INDEX.md)，关键路径和当前实现状态以总纲 SSOT 为准。
>
> 文档性质：数据与模板分层及迁移状态说明。A/B/C 已完成，D 已切换文档 SSOT 默认路径；生成代码默认链路保持兼容。

## 1. 结论

`data/` 不需要删除，也不应该继续承担所有内容。它应被明确定位为：

> **当前 Agent 运行时读取的用户/项目上下文层。**

`templates/` 则定位为：

> **可复用、可版本化、可迁移的内容生产规则层。**

任务执行过程和任务反馈不应继续混在这两个目录中：

- 单次任务输入、中间文件、状态和视频：放 `jobs/<job-id>/`；
- 已确认的用户反馈和发布复盘：进入结构化反馈/分析目录；
- Agent 的工作规则和项目级硬约束：保留在 `CLAUDE.md`、工作流文档和 schema 中。

核心原则：

```text
data = 谁在创作、有什么资料、过去发生了什么
 templates = 应该怎样创作、怎样生产、怎样验收
 jobs = 这一次具体做了什么
```

## 2. 当前 data 内容的真实分类

| 当前路径 | 当前内容 | 长期归属建议 | 说明 |
|---|---|---|---|
| `data/profile.md` | 个人身份、账号定位、目标受众、平台和能力限制 | `data/context/profile.md` | 用户/账号上下文，不是模板 |
| `data/preferences.md` | 节奏、开场、结尾、镜头和表达偏好 | `data/context/preferences.md` | 目前属于用户偏好；稳定后可提炼为模板参数 |
| `data/knowledge.md` | 孕期事实、素材灵感、行业知识、资源清单 | `data/knowledge/` | 内容知识与素材库，不应和生成规则混合 |
| `data/history.md` | 发布记录、播放/互动数据、复盘 | `data/analytics/` | 运营结果和分析，不是生产模板 |
| `data/tasks.md` | AI 任务日志、历史项目维护记录 | `data/operations/` 或 Git 变更记录 | 不应作为每次创作的主要上下文 |
| `data/feedback/` | 用户对标题、人物、镜头、旁白、成片的反馈 | `data/feedback/` | 保留，但建议一条反馈一个结构化文件 |

B 阶段已建立兼容镜像，C 阶段提供 source/target 一致性校验；D 阶段文档已切换到新 SSOT 默认路径。旧根文件保留为只读兼容入口，不删除、不再新增，生成代码默认链路不变。

## 3. 推荐目标目录

```text
data/                         用户/项目运行时上下文
├─ context/                    当前身份、定位、偏好
│  ├─ profile.md
│  ├─ preferences.md
│  └─ constraints.md
├─ knowledge/                  可供创作引用的事实和素材
│  ├─ facts.md
│  ├─ ideas.md
│  └─ resources.md
├─ feedback/                   用户反馈和审核意见
│  ├─ 2026-09-07-<topic>.md
│  └─ ...
├─ analytics/                  发布数据和复盘结论
│  ├─ publications.csv
│  └─ insights.md
└─ operations/                 非创作运行记录
   └─ tasks.md

templates/                    可复用生产规则
├─ workflows/
│  └─ story-video.yaml         阶段顺序、输入输出、门禁
├─ story/
│  ├─ short-story.json         故事结构和字段约束
│  └─ knowledge-explainer.json
├─ style/
│  ├─ warm-realistic.md        视觉和表达风格
│  └─ fast-paced.md
├─ voice/
│  └─ default-zh-cn.yaml       音色、语速、停顿规则
├─ platform/
│  ├─ douyin-vertical.yaml     平台规格
│  └─ internal-review.yaml
├─ policy/
│  └─ content-safety.yaml      内容限制和审核要求
└─ README.md                   模板索引、版本和使用说明

jobs/<job-id>/                 单次执行实例
├─ input/                      本次任务不可变输入快照
├─ work/                       阶段中间产物
├─ media/                      图片、音频等媒体
├─ output/                     本次视频
├─ status.json                 当前状态
├─ events.jsonl                后续追加式事件
└─ manifest.json               后续任务溯源清单
```

## 4. 当前 data 与 templates 的边界判断

### 应该放在 data 的内容

这些内容会随账号、项目和现实反馈变化：

- 账号定位；
- 用户身份和创作能力；
- 目标受众；
- 内容事实和个人经历；
- 选题灵感；
- 用户对成片的修改意见；
- 发布后的真实数据；
- 从历史反馈中归纳的临时结论。

### 应该放在 templates 的内容

这些内容应该可以被多个账号、多个任务或多个项目复用：

- 故事 JSON 结构；
- 工作流阶段顺序；
- 阶段输入、输出和验收标准；
- 视觉风格；
- 旁白规则；
- 平台规格；
- 内容安全策略；
- 标题和脚本模板；
- Provider 参数默认值。

### 不应该放在 data 或 templates 的内容

- 单次任务的图片、音频和视频：放 `jobs/`；
- 单次任务状态：放 `jobs/<job-id>/status.json`；
- API Key：只放环境变量或密钥管理服务；
- Agent 核心行为硬规则：放 `CLAUDE.md` 和工作流协议；
- 已完成任务的完整运行日志：放任务目录或后续事件日志，不写进用户偏好。

## 5. 当前最重要的问题：data 读取过宽

`CLAUDE.md` 当前要求每次生成前读取：

```text
data/profile.md
 data/preferences.md
 data/knowledge.md
 data/history.md
 data/feedback/
 templates/
```

这会产生四个问题：

1. 每次任务都读取大量与当前主题无关的内容；
2. `history.md` 和 `tasks.md` 可能把运营记录、项目维护记录带入创作上下文；
3. `knowledge.md` 同时包含事实、灵感、工具和资源，难以判断可信度；
4. `templates/` 现在没有明确的工作流、风格、平台和策略入口。

建议改为“按任务选择性加载”：

```text
每次任务必读：
- templates/workflows/<workflow>.yaml
- templates/story/<story-template>
- templates/platform/<platform-profile>
- data/context/profile.md
- data/context/preferences.md

按主题检索：
- data/knowledge/
- data/feedback/
- data/analytics/insights.md

仅在维护/复盘任务读取：
- data/operations/tasks.md
- data/analytics/publications.csv
- data/history.md（迁移期间兼容）
```

关键原则：

> 不要让 Agent 每次把整个 data 当作 Prompt；应先根据工作流、主题和任务类型筛选上下文。

## 6. 建议的上下文优先级

当不同文件存在冲突时，按以下优先级处理：

```text
1. 安全规则和项目硬约束
2. 本次用户明确指令
3. 本次任务的已批准输入
4. workflow / platform / policy 模板
5. 当前用户偏好
6. 经过确认的历史反馈和复盘结论
7. 一般知识和灵感
```

`data/` 中的历史内容不能覆盖本次用户明确指令，也不能绕过人工审核和安全门禁。

## 7. 迁移策略

### 阶段 A：先建边界，不改路径

- 新增本方案和模板索引；
- 为现有 `templates/` 增加分类约定；
- 在 Agent 规则中区分“必读上下文”和“按需检索资料”；
- 保留旧路径兼容。

### 阶段 B：兼容镜像迁移

- 将 `profile.md`、`preferences.md` 复制到 `data/context/`；
- 将 `knowledge.md` 拆成 `facts.md`、`ideas.md`、`resources.md`；
- 将 `history.md` 转成结构化发布记录；
- 将 `tasks.md` 移到 `data/operations/`；
- 旧文件暂时作为兼容入口，不再继续新增内容；
- 校验新旧内容一致后，再修改 Agent 默认读取路径。

### 阶段 C：以新目录为 SSOT

- `data/context/`、`data/knowledge/`、`data/analytics/` 成为权威路径；
- 旧文件只保留迁移说明或删除（需用户确认）；
- `templates/` 内每类模板有版本号；
- 每个 job 记录实际加载的上下文和模板版本。

## 8. 推荐的第一批模板

不要一次创建很多空模板，建议先做三个真正会被使用的文件：

```text
templates/workflows/story-video.yaml
templates/platform/douyin-vertical.yaml
templates/style/warm-realistic.md
```

其中 `story-video.yaml` 先只描述当前已稳定的固定链路：

```yaml
name: story-video
version: "1.0"
input: story.json
stages:
  - validate
  - images
  - tts
  - audio-validation
  - prepare
  - render
  - deliver
```

不要在这一步同时实现多 Provider、复杂模板继承或可视化编辑。

## 9. 最终建议

你的当前方案不应该变成：

```text
Agent 读取全部 data → 自己猜怎么生成
```

更合理的是：

```text
Agent 选择工作流模板
  ↓
加载当前账号上下文
  ↓
按主题检索知识和反馈
  ↓
生成本次任务输入
  ↓
写入 job 快照
  ↓
执行固定阶段和契约
  ↓
将反馈写回 data/feedback
```

最终边界可以记成：

```text
data       = 可变化的事实、上下文和反馈
 templates = 可复用的规则、结构和风格
 jobs       = 单次运行的输入、状态和产物
```
