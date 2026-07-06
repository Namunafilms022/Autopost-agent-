import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { callTextAI } from '@/lib/ai-config';
import { tryParseJson } from '@/lib/json-utils';
import { PLATFORMS, getPlatform } from '@/lib/platforms';
import { fetchProfileByToken } from '@/services/memory';
import { buildProfileContext } from '@/types/memory';

async function fetchBrand(brandId: string, token: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data, error } = await supabase.from('brands').select('*').eq('id', brandId).single();
  if (error || !data) throw new Error('Brand not found');
  return data;
}

function buildPrompt(
  brand: Record<string, string | null> | null,
  platformName: string,
  contentType: string,
  topic: string,
  goal: string,
  contentSource: 'ai' | 'asset',
  profileContext: string,
) {
  const platform = getPlatform(platformName) ?? PLATFORMS[0];

  const brandSection = brand
    ? `Generate social media content for the following brand:

**Brand:** ${brand.brand_name}
**Industry:** ${brand.industry || 'N/A'}
**Description:** ${brand.description || 'N/A'}
**Target Audience:** ${brand.target_audience || 'N/A'}
**Brand Tone:** ${brand.brand_tone || 'N/A'}
**Primary Color:** ${brand.primary_color}
**Secondary Color:** ${brand.secondary_color}
**Language:** ${brand.language || 'en'}`
    : `Generate engaging social media content without a specific brand context. Write in a general, universally appealing tone.`;

  const base = `You are a professional social media content creator and copywriter specializing in ${platformName}.
${profileContext}
${brandSection}

**Platform:** ${platformName}
**Content Type:** ${contentType}
**Topic:** ${topic}
${goal ? `**Goal:** ${goal}` : ''}

**Platform Guidelines:**
- Caption must be under ${platform.captionLimit.toLocaleString()} characters.
- Use no more than ${platform.hashtagLimit} hashtags.
- Formatting rules: ${platform.formattingRules}`;

  if (contentSource === 'asset') {
    return `${base}

Generate the following items in JSON format (no markdown, no code blocks, raw JSON only):

{
  "caption": "[Engaging caption optimized for ${platformName} — under ${platform.captionLimit} chars. Follow the platform formatting rules.]",
  "hashtags": "[Relevant hashtags as a space-separated string, e.g. '#Brand #Content'. Max ${platform.hashtagLimit} tags.]",
  "title": "[A compelling title for this content piece]"
}

Respond with ONLY the JSON object. No other text.`;
  }

  return `${base}

Generate the following three items in JSON format (no markdown, no code blocks, raw JSON only):

{
  "caption": "[Engaging caption optimized for ${platformName} — under ${platform.captionLimit} chars. Follow the platform formatting rules.]",
  "hashtags": "[Relevant hashtags as a space-separated string, e.g. '#Brand #Content'. Max ${platform.hashtagLimit} tags.]",
  "imagePrompt": "[Detailed image generation prompt describing the visual concept. Include style, lighting, mood, colors, composition. 1-2 sentences.]"
}

Respond with ONLY the JSON object. No other text.`;
}

type AIGenerated = { caption: string; hashtags: string; imagePrompt: string | null; title: string | null };

function normalizeField(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return null;
}

async function callAI(
  prompt: string,
  contentSource: 'ai' | 'asset',
  platformName: string,
): Promise<AIGenerated> {
  const platform = getPlatform(platformName) ?? PLATFORMS[0];

  const content = await callTextAI(
    [{ role: 'user', content: prompt }],
    { maxTokens: 1024, temperature: 0.8 },
  );

  const { data: parsed, error: parseError } = tryParseJson<any>(content);
  if (parseError) {
    console.error('[Generate] AI raw response:', content);
    throw new Error(`Failed to parse AI response. The AI returned an unexpected format. Try rephrasing your topic.`);
  }

  if (process.env.NODE_ENV === 'development' || Math.random() < 0.1) {
    console.log('[Generate] AI response parsed:', JSON.stringify(parsed).slice(0, 500));
  }

  const caption = normalizeField(parsed, 'caption', 'Caption');
  const hashtags = normalizeField(parsed, 'hashtags', 'hashtags', 'Hashtags');
  const imagePrompt = normalizeField(parsed, 'imagePrompt', 'image_prompt', 'ImagePrompt', 'image_prompt');
  const title = normalizeField(parsed, 'title', 'Title');

  if (contentSource === 'asset') {
    if (!caption || !hashtags || !title) {
      const missing: string[] = [];
      if (!caption) missing.push('caption');
      if (!hashtags) missing.push('hashtags');
      if (!title) missing.push('title');
      throw new Error(`AI response missing: ${missing.join(', ')}. Try rephrasing your topic.`);
    }
    return {
      caption: caption.slice(0, platform.captionLimit),
      hashtags,
      title,
      imagePrompt: null,
    };
  }

  if (!caption || !hashtags) {
    const missing: string[] = [];
    if (!caption) missing.push('caption');
    if (!hashtags) missing.push('hashtags');
    throw new Error(`AI response missing: ${missing.join(', ')}. Try rephrasing your topic.`);
  }

  return {
    caption: caption.slice(0, platform.captionLimit),
    hashtags,
    imagePrompt,
    title: null,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { brandId, platform, contentType, topic, goal, supabaseToken, contentSource, assetUrl } = body;

    if (!platform || !contentType || !topic) {
      return NextResponse.json({ error: 'Missing required fields: platform, contentType, topic' }, { status: 400 });
    }

    const source: 'ai' | 'asset' = contentSource === 'asset' ? 'asset' : 'ai';
    const profile = await fetchProfileByToken(supabaseToken).catch(() => null);
    const profileContext = buildProfileContext(profile);

    let brand;
    if (brandId) {
      brand = await fetchBrand(brandId, supabaseToken).catch(() => null);
    }

    const prompt = buildPrompt(brand, platform, contentType, topic, goal ?? '', source, profileContext);
    const result = await callAI(prompt, source, platform);

    return NextResponse.json({ ...result, assetUrl: source === 'asset' ? (assetUrl ?? null) : null });
  } catch (err: unknown) {
    console.error('Generate API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
