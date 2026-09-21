import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { resolvePython } from './runtime-tools.mjs';

const checks = [];
const checkCommand = (name, command, args = []) => new Promise((resolve) => {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  child.on('error', () => resolve(false));
  child.on('exit', (code) => {
    checks.push({ name, ok: code === 0, detail: output.trim().split(/\r?\n/)[0] });
    resolve(code === 0);
  });
});

await checkCommand('Node.js', process.execPath, ['--version']);
await checkCommand('ffprobe', process.env.FFPROBE_BIN ?? 'ffprobe', ['-version']);
const pythonSource = (process.env.PYTHON_BIN ?? '').trim() ? 'PYTHON_BIN' : 'PATH 自动探测';
try {
  const python = await resolvePython();
  checks.push({ name: 'Python', ok: true, detail: `${pythonSource} → ${python.executable}（${python.version}）` });
  checks.push({ name: 'edge-tts', ok: true, detail: `由上述解释器导入，版本 ${python.edgeTts}` });
} catch (error) {
  checks.push({ name: 'Python + edge-tts', ok: false, detail: error.message });
}
const envFile = path.resolve('.env.example');
checks.push({ name: '环境变量模板', ok: await fs.access(envFile).then(() => true).catch(() => false), detail: envFile });
checks.push({ name: 'Agnes API Key', ok: Boolean(process.env.AGNES_API_KEY), detail: '仅检查是否存在，不输出密钥' });

for (const check of checks) console.log(`${check.ok ? '通过' : '失败'} ${check.name}${check.detail ? `：${check.detail}` : ''}`);
if (checks.some((check) => !check.ok)) process.exitCode = 1;
