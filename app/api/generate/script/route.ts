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

interface ScriptResult {
  hook: string;
  script: string;
  cta: string;
  estimatedDuration: string;
  sceneSuggestions: string[];
}

async function callAI(prompt: string): Promise<ScriptResult> {
  const content = await callTextAI(
    [{ role: 'user', content: prompt }],
    { maxTokens: 2048, temperature: 0.8 },
  );

  const { data: parsed, error: parseError } = tryParseJson<Record<string, unknown>>(content);
  if (parseError) throw new Error(`Failed to parse AI response: ${parseError}`);

  if (!parsed.hook || !parsed.script || !parsed.cta) {
    throw new Error('Missing required fields in AI response');
  }

  return {
    hook: parsed.hook,
    script: parsed.script,
    cta: parsed.cta,
    estimatedDuration: parsed.estimatedDuration ?? '30 sec',
    sceneSuggestions: Array.isArray(parsed.sceneSuggestions) ? parsed.sceneSuggestions : [],
  };
}

function buildPrompt(
  topic: string,
  platformName: string,
  brand: Record<string, string | null> | null,
  profileContext: string,
) {
  const platform = getPlatform(platformName) ?? PLATFORMS[0];

  let brandSection = '';
  if (brand) {
    brandSection = `
**Brand:** ${brand.brand_name}
**Industry:** ${brand.industry || 'N/A'}
**Description:** ${brand.description || 'N/A'}
**Target Audience:** ${brand.target_audience || 'N/A'}
**Brand Tone:** ${brand.brand_tone || 'N/A'}
**Primary Color:** ${brand.primary_color}
**Secondary Color:** ${brand.secondary_color}
**Language:** ${brand.language || 'en'}`;
  }

  return `You are a professional social media script writer specializing in ${platformName} video content.
${profileContext}
Generate a complete, production-ready video script for the following:${brandSection}

**Platform:** ${platformName}
**Topic:** ${topic}

**Platform Guidelines:**
- Caption limit: ${platform.captionLimit.toLocaleString()} characters.
- Max hashtags: ${platform.hashtagLimit}.
- Formatting: ${platform.formattingRules}

Generate the following JSON structure (no markdown, no code blocks, raw JSON only):

{
  "hook": "[A powerful opening line for the first 3 seconds — must grab attention immediately. Platform-optimized and punchy.]",
  "script": "[Full video script in natural, conversational language. Platform-optimized and brand-aware. Write the entire spoken script from start to finish.]",
  "cta": "[A strong, clear call-to-action for the end of the video. Platform-appropriate.]",
  "estimatedDuration": "[Estimated video duration — choose one: '15 sec', '30 sec', '45 sec', '60 sec']",
  "sceneSuggestions": [
    "[Scene 1: description of visual — hook moment]",
    "[Scene 2: description of visual — main content]",
    "[Scene 3: description of visual — key point]",
    "[Scene 4: description of visual — closing/CTA]"
  ]
}

Respond with ONLY the JSON object. No other text.`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { brandId, platform, topic, supabaseToken } = body;

    if (!platform || !topic) {
      return NextResponse.json({ error: 'Platform and topic are required' }, { status: 400 });
    }

    let brand: Record<string, string | null> | null = null;
    if (brandId && supabaseToken) {
      brand = await fetchBrand(brandId, supabaseToken).catch(() => null);
    }

    const profile = supabaseToken
      ? await fetchProfileByToken(supabaseToken).catch(() => null)
      : null;
    const profileContext = buildProfileContext(profile);

    const prompt = buildPrompt(topic, platform, brand, profileContext);
    const result = await callAI(prompt);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('Script API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
