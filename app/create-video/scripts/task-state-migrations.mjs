import fs from 'node:fs/promises';
import path from 'node:path';

const now = () => new Date().toISOString();

export const TARGET_SCHEMA_VERSION = 2;

export const migrateV1ToV2 = (legacy) => {
  const timestamp = now();
  const migrated = {
    schemaVersion: TARGET_SCHEMA_VERSION,
    jobId: legacy.jobId,
    source: legacy.source,
    storyFingerprint: legacy.storyFingerprint,
    status: legacy.status ?? 'created',
    currentStage: legacy.currentStage ?? null,
    retryableStage: legacy.retryableStage ?? null,
    nextStage: legacy.nextStage ?? 'validate',
    lastError: legacy.lastError ?? (legacy.error ? { code: 'LEGACY_ERROR', message: legacy.error } : null),
    createdAt: legacy.createdAt ?? timestamp,
    updatedAt: timestamp,
    stages: legacy.stages ?? {},
    scenes: legacy.scenes ?? {},
  };
  migrated.migrationHistory = [
    ...(legacy.migrationHistory ?? []),
    { from: 1, to: 2, migratedAt: timestamp, at: timestamp, note: 'explicit v1->v2 migration' },
  ];
  return migrated;
};

const MIGRATORS = { 1: migrateV1ToV2 };

export const migrateTaskState = (state) => {
  const version = state.schemaVersion ?? 1;
  if (version === TARGET_SCHEMA_VERSION) return state;
  const migrator = MIGRATORS[version];
  if (!migrator) {
    const error = new Error('Unsupported task state schema: ' + version);
    error.code = 'STATE_SCHEMA_UNSUPPORTED';
    throw error;
  }
  return migrator(state);
};

export const backupStateFile = async (file) => {
  const backup = file + '.' + Date.now() + '.bak';
  await fs.copyFile(file, backup);
  return backup;
};
