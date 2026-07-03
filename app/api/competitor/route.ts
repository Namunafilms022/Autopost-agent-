import { NextResponse } from 'next/server';

import { callTextAI } from '@/lib/ai-config';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { handle, platform } = body;

    if (!handle?.trim()) {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
    }

    const prompt = `You are a social media competitive analyst. Analyze the Instagram/TikTok account "@${handle}" on ${platform ?? 'Instagram'}.

Based on your knowledge of this brand/creator, provide a detailed competitive analysis.

Return ONLY valid JSON (no markdown, no code blocks):

{
  "posting_frequency": {
    "posts_per_week": [number estimate],
    "best_days": ["Monday", "Wednesday"],
    "best_times": "[time range e.g. 10AM-2PM EST]",
    "consistency": "[e.g. Very consistent, Posts daily, Sporadic]"
  },
  "caption_style": {
    "tone": "[e.g. Professional, Casual, Humorous, Inspirational]",
    "avg_length": "[e.g. Short (50-100 chars), Medium (150-300 chars), Long (500+ chars)]",
    "structure": "[e.g. Hook → Story → CTA, Question → Answer → CTA, Direct value]",
    "cta_style": "[e.g. Link in bio, Comment below, Save for later, Shop now]"
  },
  "best_hashtags": [
    {
      "hashtag": "[specific hashtag they use]",
      "usage_count": "[e.g. Used in 80% of posts]",
      "niche": "[e.g. Industry, Community, Branded]"
    }
  ],
  "content_ideas": [
    {
      "format": "[Reel | Carousel | Story | Post | Video]",
      "topic": "[Content topic idea based on their strategy]",
      "performance": "[Expected performance based on their engagement patterns]"
    }
  ],
  "analysis": "[2-3 sentence summary of their overall strategy, what works well, and gaps you could exploit]"
}

Requirements:
- Generate 5-8 hashtags and 3-5 content ideas.
- Make the analysis realistic and specific to the account "${handle}".
- If you don't know the specific account, create a plausible analysis based on the handle name.
- The analysis should be actionable — someone should be able to improve their strategy from this.`;

    const content = await callTextAI(
      [{ role: 'user', content: prompt }],
      { maxTokens: 4096, temperature: 0.8 },
    );

    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error('Competitor API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
