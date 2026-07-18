import { NextResponse } from 'next/server';

async function generatePollinationsImage(prompt: string, seed: number): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1920&nologo=true&seed=${seed}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) continue;
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 1000) continue;
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch { /* retry */ }
  }
  return null;
}

const STYLE_SUFFIXES = [
  ', cinematic lighting',
  ', dramatic composition, vibrant colors',
  ', detailed texture, atmospheric',
];

export async function POST(req: Request) {
  let body: { prompt: string; count?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  const count = Math.min(Math.max(body.count || 3, 2), 5);

  const parts = body.prompt.split(',').map((s: string) => s.trim()).filter(Boolean);
  const prompts = Array.from({ length: count }, (_, i) => {
    if (parts[i]) return parts[i];
    const base = parts[0] || body.prompt.trim();
    const suffix = STYLE_SUFFIXES[i % STYLE_SUFFIXES.length];
    return `${base}${suffix}`;
  });

  const baseSeed = Date.now();
  const results = await Promise.all(
    prompts.map((p, i) => generatePollinationsImage(p, baseSeed + i * 9999))
  );

  const images = results.filter((r): r is string => r !== null);

  if (images.length === 0) {
    return NextResponse.json({
      error: 'Failed to generate images from Pollinations (free provider). Try a different prompt.',
    }, { status: 503 });
  }

  return NextResponse.json({ images });
}
