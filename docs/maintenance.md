# 维护指南

> 本文档隶属 [项目总纲](../PROJECT_INDEX.md)，关键路径以总纲 SSOT 为准。

## 新增代码

只放入 `app/create-video/`，不要把用户数据或生成结果写入代码目录。

## 新增生成能力

必须接受任务目录相关环境变量，并将输入、中间结果、媒体和输出写入当前 `jobs/<job-id>/`。禁止固定写入共享的 `public/images/`、`public/audio/` 或 `out/`。

## 变更检查

```powershell
cd app/create-video
npm run typecheck
node --check scripts/make-video.mjs
node --check scripts/generate-story-images.mjs
node --check scripts/prepare-story.mjs
node --check scripts/render-video.mjs
```

不要在没有密钥、用户确认和真实输入的情况下调用图片或配音服务。
