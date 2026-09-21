import { spawnSync } from 'node:child_process';
import path from 'node:path';

const PROBE_SCRIPT = [
  'import sys, edge_tts',
  'print(sys.executable)',
  'print(sys.version.split()[0])',
  "print(getattr(edge_tts, '__version__', 'unknown'))",
].join('\n');

const PYTHON_PROBE_TIMEOUT_MS = Number(process.env.PYTHON_PROBE_TIMEOUT_MS ?? '15000');

const venvCandidate = (env, platform = process.platform) => {
  const virtualEnv = (env.VIRTUAL_ENV ?? '').trim();
  if (!virtualEnv) return null;
  const relative = platform === 'win32'
    ? ['Scripts', 'python.exe']
    : ['bin', 'python'];
  return path.join(virtualEnv, ...relative);
};

// platform 可注入：不注入时这两个分支只有一个能在 CI 覆盖到的 OS 上被执行到
export const listPythonCandidates = (env = process.env, platform = process.platform) => {
  const explicit = (env.PYTHON_BIN ?? '').trim();
  if (explicit) return { explicit: true, candidates: [[explicit]] };
  const windows = platform === 'win32';
  const candidates = [];
  const virtual = venvCandidate(env, platform);
  if (virtual) candidates.push([virtual]);
  if (windows) candidates.push(['py', '-3']);
  candidates.push(['python'], ['python3']);
  return { explicit: false, candidates };
};

const probe = (argv, timeoutMs) => {
  const [command, ...prefixArgs] = argv;
  const result = spawnSync(command, [...prefixArgs, '-c', PROBE_SCRIPT], {
    encoding: 'utf8',
    timeout: timeoutMs,
  });
  const display = argv.join(' ');
  if (result.error || result.status !== 0) {
    const reason = result.error?.code === 'ENOENT'
      ? '解释器不存在'
      : (result.stderr || result.error?.message || '').trim().split(/\r?\n/).pop() || '无法执行';
    return { ok: false, bin: command, args: prefixArgs, display, reason };
  }
  const [executable, version, edgeTts] = (result.stdout ?? '').trim().split(/\r?\n/);
  if (!executable) {
    return { ok: false, bin: command, args: prefixArgs, display, reason: '探测输出为空' };
  }
  return { ok: true, bin: command, args: prefixArgs, display, executable, version, edgeTts };
};

export const resolvePython = async ({ env = process.env, timeoutMs = PYTHON_PROBE_TIMEOUT_MS, probeEntry = probe, platform = process.platform } = {}) => {
  const { explicit, candidates } = listPythonCandidates(env, platform);
  const probed = candidates.map((argv) => probeEntry(argv, timeoutMs));
  const hit = probed.find((entry) => entry.ok);
  if (hit) return hit;

  const attempted = probed.map((entry) => `${entry.display}（${entry.reason}）`).join('；');
  const error = new Error(explicit
    ? `PYTHON_BIN 指定的解释器不可用：${attempted}。为避免静默改用其它解释器，流水线拒绝回退。请修正 PYTHON_BIN 或为其安装 edge-tts。`
    : `未找到可用的 Python 解释器（需能 import edge_tts）。已尝试：${attempted}。请执行 pip install edge-tts，或设置 PYTHON_BIN 指向正确解释器后重新运行 npm run doctor。`);
  error.code = explicit ? 'PYTHON_BIN_UNUSABLE' : 'PYTHON_RUNTIME_NOT_FOUND';
  error.attempts = probed.map(({ display, reason }) => ({ display, reason }));
  throw error;
};

export const resolvePythonBin = async (options = {}) => (await resolvePython(options)).bin;

export const pythonInvocation = async (options = {}) => {
  const { bin, args } = await resolvePython(options);
  return { command: bin, args: [...args] };
};
