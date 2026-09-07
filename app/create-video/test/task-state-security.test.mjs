import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { appendEvent } from '../scripts/task-state.mjs';

test('appendEvent redacts sensitive keys and secret values', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dsp-events-'));
  const file = path.join(directory, 'events.jsonl');
  const previous = process.env.AGNES_API_KEY;
  process.env.AGNES_API_KEY = 'sk-QA-secret';
  try {
    await appendEvent(file, 'provider_called', { apiKey: process.env.AGNES_API_KEY, message: 'request sk-QA-secret complete' });
    const content = await fs.readFile(file, 'utf8');
    assert.doesNotMatch(content, /sk-QA-secret/);
    assert.match(content, /\[REDACTED\]/);
  } finally {
    if (previous === undefined) delete process.env.AGNES_API_KEY;
    else process.env.AGNES_API_KEY = previous;
    await fs.rm(directory, { recursive: true, force: true });
  }
});
