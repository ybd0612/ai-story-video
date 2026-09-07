import test from 'node:test';
import assert from 'node:assert/strict';
import { executePipeline } from '../scripts/pipeline.mjs';

test('resume without job id returns JOB_ID_REQUIRED', async () => {
  await assert.rejects(
    () => executePipeline({ resume: true }),
    (error) => error?.code === 'JOB_ID_REQUIRED',
  );
});
