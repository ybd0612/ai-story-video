export const PROVIDER_KINDS = ['images', 'audio', 'renderer'];

export const assertProviderDescriptor = (descriptor) => {
  if (!descriptor || typeof descriptor !== 'object') throw new TypeError('Provider descriptor must be an object');
  for (const field of ['id', 'kind', 'handler']) if (typeof descriptor[field] !== 'string' || !descriptor[field]) throw new Error(`Provider descriptor missing ${field}`);
  if (!PROVIDER_KINDS.includes(descriptor.kind)) throw new Error(`Unsupported provider kind: ${descriptor.kind}`);
  return descriptor;
};

export const createProviderDescriptor = ({ id, kind, handler, capabilities = [] }) => assertProviderDescriptor({ id, kind, handler, capabilities });
