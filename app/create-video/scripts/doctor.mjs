import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

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
const python = process.env.PYTHON_BIN ?? 'C:/Users/ybd06/.workbuddy/binaries/python/envs/default/Scripts/python.exe';
await checkCommand('Python', python, ['--version']);
await checkCommand('edge-tts', python, ['-c', 'import edge_tts']);
const envFile = path.resolve('.env.example');
checks.push({ name: '环境变量模板', ok: await fs.access(envFile).then(() => true).catch(() => false), detail: envFile });
checks.push({ name: 'Agnes API Key', ok: Boolean(process.env.AGNES_API_KEY), detail: '仅检查是否存在，不输出密钥' });

for (const check of checks) console.log(`${check.ok ? '通过' : '失败'} ${check.name}${check.detail ? `：${check.detail}` : ''}`);
if (checks.some((check) => !check.ok)) process.exitCode = 1;
