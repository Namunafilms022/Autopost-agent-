import { createClient } from '@supabase/supabase-js';

import { registerImageProvider, type ImageInput, type ImageOutput, type ImageProvider } from '@/lib/image-provider';

const GOOGLE_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

async function uploadBuffer(buffer: Buffer, contentType: string, token: string): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const path = `generated/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from('assets').upload(path, buffer, { contentType, upsert: false });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path);
  return publicUrl;
}

const googleProvider: ImageProvider = {
  name: 'google',

  async generate(input: ImageInput): Promise<ImageOutput> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY is not configured');

    const startTime = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(`${GOOGLE_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Google AI error (${res.status}): ${body}`);
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];

    let imageData: string | null = null;
    let mimeType = 'image/jpeg';

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType;
        break;
      }
    }

    if (!imageData) {
      const text = parts.map((p: { text?: string }) => p.text ?? '').join(' ');
      const urlMatch = text.match(/https?:\/\/[^\s\)]+(?:png|jpg|jpeg|gif|webp)/i);
      if (urlMatch) {
        const imgRes = await fetch(urlMatch[0]);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const imageUrl = await uploadBuffer(buffer, imgRes.headers.get('content-type') || 'image/jpeg', input.supabaseToken);
        return { imageUrl, generationTime: Date.now() - startTime, provider: 'google' };
      }
      throw new Error('No image in Google AI response');
    }

    const buffer = Buffer.from(imageData, 'base64');
    const imageUrl = await uploadBuffer(buffer, mimeType, input.supabaseToken);
    const generationTime = Date.now() - startTime;

    return { imageUrl, generationTime, provider: 'google' };
  },
};

registerImageProvider('google', () => googleProvider);
