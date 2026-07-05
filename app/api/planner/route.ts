import { NextResponse } from 'next/server';

import { callTextAI } from '@/lib/ai-config';
import { tryParseJson } from '@/lib/json-utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { industry, brand } = body;

    const prompt = `You are a social media content strategist. Create a 30-day content calendar.

${brand ? `Brand: ${brand}` : ''}
${industry ? `Industry: ${industry}` : ''}

Return ONLY valid JSON (no markdown, no code blocks) with a "name" and "days" array of 30 entries:

{
  "name": "[A catchy name for this 30-day plan]",
  "days": [
    {
      "day": 1,
      "platform": "[Instagram | TikTok | LinkedIn | X | Facebook]",
      "content_type": "[Post | Reel | Carousel | Story | Video | Thread]",
      "topic": "[Specific content topic for this day]",
      "caption_preview": "[1-2 sentence caption preview]",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "goal": "[Awareness | Engagement | Traffic | Sales | Community]"
    }
  ]
}

Requirements:
- Generate exactly 30 days with variety in platforms and content types.
- Space out platform usage — don't use the same platform 3 days in a row.
- Topics should follow a logical narrative arc across the 30 days.
- Each entry should have 3-5 hashtags.
- Goals should vary based on content type.
- Make topics specific and actionable, not generic.
- Tailor everything to the ${industry ?? 'general'} industry.`;

    const content = await callTextAI(
      [{ role: 'user', content: prompt }],
      { maxTokens: 8192, temperature: 0.8 },
    );

    const { data: parsed, error: parseError } = tryParseJson<any>(content);
    if (parseError) throw new Error(`Failed to parse AI response: ${parseError}`);

    if (!parsed.days || parsed.days.length !== 30) {
      throw new Error('AI did not return exactly 30 days');
    }

    // Calculate start/end dates from today
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 29);

    const daysWithDates = parsed.days.map((d: Record<string, unknown>, i: number) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      return { ...d, date: date.toISOString().split('T')[0], day: i + 1 };
    });

    return NextResponse.json({
      name: parsed.name ?? `${30}-Day Content Plan`,
      days: daysWithDates,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
    });
  } catch (err: unknown) {
    console.error('Planner API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
