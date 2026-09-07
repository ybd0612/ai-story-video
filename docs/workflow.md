# 生成工作流

> 本文档隶属 [项目总纲](../PROJECT_INDEX.md)，关键路径以总纲 SSOT 为准。

## 任务生命周期

```text
读取 data/context/profile + data/context/preferences + templates/workflows/story/platform
  → 按任务选择 data/knowledge、data/feedback、data/analytics
  → 准备故事输入
  → 用户确认
  → 创建 jobs/<job-id>/
  → 配图
  → Edge TTS
  → 音频校验
  → 准备当前故事
  → Remotion 渲染
  → 复制最终视频到 outputs/<job-id>/
  → 记录任务和用户反馈到 data/operations、data/feedback
```

## 代码入口

```powershell
cd app/create-video
npm run make:video
```

`make:video` 会为每次运行创建独立任务目录，生成阶段文件写入 `work/`，媒体写入 `media/`，视频写入 `output/`，并复制到 `outputs/`。

## 用户反馈

用户对标题、人物、镜头、旁白、节奏或成片的调整意见，必须追加到 `data/feedback/` 或相应新目录文件。下一次生成按任务选择读取这些内容，不直接修改历史任务文件。旧 `data/*.md` 仅只读兼容。
