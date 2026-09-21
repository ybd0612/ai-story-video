# ADR-0004：Python 解释器解析收敛为单一入口且不静默回退

- 状态：已接受
- 日期：2026-09-21
- 相关：[../PROJECT_INDEX.md](../PROJECT_INDEX.md) §2.4，[design/story-workflow.md](../design/story-workflow.md) Edge TTS 章节，提交 `f6755b5`、`bb3f710`

## 背景

Edge TTS 阶段依赖带 `edge_tts` 包的 Python。三个入口（`doctor.mjs`、`pipeline.mjs`、`run-edge-tts.mjs`）各自写死同一台机器的绝对路径解释器，换机器或换用户即断链；`f6755b5` 只能把三处改成同一个写死路径，问题没解决。另一类故障更隐蔽：解释器存在但没装 `edge_tts`，只检查 `--version` 会假通过，到 TTS 阶段才失败。

## 决策

1. 解析逻辑收敛到 `scripts/runtime-tools.mjs`，三个入口共用。
2. 设置了 `PYTHON_BIN` 时**只用它**，不可用即抛 `PYTHON_BIN_UNUSABLE`，**绝不回退**到 PATH 上的解释器——避免"看起来跑通了，实际用了另一个环境"。
3. 未设置时按 `VIRTUAL_ENV` 解释器 → `py -3`（Windows）→ `python` → `python3` 依次探测，探测脚本要求能 `import edge_tts` 并回显版本，全部失败抛 `PYTHON_RUNTIME_NOT_FOUND` 并列出每个候选的失败原因。
4. 探测超时由 `PYTHON_PROBE_TIMEOUT_MS` 控制，默认 15000 ms。
5. 代码库不保留任何机器特定绝对路径；"本机用哪个解释器"降级为运行时环境配置。

## 后果

- 正面：换机器不需要改代码；依赖缺失在 `doctor` 阶段就暴露，而不是烧掉图片调用的钱之后才失败。
- 代价：本机 PATH 上的 Python 未装 `edge_tts`，不注入 `PYTHON_BIN` 时 `doctor` 会三个候选全报 ModuleNotFound 并 exit=1。这是刻意的诚实失败，不是回归——要么设长期环境变量，要么给 PATH 上的解释器装 `edge-tts`。
- 剩余同类问题：ffprobe 仍依赖 PATH 上的 `FFPROBE_BIN`；Node 版本未锁定（见 [roadmap/enterprise.md](../roadmap/enterprise.md) P1-5）。
