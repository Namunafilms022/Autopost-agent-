import { NextResponse } from 'next/server';

import { callTextAI } from '@/lib/ai-config';
import { tryParseJson } from '@/lib/json-utils';
import { PLATFORMS, getPlatform } from '@/lib/platforms';
import { fetchProfileByToken } from '@/services/memory';
import { buildProfileContext } from '@/types/memory';

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

async function callAI(prompt: string, platformName: string) {
  const platform = getPlatform(platformName) ?? PLATFORMS[0];

  const content = await callTextAI(
    [{ role: 'user', content: prompt }],
    { maxTokens: 1024, temperature: 0.8 },
  );

  const { data: parsed, error: parseError } = tryParseJson<any>(content);
  if (parseError) throw new Error(`Failed to parse AI response: ${parseError}`);

  if (!parsed.caption || !parsed.hashtags || !parsed.imagePrompt) {
    throw new Error('Missing required fields in AI response');
  }

  return {
    caption: parsed.caption.slice(0, platform.captionLimit),
    hashtags: parsed.hashtags,
    imagePrompt: parsed.imagePrompt,
  };
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
    const result = await callAI(prompt, platform);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('Quick generate API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
