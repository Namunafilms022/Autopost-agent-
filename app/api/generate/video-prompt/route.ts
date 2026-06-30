import { NextResponse } from 'next/server';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, caption } = body;

    if (!topic?.trim() && !caption?.trim()) {
      return NextResponse.json({ error: 'Topic or caption is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');

    const prompt = `You are a video content strategist. Create a detailed video production prompt.

Topic: ${topic ?? 'N/A'}
Caption: ${caption ?? topic ?? 'N/A'}

Return ONLY valid JSON (no markdown, no code blocks):

{
  "videoPrompt": "[A single, detailed paragraph describing the video concept — include visual style, scenes, transitions, duration, music vibe, and on-screen text. This will be used to generate or describe the video.]",
  "duration": "[e.g. 15-30 seconds, 30-60 seconds]",
  "style": "[e.g. Talking head, B-roll montage, Animation, Cinematic, UGC-style]",
  "musicVibe": "[e.g. Upbeat corporate, Chill lo-fi, Inspirational piano, Energetic EDM]"
}

Requirements:
- The video prompt should be vivid and production-ready.
- Include camera angles, lighting suggestions, and scene transitions.
- Match the tone of the caption/topic.
- Suggest realistic, achievable video concepts.`;

    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      throw new Error(`OpenRouter API error (${res.status}): ${errorBody}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');

    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error('Video prompt API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
