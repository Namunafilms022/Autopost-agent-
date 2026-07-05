import { NextResponse } from 'next/server';

import { callTextAI } from '@/lib/ai-config';
import { tryParseJson } from '@/lib/json-utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { brand, industry } = body;

    const prompt = `You are a social media trend researcher. Generate a comprehensive trend report with realistic, actionable data.

Brand: ${brand ?? 'N/A'}
Industry: ${industry ?? 'General'}

Return ONLY valid JSON (no markdown, no code blocks):

{
  "topics": [
    {
      "topic": "[Specific trending topic idea tailored to ${industry ?? 'general audience'}]",
      "reason": "[Why this is trending now]",
      "platform": "[Instagram | TikTok | X | LinkedIn | YouTube]",
      "trend_score": [1-100]
    }
  ],
  "hashtags": [
    {
      "hashtag": "[trending hashtag without #]",
      "posts_estimate": "[e.g. 2.5M posts]",
      "category": "[e.g. Industry, Lifestyle, Seasonal]",
      "relevance": "[Why relevant to this brand/industry]"
    }
  ],
  "audio": [
    {
      "title": "[Trending audio/song name]",
      "creator": "[Creator name]",
      "genre": "[Genre]",
      "mood": "[Mood/vibe]",
      "why_trending": "[Why this audio is trending]"
    }
  ],
  "ideas": [
    {
      "title": "[Viral content idea title]",
      "format": "[Reel | Carousel | Story | Post | Thread | Video]",
      "hook": "[The opening hook that grabs attention]",
      "estimated_reach": "[e.g. 50K-100K reach]"
    }
  ]
}

Requirements:
- Generate 5-8 items per category.
- Make them realistic, specific, and currently plausible for 2026.
- Tailor to the ${industry ?? 'general'} industry.
- Trend scores should vary (not all 100).
- Audio suggestions should be realistic existing songs or sounds.`;

    const content = await callTextAI(
      [{ role: 'user', content: prompt }],
      { maxTokens: 4096, temperature: 0.9 },
    );

    const { data: parsed, error: parseError } = tryParseJson(content);
    if (parseError) throw new Error(`Failed to parse AI response: ${parseError}`);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error('Research API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
