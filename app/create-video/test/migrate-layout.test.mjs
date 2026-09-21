import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { mirror, check } from '../scripts/migrate-layout.mjs';

const root = path.resolve(process.cwd(), '../..');
// data/ 的个人运行时主源按设计不入 Git；新克隆缺这些文件时跳过，不算失败
const DATA_SOURCES = ['data/context/profile.md', 'data/context/preferences.md', 'data/knowledge/legacy.md', 'data/analytics/history.md', 'data/operations/tasks.md'];
const hasUserData = (await Promise.all(DATA_SOURCES.map((file) => fs.access(path.join(root, file)).then(() => true, () => false)))).every(Boolean);

test('layout migration is idempotent and rejects target drift', {
  skip: hasUserData ? false : '未检测到 data/ 个人运行时主源（该目录不入库），跳过镜像一致性校验',
}, async () => {
  const targets = ['data/profile.md', 'data/preferences.md', 'data/knowledge.md', 'data/history.md', 'data/tasks.md', 'templates/story/title-template.md', 'templates/story/script-template.md'];
  await mirror();
  await assert.doesNotReject(() => check());
  const original = await fs.readFile(path.join(root, targets[0]), 'utf8');
  await fs.writeFile(path.join(root, targets[0]), `${original}\nchanged`);
  await assert.rejects(() => mirror(), /Migration target differs/);
  await fs.writeFile(path.join(root, targets[0]), original);
  await assert.doesNotReject(() => check());
  // 本文件 import migrate-layout.mjs 时不得触发 mirror（import.meta.url 守卫）：
  // 上面的 doesNotReject 只有在漂移已被显式 mirror() 调用发现时才成立，若 import 有副作用
  // 第一次 mirror 早已抛错，测试会以未捕获异常失败。
  // Mirror outputs are intentionally retained as local compatibility artifacts; data/.migration is ignored.
});
