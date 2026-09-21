# 模板目录

> 本文档隶属 [DSP 项目总纲](../PROJECT_INDEX.md)，镜像与写入口径以总纲 §2.5 为准。

A 阶段建立模板边界与按需加载基础；B 阶段提供兼容镜像；C 阶段提供 source/target 与 catalog hash 一致性校验；D 阶段把**读取**默认路径切到分类目录。现有 `data/` 内容不删除，模板根文件继续作为权威源。

## 分类与现状

| 分类 | 用途 | 当前状态 |
|---|---|---|
| `workflows/` | 工作流定义与阶段契约 | `story-video.workflow.json`（v1.0.0，已入 catalog） |
| `platform/` | 平台输出规格 | `douyin-vertical.profile.json`（v1.0.0，已入 catalog） |
| 根 `title-template.md`、`script-template.md` | 标题与脚本模板 | **权威文件**，已入 catalog 并校验 sha256 |
| `story/` | 上述两个根模板的兼容镜像 | 由 `mirror` 生成，`.gitignore` 忽略，**不提交、不单独编辑** |
| `style/`、`voice/`、`policy/` | 视觉风格、语音、内容策略 | 空占位（仅 `.gitkeep`），尚未有模板文件 |
| `catalog.json` | 模板索引与版本 | 登记 4 个条目的 path/version/sha256 |

## 写入规则

1. 新增或修改标题、脚本模板，**只改根文件**；`templates/story/` 下的副本由镜像生成，不要直接写、也不要往那里新增其它文件（那里新增的文件不受 catalog 校验，也不会被 `mirror` 管理）。
2. 改动被 `catalog.json` 登记过的文件后，必须同步更新其 `sha256`，再执行校验：

```powershell
cd app/create-video
node scripts/migrate-layout.mjs mirror
node scripts/migrate-layout.mjs --check
```

3. `--check` 同时校验镜像一致性与 catalog hash；任一不符即非零退出，此时不得提交。
4. 新出现一类可复用规则时，先加文件、再加 `catalog.json` 条目（含 `version` 与 `sha256`），最后补本表。