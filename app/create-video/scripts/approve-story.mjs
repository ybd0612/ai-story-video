import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const storyFile = path.resolve(process.env.STORY_FILE ?? './story.json');
const approvalFile = path.resolve(process.env.STORY_APPROVAL_FILE ?? path.join(path.dirname(storyFile), 'story.approved'));
await fs.access(storyFile);
const story = JSON.parse(await fs.readFile(storyFile, 'utf8'));
const fingerprint = crypto.createHash('sha256').update(JSON.stringify(story)).digest('hex');
await fs.writeFile(approvalFile, `${JSON.stringify({ approvedAt: new Date().toISOString(), storyFile, fingerprint }, null, 2)}\n`, 'utf8');
await fs.writeFile(path.join(path.dirname(approvalFile), 'story.approval-state.json'), `${JSON.stringify({ status: 'approved', storyFile, fingerprint }, null, 2)}\n`, 'utf8');
console.log(`故事已确认：${storyFile}`);
console.log('现在可以执行 npm run make:video。');
