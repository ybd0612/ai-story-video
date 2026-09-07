import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const hash = async (file) => crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
const copy = async (source, target) => { await fs.mkdir(path.dirname(target), { recursive: true }); await fs.copyFile(source, target); };
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));

export const createMetadataManifest = async ({ paths, projectRoot }) => {
  const workflowSource = path.join(projectRoot, 'templates/workflows/story-video.workflow.json');
  const profileSource = path.join(projectRoot, 'templates/platform/douyin-vertical.profile.json');
  const catalogSource = path.join(projectRoot, 'templates/catalog.json');
  const [workflow, profile, catalog] = await Promise.all([readJson(workflowSource), readJson(profileSource), readJson(catalogSource)]);
  if (workflow.stages?.map((stage) => stage.name).join(',') !== 'validate,images,tts,audio-validation,prepare,render,deliver') throw new Error('Workflow stage allowlist mismatch');
  if (profile.aspectRatio !== '9:16' || profile.image?.size !== '1K' || profile.audio?.provider !== 'edge-tts' || profile.renderer?.provider !== 'remotion') throw new Error('Platform profile violates default provider contract');
  const workflowEntry = catalog.workflows?.find((item) => item.id === workflow.id);
  const profileEntry = catalog.profiles?.find((item) => item.id === profile.id);
  if (!workflowEntry || !profileEntry) throw new Error('Selected workflow/profile missing from catalog');
  await Promise.all([copy(workflowSource, paths.workflowRef), copy(profileSource, paths.profileRef), copy(catalogSource, paths.catalogRef)]);
  const manifest = { schemaVersion: 1, workflow: { id: workflow.id, version: workflowEntry.version, sha256: await hash(paths.workflowRef) }, profile: { id: profile.id, version: profileEntry.version, sha256: await hash(paths.profileRef) }, catalog: { version: catalog.schemaVersion, sha256: await hash(paths.catalogRef) } };
  await fs.writeFile(path.join(paths.input, 'metadata.manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifest;
};

export const readMetadataManifest = async (paths) => JSON.parse(await fs.readFile(path.join(paths.input, 'metadata.manifest.json'), 'utf8'));
