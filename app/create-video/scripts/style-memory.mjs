import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_STYLE_MEMORY_FILE = path.resolve('../../data/memory/style-preferences.json');

const normalize = (value) => String(value ?? '').trim().toLowerCase();
const exists = async (file) => fs.access(file).then(() => true).catch(() => false);

export const loadStyleMemory = async (file = DEFAULT_STYLE_MEMORY_FILE) => {
  const memoryFile = path.resolve(file);
  if (!(await exists(memoryFile))) return { version: 1, rules: [] };
  const memory = JSON.parse(await fs.readFile(memoryFile, 'utf8'));
  if (!memory || typeof memory !== 'object' || !Array.isArray(memory.rules)) {
    throw new Error(`风格记忆格式无效：${memoryFile}`);
  }
  return memory;
};

const scoreRule = (rule, topic) => {
  const scope = normalize(rule.scope);
  const normalizedTopic = normalize(topic);
  const keywords = Array.isArray(rule.keywords) ? rule.keywords.map(normalize).filter(Boolean) : [];
  if (!normalizedTopic) return -1;
  if (scope && normalizedTopic === scope) return 1000 + Number(rule.priority ?? 0);
  if (scope && normalizedTopic.includes(scope)) return 800 + Number(rule.priority ?? 0);
  if (keywords.some((keyword) => normalizedTopic.includes(keyword))) return 700 + Number(rule.priority ?? 0);
  if (scope && scope.split(/[\s,，、/]+/).filter(Boolean).some((word) => normalizedTopic.includes(word))) {
    return 500 + Number(rule.priority ?? 0);
  }
  return -1;
};

export const selectStyleRule = (memory, topic) => memory.rules
  .map((rule, index) => ({ rule, index, score: scoreRule(rule, topic) }))
  .filter((item) => item.score >= 0 && typeof item.rule.style === 'string' && item.rule.style.trim())
  .sort((a, b) => b.score - a.score || b.index - a.index)[0]?.rule ?? null;

export const resolveStoryStyle = async ({ topic, style = '', memoryFile } = {}) => {
  if (typeof style === 'string' && style.trim()) {
    return { style: style.trim(), source: 'story' };
  }
  const memory = await loadStyleMemory(memoryFile);
  const rule = selectStyleRule(memory, topic);
  return rule
    ? { style: rule.style.trim(), source: 'project-memory', rule }
    : { style: '', source: 'none' };
};

export const saveStyleRule = async ({ scope, style, priority = 100, source = 'user', memoryFile = DEFAULT_STYLE_MEMORY_FILE }) => {
  if (!String(scope ?? '').trim()) throw new Error('风格记忆缺少 scope');
  if (!String(style ?? '').trim()) throw new Error('风格记忆缺少 style');
  const file = path.resolve(memoryFile);
  const memory = await loadStyleMemory(file);
  const rules = memory.rules.filter((rule) => normalize(rule.scope) !== normalize(scope));
  rules.push({ scope: String(scope).trim(), style: String(style).trim(), priority: Number(priority), source, updatedAt: new Date().toISOString() });
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify({ version: 1, rules }, null, 2)}\n`, 'utf8');
  return file;
};
