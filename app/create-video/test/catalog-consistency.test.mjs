import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { checkCatalogHashes } from '../scripts/migrate-layout.mjs';

test('catalog check rejects modified template content', async () => {
  const root = path.resolve(process.cwd(), '../..');
  const file = path.join(root, 'templates/title-template.md');
  const original = await fs.readFile(file, 'utf8');
  await fs.writeFile(file, `${original}\nC consistency test`);
  try {
    await assert.rejects(() => checkCatalogHashes(), /catalog hash mismatch/);
  } finally {
    await fs.writeFile(file, original);
  }
  await assert.doesNotReject(() => checkCatalogHashes());
});
