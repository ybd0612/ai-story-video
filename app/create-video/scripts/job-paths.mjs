import path from 'node:path';

export const PROJECT_ROOT = path.resolve(process.cwd(), '../..');
export const APP_ROOT = path.resolve(process.cwd());
export const JOBS_ROOT = path.join(PROJECT_ROOT, 'jobs');
export const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');
export const DATA_ROOT = path.join(PROJECT_ROOT, 'data');

export const slugify = (value) => String(value ?? 'task')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 48) || 'task';

export const createJobId = (name = 'story') => {
  const stamp = new Date().toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '-');
  return `${stamp}-${slugify(name)}`;
};

export const getJobRoot = (jobId) => path.join(JOBS_ROOT, jobId);
export const getJobPaths = (jobId) => {
  const root = getJobRoot(jobId);
  return {
    root,
    input: path.join(root, 'input'),
    inputStory: path.join(root, 'input', 'story.source.json'),
    inputApproval: path.join(root, 'input', 'story.approved'),
    snapshotManifest: path.join(root, 'input', 'snapshot.manifest.json'),
    refs: path.join(root, 'input', 'refs'),
    workflowRef: path.join(root, 'input', 'refs', 'story-video.workflow.json'),
    profileRef: path.join(root, 'input', 'refs', 'douyin-vertical.profile.json'),
    catalogRef: path.join(root, 'input', 'refs', 'catalog.json'),
    events: path.join(root, 'events.jsonl'),
    work: path.join(root, 'work'),
    images: path.join(root, 'media', 'images'),
    audio: path.join(root, 'media', 'audio'),
    output: path.join(root, 'output'),
    metadata: path.join(root, 'job.json'),
  };
};
