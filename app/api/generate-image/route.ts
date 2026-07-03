import { NextResponse } from 'next/server';

import { callTextAI } from '@/lib/ai-config';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const content = await callTextAI(
      [{ role: 'user', content: prompt }],
      { maxTokens: 2048, temperature: 0.7 },
    );

    const urlMatch = content.match(/https?:\/\/[^\s\)]+(?:png|jpg|jpeg|gif|webp)/i);
    const imageUrl = urlMatch ? urlMatch[0] : null;

    if (!imageUrl) throw new Error('No image generated');

    return NextResponse.json({ imageUrl });
  } catch (err: unknown) {
    console.error('Generate image API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
