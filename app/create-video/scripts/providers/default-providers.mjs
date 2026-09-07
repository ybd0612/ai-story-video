import { createProviderDescriptor } from './provider-contracts.mjs';

export const DEFAULT_PROVIDERS = Object.freeze({
  images: createProviderDescriptor({ id: 'agnes-images', kind: 'images', handler: 'scripts/generate-story-images.mjs', capabilities: ['png', 'scene-retry'] }),
  audio: createProviderDescriptor({ id: 'edge-tts', kind: 'audio', handler: 'scripts/generate-edge-tts.py', capabilities: ['mp3', 'scene-retry'] }),
  renderer: createProviderDescriptor({ id: 'remotion', kind: 'renderer', handler: 'scripts/render-video.mjs', capabilities: ['mp4'] }),
});

export const getDefaultProvider = (kind) => {
  const provider = DEFAULT_PROVIDERS[kind];
  if (!provider) throw new Error(`No default provider for kind: ${kind}`);
  return provider;
};
