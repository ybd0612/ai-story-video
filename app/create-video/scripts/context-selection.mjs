import fs from 'node:fs/promises';
import path from 'node:path';

export const CONTEXT_MODES = Object.freeze(['legacy', 'new']);
export const CONTEXT_ALLOWLIST = Object.freeze(['knowledge', 'feedback', 'analytics']);
export const DEFAULT_CONTEXTS = Object.freeze(['profile', 'preferences']);

const exists = async (file) => fs.access(file).then(() => true).catch(() => false);
const within = (root, candidate) => {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

export const assertSafeContextPath = ({ root, file }) => {
  if (!within(root, file)) throw new Error(`Context path escapes root: ${file}`);
  if (path.basename(file) !== path.basename(file).replaceAll('..', '')) throw new Error(`Invalid context path: ${file}`);
  return path.resolve(file);
};

export const selectContexts = async ({ root, mode = 'new', requested = [], extension = '.json' }) => {
  if (!CONTEXT_MODES.includes(mode)) throw new Error(`Unsupported context mode: ${mode}`);
  const names = [...new Set([...DEFAULT_CONTEXTS, ...(requested ?? [])])];
  for (const name of names) {
    if (typeof name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(name)) throw new Error(`Invalid context name: ${name}`);
    if (!DEFAULT_CONTEXTS.includes(name) && !CONTEXT_ALLOWLIST.includes(name)) throw new Error(`Context is not allowlisted: ${name}`);
  }
  const selected = [];
  for (const name of names) {
    const file = assertSafeContextPath({ root, file: path.join(root, name + extension) });
    if (await exists(file)) selected.push({ name, path: file, required: DEFAULT_CONTEXTS.includes(name) });
    else if (DEFAULT_CONTEXTS.includes(name)) throw new Error(`Required context missing: ${name}`);
  }
  const records = selected.map(({ name, path: selectedPath, required }) => ({ name, canonicalPath: path.relative(path.resolve(root), selectedPath).replaceAll('\\\\', '/'), required }));
  return { mode, selected, records };
};
