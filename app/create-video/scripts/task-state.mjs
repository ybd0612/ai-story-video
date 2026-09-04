import fs from 'node:fs/promises';
import path from 'node:path';

export const createTaskState = ({ jobId, source, storyFingerprint }) => ({
  jobId,
  source,
  storyFingerprint,
  status: 'created',
  currentStage: null,
  retryableStage: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  stages: {},
});

export const updateTaskState = async (file, state, patch = {}) => {
  const next = {
    ...state,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
};

export const runStage = async (file, state, name, action) => {
  const startedAt = new Date().toISOString();
  let next = await updateTaskState(file, state, {
    status: 'running',
    currentStage: name,
    retryableStage: name,
    stages: { ...state.stages, [name]: { status: 'running', startedAt } },
  });
  try {
    await action();
    next = await updateTaskState(file, next, {
      status: 'running',
      currentStage: null,
      stages: { ...next.stages, [name]: { status: 'completed', startedAt, finishedAt: new Date().toISOString() } },
    });
    return next;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateTaskState(file, next, {
      status: 'failed',
      currentStage: name,
      error: message,
      failedAt: new Date().toISOString(),
      stages: { ...next.stages, [name]: { status: 'failed', startedAt, failedAt: new Date().toISOString(), error: message } },
    });
    throw error;
  }
};
