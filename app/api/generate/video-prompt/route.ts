import { NextResponse } from 'next/server';

import { callTextAI } from '@/lib/ai-config';
import { tryParseJson } from '@/lib/json-utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, caption } = body;

    if (!topic?.trim() && !caption?.trim()) {
      return NextResponse.json({ error: 'Topic or caption is required' }, { status: 400 });
    }

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

    const content = await callTextAI(
      [{ role: 'user', content: prompt }],
      { maxTokens: 1024, temperature: 0.8 },
    );

    const { data: parsed, error: parseError } = tryParseJson(content);
    if (parseError) throw new Error(`Failed to parse AI response: ${parseError}`);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error('Video prompt API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
