# 维护指南

> 本文档隶属 [项目总纲](../PROJECT_INDEX.md)，关键路径以总纲 SSOT 为准。

## 新增代码

只放入 `app/create-video/`，不要把用户数据或生成结果写入代码目录。

## 新增生成能力

必须接受任务目录相关环境变量，并将输入、中间结果、媒体和输出写入当前 `jobs/<job-id>/`。禁止固定写入共享的 `public/images/`、`public/audio/` 或 `out/`。

注意：现有单阶段脚本的**缺省值**仍是这些共享路径（`generate-story-images.mjs` 的 `STORY_IMAGE_DIR=./public/images`、`generate-edge-tts.py` 的 `STORY_AUDIO_DIR=./public/audio`、`render-video.mjs` 的 `VIDEO_OUTPUT=./out/story-video.mp4`），靠 `pipeline.mjs` 注入任务目录变量来覆盖。新增能力时不要照抄这套缺省值，也不要把共享路径当成正式落点。

## 变更检查

```powershell
cd app/create-video
npm run doctor
npm run typecheck
npm test
node scripts/migrate-layout.mjs --check
node --check scripts/make-video.mjs
node --check scripts/generate-story-images.mjs
node --check scripts/prepare-story.mjs
node --check scripts/render-video.mjs
"$env:PYTHON_BIN" -m py_compile scripts/generate-edge-tts.py scripts/tts_retry.py
```

`migrate-layout.mjs --check` 会校验 `data/` 与 `templates/` 的主源—镜像一致性以及 `templates/catalog.json` 的 sha256；改过主源或 catalog 收录的文件后必须先跑 `mirror` 再跑 `--check`（口径见 `PROJECT_INDEX.md` §2.5）。

没有真实输入或密钥时，先执行无副作用预检：

```powershell
npm run dry-run -- ./story.json
```

每个任务会在创建后写入 `jobs/<job-id>/status.json`，记录阶段状态、失败原因和可重试阶段。图片和渲染输出均拒绝无条件覆盖；失败任务应根据状态文件定位阶段后重试。

不要在没有密钥、用户确认和真实输入的情况下调用图片或配音服务。

## 新克隆注意

`data/` 的个人运行时上下文（`context/`、`knowledge/`、`analytics/`、`operations/`）按设计不入 Git，因此在干净克隆上：

- `node scripts/migrate-layout.mjs --check` 会报 `Migration source missing: data/context/profile.md` —— 这是**缺个人数据**，不是漂移；本机初始化这些文件后才可用。
- `npm test` 中的布局镜像用例会带原因自动 skip（其余用例应全绿），别把它当回归。
- `.gitattributes` 已固定 `* text=auto eol=lf`。`templates/catalog.json` 与 `data/.migration/layout-map.json` 按字节钉 sha256，若在本机改回 `core.autocrlf=true` 的检出行为会得到 CRLF 文件，catalog 哈希校验将必然失败——遇到 `catalog hash mismatch` 先核对文件行尾，再怀疑内容。

## 体积维护

本项目不提供 Remotion Studio 网页预览，只保留命令行生成链路。`node_modules/.cache/` 和 `node_modules/.remotion/` 是可重建缓存，体积异常时可以清理后重新生成；不要清理 `package-lock.json`。
