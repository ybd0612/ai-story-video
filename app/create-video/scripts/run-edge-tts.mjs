import { spawn } from 'node:child_process';

const python = process.env.PYTHON_BIN ?? 'C:/Users/ybd06/.workbuddy/binaries/python/envs/default/Scripts/python.exe';
const child = spawn(python, ['scripts/generate-edge-tts.py', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: false,
  env: process.env,
  cwd: process.cwd(),
});
child.on('error', (error) => { throw error; });
child.on('exit', (code) => process.exit(code ?? 1));
