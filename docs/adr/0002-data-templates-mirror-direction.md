# ADR-0002：`data/` 与 `templates/` 的镜像写入方向

- 状态：已接受（取代 2026-09-07 的部分实现）
- 日期：2026-09-21
- 相关：[../PROJECT_INDEX.md](../PROJECT_INDEX.md) §2.5，[../design/data-template-boundary.md](../design/data-template-boundary.md)，提交 `408269e`、`c310d95`、`af46bfc`、`3b9cf02`

## 背景

A–D 分层迁移为兼容旧读取方，用 `scripts/migrate-layout.mjs` 在两组路径间维持字节一致的镜像，并由 `--check` 与 `npm test` 把关。两个半区的权威侧出现了分歧：

- 代码（`MAPPINGS`）把 `data/` 与 `templates/` 的**根文件**固定为 source，分类目录是必须一致的 target；
- 提交 `af46bfc` 同时把 `CLAUDE.md` 改成"只写分类目录、根文件只读兼容"，方向相反。

后果是可复现的故障：2026-09-08 一条任务记录按文档只写进了 `data/operations/tasks.md`，触发 `Migration target differs`，使 `npm test` 持续 2 项失败。`mirror()` 遇到副本自行改动时抛错而不覆盖，因此"两边都可以写"不成立。

## 决策

1. **`data/`：分类目录是写入主源**——`context/`、`knowledge/`、`analytics/`、`operations/` 为主，`data/` 根同名文件降级为 `mirror` 生成的兼容副本，兑现 D 阶段原意图。
2. **`templates/`：根模板仍是写入主源**，`templates/story/` 保持镜像副本。不跟随反转，因为 `templates/catalog.json` 按根路径钉 `sha256`、`.gitignore` 已把副本排除在版本库外；一起反转会连带改 Git 跟踪范围与指纹固定，收益为零。
3. 两个半区方向不一致是**有意保留**的，映射表只在本文件与总纲 §2.5 各记一次，其它文档只引用。
4. 写入流程固定为：改主源 → `node scripts/migrate-layout.mjs mirror` → `--check` 通过才提交。
5. `data/feedback/` 不在映射内，可直接新增文件。
6. `migrate-layout.mjs` 补 `import.meta.url` 守卫：`import` 该模块只导出函数，不再连带执行 `mirror()`——原副作用会把一条数据漂移放大为多个测试文件失败。

## 后果

- 正面：`npm test` 恢复 36/36；写入侧只有一个权威，漂移不再可能"合法存在"。
- 代价：`data/` 根文件与 `templates/` 根文件的角色不对称，必须靠 §2.5 的映射表和 `--check` 兜住；新人容易凭直觉去改副本，故错误信息保留 `Migration target differs: <target>` 以便定位。
- 兼容性：历史 job 与被忽略的根文件一律不删，旧读取方仍可工作。
