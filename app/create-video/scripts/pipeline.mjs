import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createJobId, getJobPaths, OUTPUTS_ROOT } from './job-paths.mjs';
import { createTaskState, readTaskState, runStage, updateTaskState, markInterrupted, STAGE_ORDER } from './task-state.mjs';
import { stageIsComplete, validateDeliverContract } from './stage-contracts.mjs';

const run = (command, args, env = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: false, env: { ...process.env, ...env }, cwd: process.cwd() });
  child.on('error', reject); child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exit code ${code}`)));
});
const fingerprint = (story) => crypto.createHash('sha256').update(JSON.stringify(story)).digest('hex');
const exists = async (file) => fs.access(file).then(() => true).catch(() => false);

export async function executePipeline({ source, jobId: requestedJobId = null, resume = false, retryStage = null, sceneId = null } = {}) {
  const sourcePath = path.resolve(source ?? './story.json');
  const sourceStory = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
  const jobId = requestedJobId ?? createJobId(sourceStory.title ?? sourceStory.name ?? 'story');
  const paths = getJobPaths(jobId); const stateFile = path.join(paths.root, 'status.json');
  const lockFile = path.join(paths.root, 'run.lock'); const currentFingerprint = fingerprint(sourceStory);
  if (retryStage && !['images', 'tts'].includes(retryStage)) throw new Error(`不支持镜头级补偿阶段：${retryStage}`);
  if (sceneId && !sourceStory.scenes?.some((scene) => String(scene.id) === String(sceneId))) throw new Error(`无效 SCENE_ID：${sceneId}`);
  if (await exists(lockFile)) throw new Error(`任务正在运行：${jobId}`);
  await fs.mkdir(paths.root, { recursive: true }); await fs.writeFile(lockFile, `${process.pid}\n`, { flag: 'wx' });
  try {
    let state;
    if (resume) {
      state = await markInterrupted(stateFile);
      if (state.status === 'delivered') throw new Error('已交付任务拒绝 resume');
      if (state.storyFingerprint !== currentFingerprint) throw new Error('故事内容已变化，请创建新 job');
    } else {
      if (await exists(stateFile)) throw new Error(`任务目录已存在，拒绝覆盖：${paths.root}`);
      for (const directory of [paths.input, paths.work, paths.images, paths.audio, paths.output]) await fs.mkdir(directory, { recursive: true });
      state = await updateTaskState(stateFile, createTaskState({ jobId, source: sourcePath, storyFingerprint: currentFingerprint }));
      await fs.copyFile(sourcePath, path.join(paths.input, 'story.source.json'));
    }
    const approvalFile = process.env.STORY_APPROVAL_FILE ? path.resolve(process.env.STORY_APPROVAL_FILE) : path.join(path.dirname(sourcePath), 'story.approved');
    const approval = JSON.parse(await fs.readFile(approvalFile, 'utf8'));
    if (approval.fingerprint !== currentFingerprint) throw new Error('故事内容已在审核后变更，请重新执行保存和审核流程');
    const jobSource = path.join(paths.input, 'story.source.json');
    const withImages = path.join(paths.work, 'story.with-images.json'); const withAudio = path.join(paths.work, 'story.with-audio.json'); const currentStory = path.join(paths.work, 'currentStory.json'); const videoOutput = path.join(paths.output, 'story-video.mp4'); const delivered = path.join(OUTPUTS_ROOT, jobId, 'story-video.mp4');
    const expectedScenes = sourceStory.scenes?.map((scene) => String(scene.id)) ?? [];
    const contexts = {
      validate: { paths, input: jobSource }, images: { paths, input: jobSource, output: withImages, sceneIds: expectedScenes }, tts: { paths, input: withImages, output: withAudio, sceneIds: expectedScenes },
      'audio-validation': { paths, input: withAudio, output: withAudio, sceneIds: expectedScenes }, prepare: { paths, input: withAudio, output: currentStory, sceneIds: expectedScenes }, render: { paths, input: currentStory, output: videoOutput }, deliver: { paths, rendered: videoOutput, delivered },
    };
    const commands = {
      validate: [process.execPath, ['scripts/validate-story.mjs', sourcePath], {}], images: [process.execPath, ['scripts/generate-story-images.mjs'], { STORY_FILE: sourcePath, STORY_OUTPUT: withImages, STORY_IMAGE_DIR: paths.images, STORY_PUBLIC_ROOT: paths.root }],
      tts: [process.env.PYTHON_BIN ?? 'python', ['scripts/generate-edge-tts.py'], { STORY_FILE: withImages, STORY_OUTPUT: withAudio, STORY_AUDIO_DIR: paths.audio, STORY_PUBLIC_ROOT: paths.root }],
      'audio-validation': [process.execPath, ['scripts/validate-audio-duration.mjs', withAudio], { STORY_FILE: withAudio, STORY_PUBLIC_ROOT: paths.root }], prepare: [process.execPath, ['scripts/prepare-story.mjs'], { STORY_SOURCE: withAudio, STORY_TARGET: currentStory }], render: [process.execPath, ['scripts/render-video.mjs'], { STORY_CURRENT_FILE: currentStory, VIDEO_OUTPUT: videoOutput, JOB_PUBLIC_ROOT: paths.root }],
    };
    let startIndex = retryStage ? STAGE_ORDER.indexOf(retryStage) : 0;
    for (const stage of STAGE_ORDER.slice(startIndex)) {
      state = await readTaskState(stateFile);
      const targeted = retryStage && stage === retryStage;
      if (!targeted && !retryStage && state.stages[stage]?.status === 'completed') {
        const valid = await stageIsComplete(stage, contexts[stage]);
        if (valid) continue;
        throw new Error(`阶段 ${stage} 状态为 completed 但产物契约不通过，拒绝静默覆盖`);
      }
      if (stage === 'deliver') { await runStage(stateFile, state, stage, async () => { await fs.mkdir(path.dirname(delivered), { recursive: true }); await fs.copyFile(videoOutput, delivered); await validateDeliverContract(contexts.deliver); }); }
      else { const [command, args, env] = commands[stage]; await runStage(stateFile, state, stage, () => run(command, args, { ...env, ...(sceneId ? { TARGET_SCENE_ID: sceneId } : {}) })); }
    }
    state = await updateTaskState(stateFile, await readTaskState(stateFile), { status: 'delivered', currentStage: null, retryableStage: null, output: delivered });
    await fs.writeFile(paths.metadata, `${JSON.stringify({ jobId, source: sourcePath, output: delivered, createdAt: new Date().toISOString() }, null, 2)}\n`);
    return state;
  } finally { await fs.rm(lockFile, { force: true }); }
}
