import test from 'node:test';
import assert from 'node:assert/strict';
import { listPythonCandidates, resolvePython, resolvePythonBin, pythonInvocation } from '../scripts/runtime-tools.mjs';

const okEntry = (argv) => ({
  ok: true,
  bin: argv[0],
  args: argv.slice(1),
  display: argv.join(' '),
  executable: `/abs/${argv[0]}`,
  version: '3.13.14',
  edgeTts: '7.0.2',
});

const failEntry = (argv, reason) => ({
  ok: false,
  bin: argv[0],
  args: argv.slice(1),
  display: argv.join(' '),
  reason,
});

test('PYTHON_BIN 为空视为未设置，非空则成为唯一候选', () => {
  assert.equal(listPythonCandidates({ PYTHON_BIN: '   ' }).explicit, false);
  assert.equal(listPythonCandidates({ PYTHON_BIN: 'x' }).candidates.length, 1);
  assert.equal(listPythonCandidates({ PYTHON_BIN: 'x' }).candidates[0][0], 'x');
  assert.deepEqual(listPythonCandidates({ PYTHON_BIN: '  C:/tools/python.exe  ' }).candidates, [['C:/tools/python.exe']]);
});

test('自动候选优先 VIRTUAL_ENV，且包含 py 启动器', () => {
  const { candidates } = listPythonCandidates({ VIRTUAL_ENV: 'C:/venvs/dsp' });
  assert.equal(candidates[0].length, 1);
  assert.match(candidates[0][0], /C:\\venvs\\dsp[/\\](Scripts|bin)[/\\]python/);
  assert.ok(candidates.some((argv) => argv[0] === 'python'));
});

test('显式 PYTHON_BIN 不可用时拒绝回退到其它候选', async () => {
  const calls = [];
  await assert.rejects(
    () => resolvePython({
      env: { PYTHON_BIN: 'C:/tools/broken-python.exe' },
      probeEntry: (argv) => { calls.push(argv); return failEntry(argv, "ModuleNotFoundError: No module named 'edge_tts'"); },
    }),
    (error) => {
      assert.equal(error.code, 'PYTHON_BIN_UNUSABLE');
      assert.match(error.message, /拒绝回退/);
      assert.match(error.message, /C:\/tools\/broken-python\.exe/);
      return true;
    },
  );
  assert.deepEqual(calls, [['C:/tools/broken-python.exe']]);
});

test('自动探测选中第一个通过能力探测的候选并保留前置参数', async () => {
  const resolved = await resolvePython({
    env: {},
    probeEntry: (argv) => (argv.includes('-3') ? okEntry(argv) : failEntry(argv, "ModuleNotFoundError: No module named 'edge_tts'")),
  });
  assert.equal(resolved.bin, 'py');
  assert.deepEqual(resolved.args, ['-3']);

  const invocation = await pythonInvocation({ env: {}, probeEntry: (argv) => okEntry(argv) });
  assert.equal(typeof invocation.command, 'string');
  assert.ok(Array.isArray(invocation.args));
  assert.ok(invocation.command.length > 0);
});

test('全部候选不可用时抛出 PYTHON_RUNTIME_NOT_FOUND 并列出尝试', async () => {
  await assert.rejects(
    () => resolvePython({ env: {}, probeEntry: (argv) => failEntry(argv, '解释器不存在') }),
    (error) => {
      assert.equal(error.code, 'PYTHON_RUNTIME_NOT_FOUND');
      assert.match(error.message, /pip install edge-tts/);
      assert.ok(error.attempts.length >= 1);
      assert.ok(error.attempts.every((attempt) => attempt.reason === '解释器不存在'));
      return true;
    },
  );
});

test('resolvePythonBin 与 pythonInvocation 复用同一解析', async () => {
  const env = { PYTHON_BIN: 'C:/tools/python.exe' };
  const probeEntry = (argv) => okEntry(argv);
  assert.equal(await resolvePythonBin({ env, probeEntry }), 'C:/tools/python.exe');
  assert.deepEqual(await pythonInvocation({ env, probeEntry }), { command: 'C:/tools/python.exe', args: [] });
});

test('真实探测：node 冒充 python 时失败而不是静默通过', async () => {
  await assert.rejects(
    () => resolvePython({ env: { PYTHON_BIN: process.execPath } }),
    (error) => error.code === 'PYTHON_BIN_UNUSABLE',
  );
});
