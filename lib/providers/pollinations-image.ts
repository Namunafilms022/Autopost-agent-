import { createClient } from '@supabase/supabase-js';

import { registerImageProvider, type ImageInput, type ImageOutput, type ImageProvider } from '@/lib/image-provider';

const POLLINATIONS_URL = 'https://image.pollinations.ai/prompt';

const MODELS = ['flux', 'turbo', ''];

async function uploadBuffer(buffer: Buffer, contentType: string, token: string): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const path = `generated/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from('assets').upload(path, buffer, {
    contentType,
    upsert: false,
  });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('assets').getPublicUrl(path);

  return publicUrl;
}

const pollinationsProvider: ImageProvider = {
  name: 'pollinations',

  async generate(input: ImageInput): Promise<ImageOutput> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (const model of MODELS) {
      try {
        const params = model ? `?model=${model}` : '';
        const url = `${POLLINATIONS_URL}/${encodeURIComponent(input.prompt)}${params}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          lastError = new Error(`Pollinations error (${res.status}): ${body}`);
          continue;
        }

        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await res.arrayBuffer());

        const imageUrl = await uploadBuffer(buffer, contentType, input.supabaseToken);
        const generationTime = Date.now() - startTime;

        return { imageUrl, generationTime, provider: 'pollinations' };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError || new Error('All Pollinations models failed');
  },
};

registerImageProvider('pollinations', () => pollinationsProvider);
