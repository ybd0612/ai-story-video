import { spawn } from 'node:child_process';
import { pythonInvocation } from './runtime-tools.mjs';

const python = await pythonInvocation();
const child = spawn(python.command, [...python.args, 'scripts/generate-edge-tts.py', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: false,
  env: process.env,
  cwd: process.cwd(),
});
child.on('error', (error) => { throw error; });
child.on('exit', (code) => process.exit(code ?? 1));
