import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const PROJECT_ROOT = path.resolve(process.cwd(), '../..');
const MAP_FILE = path.join(PROJECT_ROOT, 'data/.migration/layout-map.json');
const MAPPINGS = Object.freeze([
  ['data/profile.md', 'data/context/profile.md'],
  ['data/preferences.md', 'data/context/preferences.md'],
  ['data/knowledge.md', 'data/knowledge/legacy.md'],
  ['data/history.md', 'data/analytics/history.md'],
  ['data/tasks.md', 'data/operations/tasks.md'],
  ['templates/title-template.md', 'templates/story/title-template.md'],
  ['templates/script-template.md', 'templates/story/script-template.md'],
]);

const hashFile = async (file) => crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
const fileInfo = async (file) => ({ bytes: (await fs.stat(file)).size, sha256: await hashFile(file) });
const resolveMapping = ([source, target]) => ({ source, target, sourcePath: path.join(PROJECT_ROOT, source), targetPath: path.join(PROJECT_ROOT, target) });
const readMappings = () => MAPPINGS.map(resolveMapping);
const ensureSource = async (entry) => { try { await fs.stat(entry.sourcePath); } catch { throw new Error(`Migration source missing: ${entry.source}`); } };

const createManifest = async (entries) => ({ schemaVersion: 1, mapping: entries.map(({ source, target, sourceInfo, targetInfo }) => ({ source, target, bytes: sourceInfo.bytes, sha256: sourceInfo.sha256, targetBytes: targetInfo?.bytes ?? null, targetSha256: targetInfo?.sha256 ?? null })), generatedAt: new Date().toISOString() });

export const mirror = async () => {
  const entries = readMappings();
  for (const entry of entries) {
    await ensureSource(entry);
    entry.sourceInfo = await fileInfo(entry.sourcePath);
    try {
      entry.targetInfo = await fileInfo(entry.targetPath);
      if (entry.targetInfo.bytes !== entry.sourceInfo.bytes || entry.targetInfo.sha256 !== entry.sourceInfo.sha256) throw new Error(`Migration target differs: ${entry.target}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await fs.mkdir(path.dirname(entry.targetPath), { recursive: true });
      await fs.copyFile(entry.sourcePath, entry.targetPath);
      entry.targetInfo = await fileInfo(entry.targetPath);
    }
  }
  const manifest = await createManifest(entries);
  await fs.mkdir(path.dirname(MAP_FILE), { recursive: true });
  await fs.writeFile(MAP_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
};

export const check = async () => {
  const entries = readMappings();
  const manifest = JSON.parse(await fs.readFile(MAP_FILE, 'utf8'));
  if (JSON.stringify(manifest.mapping.map(({ source, target }) => [source, target])) !== JSON.stringify(MAPPINGS)) throw new Error('Migration mapping manifest mismatch');
  for (const entry of entries) {
    await ensureSource(entry);
    const sourceInfo = await fileInfo(entry.sourcePath);
    const targetInfo = await fileInfo(entry.targetPath);
    if (sourceInfo.bytes !== targetInfo.bytes || sourceInfo.sha256 !== targetInfo.sha256) throw new Error(`Migration check failed: ${entry.target}`);
    const recorded = manifest.mapping.find((item) => item.source === entry.source && item.target === entry.target);
    if (!recorded || recorded.bytes !== sourceInfo.bytes || recorded.sha256 !== sourceInfo.sha256 || recorded.targetBytes !== targetInfo.bytes || recorded.targetSha256 !== targetInfo.sha256) throw new Error(`Migration manifest stale: ${entry.target}`);
  }
  return true;
};

const command = process.argv[2] ?? 'mirror';
try {
  if (command === 'mirror') { await mirror(); console.log('Layout mirror complete'); }
  else if (command === '--check' || command === 'check') { await check(); console.log('Layout check passed'); }
  else throw new Error(`Unknown command: ${command}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
