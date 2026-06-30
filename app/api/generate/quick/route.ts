import { NextResponse } from 'next/server';

import { PLATFORMS, getPlatform } from '@/lib/platforms';
import { fetchProfileByToken } from '@/services/memory';
import { buildProfileContext } from '@/types/memory';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001';

function buildQuickPrompt(platformName: string, topic: string, style: string, profileContext: string) {
  const platform = getPlatform(platformName) ?? PLATFORMS[0];

  return `You are a professional social media content creator and copywriter.
${profileContext}
Generate social media content for the following:

**Topic:** ${topic}
**Platform:** ${platformName}
**Style:** ${style}

**Platform Guidelines:**
- Caption must be under ${platform.captionLimit.toLocaleString()} characters.
- Use no more than ${platform.hashtagLimit} hashtags.
- ${platform.formattingRules}

Generate the following three items in JSON format (no markdown, no code blocks, raw JSON only):

{
  "caption": "[Engaging caption optimized for ${platformName} in a ${style} style — under ${platform.captionLimit} chars.]",
  "hashtags": "[5-10 relevant hashtags as a space-separated string, e.g. '#Brand #Content'. Max ${platform.hashtagLimit} tags.]",
  "imagePrompt": "[Detailed image generation prompt describing the visual concept. Style: ${style}. Include mood, colors, composition. 1-2 sentences.]"
}

Respond with ONLY the JSON object. No other text.`;
}

async function callOpenRouter(prompt: string, platformName: string, retries = 2) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');
  const platform = getPlatform(platformName) ?? PLATFORMS[0];

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
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

      if (!parsed.caption || !parsed.hashtags || !parsed.imagePrompt) {
        throw new Error('Missing required fields in AI response');
      }

      return {
        caption: parsed.caption.slice(0, platform.captionLimit),
        hashtags: parsed.hashtags,
        imagePrompt: parsed.imagePrompt,
      };
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  throw new Error('Failed to generate content');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, platform, style, supabaseToken } = body;

    if (!topic || !platform) {
      return NextResponse.json({ error: 'Topic and Platform are required' }, { status: 400 });
    }

    const profile = supabaseToken ? await fetchProfileByToken(supabaseToken).catch(() => null) : null;
    const profileContext = buildProfileContext(profile);

    const prompt = buildQuickPrompt(platform, topic, style ?? 'Casual', profileContext);
    const result = await callOpenRouter(prompt, platform);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('Quick generate API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
