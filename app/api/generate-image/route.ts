import { NextResponse } from 'next/server';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'black-forest-labs/flux-schnell';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');

    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      throw new Error(`OpenRouter API error (${res.status}): ${errorBody}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');

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
