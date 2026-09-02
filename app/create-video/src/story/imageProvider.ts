export type ImageOutput = {
  url?: string;
  base64?: string;
};

export type ImageRequest = {
  prompt: string;
  sceneId: string;
  size?: '1K' | '2K' | '3K' | '4K';
  ratio?: '1:1' | '3:4' | '4:3' | '16:9' | '9:16' | '2:3' | '3:2' | '21:9';
  returnBase64?: boolean;
};

export type ImageProvider = {
  name: string;
  generateImage: (request: ImageRequest) => Promise<ImageOutput>;
};

type AgnesResponse = {
  data?: Array<{ url?: string | null; b64_json?: string | null }>;
};

/** Agnes Image 2.5 Flash 适配器。密钥只从运行时配置传入，不写入项目文件。 */
export const createAgnesImageProvider = (config: {
  apiKey: string;
  endpoint?: string;
  model?: string;
}): ImageProvider => ({
  name: 'agnes-image-2.5-flash',
  async generateImage({ prompt, size = '1K', ratio = '9:16', returnBase64 = false }) {
    const response = await fetch(config.endpoint ?? 'https://api.agnes-ai.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model ?? 'agnes-image-2.5-flash',
        prompt,
        size,
        ratio,
        ...(returnBase64
          ? { return_base64: true }
          : { extra_body: { response_format: 'url' } }),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Agnes 图片 API 请求失败：HTTP ${response.status} ${detail}`);
    }

    const payload = (await response.json()) as AgnesResponse;
    const result = payload.data?.[0];
    const output: ImageOutput = returnBase64
      ? { base64: result?.b64_json ?? undefined }
      : { url: result?.url ?? undefined };

    if (!output.url && !output.base64) {
      throw new Error('Agnes 图片 API 响应中没有找到 url 或 b64_json');
    }

    return output;
  },
});
