import { executePipeline } from './pipeline.mjs';

if (process.env.DRY_RUN === '1') {
  await import('./dry-run.mjs');
} else {
  const source = process.env.STORY_FILE ?? './story.json';
  const state = await executePipeline({
    source,
    jobId: process.env.JOB_ID ?? null,
    resume: process.env.RESUME === '1',
    retryStage: process.env.RETRY_STAGE ?? null,
    sceneId: process.env.SCENE_ID ?? null,
  });
  console.log(`一键生成完成：${state.output ?? state.jobId}`);
}
