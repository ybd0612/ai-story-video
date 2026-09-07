import fs from 'node:fs/promises';
import path from 'node:path';

export const SCHEMA_VERSION = 2;
export const STAGE_ORDER = ['validate', 'images', 'tts', 'audio-validation', 'prepare', 'render', 'deliver'];
const now = () => new Date().toISOString();
const errorMessage = (error) => error instanceof Error ? error.message : String(error);

export const createTaskState = ({ jobId, source, storyFingerprint }) => {
  const timestamp = now();
  return { schemaVersion: SCHEMA_VERSION, jobId, source, storyFingerprint, status: 'created', currentStage: null, retryableStage: null, nextStage: 'validate', lastError: null, createdAt: timestamp, updatedAt: timestamp, stages: {}, scenes: {} };
};

const migrateV1 = (legacy) => ({
  schemaVersion: SCHEMA_VERSION,
  jobId: legacy.jobId,
  source: legacy.source,
  storyFingerprint: legacy.storyFingerprint,
  status: legacy.status ?? 'created',
  currentStage: legacy.currentStage ?? null,
  retryableStage: legacy.retryableStage ?? null,
  nextStage: legacy.nextStage ?? 'validate',
  lastError: legacy.lastError ?? (legacy.error ? { code: 'LEGACY_ERROR', message: legacy.error } : null),
  createdAt: legacy.createdAt ?? now(), updatedAt: now(),
  stages: legacy.stages ?? {}, scenes: legacy.scenes ?? {},
});

export const readTaskState = async (file) => {
  const raw = await fs.readFile(file, 'utf8');
  const state = JSON.parse(raw);
  if (state.schemaVersion === SCHEMA_VERSION) return state;
  if (state.schemaVersion !== 1 && state.schemaVersion !== undefined) {
    const error = new Error(`Unsupported task state schema: ${state.schemaVersion}`);
    error.code = 'STATE_SCHEMA_UNSUPPORTED';
    throw error;
  }
  const backup = `${file}.v1.bak`;
  try {
    await fs.writeFile(backup, raw, { flag: 'wx' }).catch(async (error) => { if (error.code !== 'EEXIST') throw error; });
    const migrated = migrateV1(state);
    await atomicWrite(file, migrated);
    return migrated;
  } catch (error) {
    const wrapped = new Error(`Task state migration failed: ${errorMessage(error)}`);
    wrapped.code = 'STATE_MIGRATION_FAILED';
    throw wrapped;
  }
};

const atomicWrite = async (file, value) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  try { await fs.rename(temporary, file); } catch (error) { await fs.rm(temporary, { force: true }); throw error; }
};

export const updateTaskState = async (file, state, patch = {}) => {
  let latest = state;
  try { latest = await readTaskState(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const next = { ...latest, ...patch, updatedAt: now() };
  await atomicWrite(file, next);
  return next;
};

const SENSITIVE_FIELD = /(?:api[-_]?key|access[-_]?token|token|secret|password|authorization|cookie|credential|private[-_]?key)/i;
const secretValues = () => Object.values(process.env).filter((value) => typeof value === 'string' && value.length >= 8);
const scrubSecrets = (value) => {
  if (typeof value !== 'string') return value;
  return secretValues().reduce((result, secret) => result.replaceAll(secret, '[REDACTED]'), value);
};
const sanitizeEventDetails = (value, key = '') => {
  if (SENSITIVE_FIELD.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => sanitizeEventDetails(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, sanitizeEventDetails(childValue, childKey)]));
  }
  return scrubSecrets(value);
};

export const appendEvent = async (file, event, details = {}) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const record = { timestamp: now(), event, ...sanitizeEventDetails(details) };
  await fs.appendFile(file, `${JSON.stringify(record)}\n`, 'utf8');
  return record;
};

export const updateSceneState = async (file, sceneId, kind, patch) => {
  const state = await readTaskState(file);
  const existing = state.scenes?.[sceneId] ?? {};
  const scenes = { ...state.scenes, [sceneId]: { ...existing, [kind]: { ...(existing[kind] ?? {}), ...patch, updatedAt: now() } } };
  return updateTaskState(file, state, { scenes });
};

export const markInterrupted = async (file) => {
  const state = await readTaskState(file);
  const running = Object.entries(state.stages).find(([, stage]) => stage.status === 'running');
  if (!running) return state;
  const [name, stage] = running;
  return updateTaskState(file, state, { status: 'failed', currentStage: name, retryableStage: name, lastError: { code: 'INTERRUPTED', message: 'Stage interrupted before completion' }, stages: { ...state.stages, [name]: { ...stage, status: 'failed', error: 'INTERRUPTED', finishedAt: now() } } });
};

export const runStage = async (file, state, name, action, options = {}) => {
  if (!STAGE_ORDER.includes(name)) throw new Error(`Unknown stage: ${name}`);
  const latest = await readTaskState(file).catch(() => state);
  const previous = latest.stages?.[name] ?? { status: 'pending', attempts: 0 };
  const startedAt = now();
  const runningStage = { ...previous, status: 'running', attempts: (previous.attempts ?? 0) + 1, startedAt, error: null };
  let next = await updateTaskState(file, latest, { status: 'running', currentStage: name, retryableStage: name, lastError: null, stages: { ...latest.stages, [name]: runningStage } });
  try {
    await options.onEvent?.('stage_started', { stage: name, attempt: runningStage.attempts });
    await action();
    if (options.validate) await options.validate();
    await options.onEvent?.('quality_check_passed', { stage: name });
    const completed = { ...runningStage, status: 'completed', finishedAt: now(), error: null };
    next = await updateTaskState(file, next, { status: 'running', currentStage: null, nextStage: STAGE_ORDER[STAGE_ORDER.indexOf(name) + 1] ?? null, stages: { ...next.stages, [name]: completed } });
    return next;
  } catch (error) {
    const message = errorMessage(error);
    const failed = { ...runningStage, status: 'failed', finishedAt: now(), error: message };
    await options.onEvent?.('stage_failed', { stage: name, error: message });
    await updateTaskState(file, next, { status: 'failed', currentStage: name, retryableStage: name, lastError: { code: 'STAGE_FAILED', message }, stages: { ...next.stages, [name]: failed } });
    throw error;
  }
};
