import { NextResponse } from 'next/server';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { handle, platform } = body;

    if (!handle?.trim()) {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');

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
        max_tokens: 4096,
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
    console.error('Competitor API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
