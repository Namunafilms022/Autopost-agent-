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

function normalizeField(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return null;
}

async function callAI(prompt: string, platformName: string) {
  const platform = getPlatform(platformName) ?? PLATFORMS[0];

  const content = await callTextAI(
    [{ role: 'user', content: prompt }],
    { maxTokens: 1024, temperature: 0.8 },
  );

  const { data: parsed, error: parseError } = tryParseJson<any>(content);
  if (parseError) {
    throw new Error(`Failed to parse AI response. The AI returned an unexpected format. Try rephrasing your topic.`);
  }

  const caption = normalizeField(parsed, 'caption', 'Caption');
  const hashtags = normalizeField(parsed, 'hashtags', 'hashtags', 'Hashtags');
  const imagePrompt = normalizeField(parsed, 'imagePrompt', 'image_prompt', 'ImagePrompt', 'image_prompt');

  if (!caption || !hashtags || !imagePrompt) {
    const missing: string[] = [];
    if (!caption) missing.push('caption');
    if (!hashtags) missing.push('hashtags');
    if (!imagePrompt) missing.push('imagePrompt/image_prompt');
    throw new Error(`AI response missing: ${missing.join(', ')}. Try rephrasing your topic.`);
  }

  return {
    caption: caption.slice(0, platform.captionLimit),
    hashtags,
    imagePrompt,
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
