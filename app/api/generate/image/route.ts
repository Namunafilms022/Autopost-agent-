import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { callTextAI } from '@/lib/ai-config';
import '@/lib/providers/pollinations-image';
import '@/lib/providers/google-image';
import { getImageProvider } from '@/lib/image-provider';
import { PLATFORMS } from '@/lib/platforms';
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

function buildInternalPrompt(
  topic: string,
  platformName: string | null,
  brand: Record<string, string | null> | null,
  profileContext: string,
): string {
  let brandSection = '';
  if (brand) {
    brandSection = `
**Brand:** ${brand.brand_name}
**Industry:** ${brand.industry || 'N/A'}
**Brand Tone:** ${brand.brand_tone || 'N/A'}
**Primary Color:** ${brand.primary_color}
**Secondary Color:** ${brand.secondary_color}`;
  }

  const platform = platformName
    ? PLATFORMS.find((p) => p.name === platformName)
    : null;

  return `You are an AI image prompt engineer. Generate one concise, detailed image generation prompt for the following:${brandSection}
${platform ? `\n**Platform:** ${platformName}` : ''}
**Topic:** ${topic}
${profileContext}

The prompt must include: subject, environment, mood, lighting, colors, style, and composition.

Respond with ONLY the prompt text. No markdown, no formatting, no JSON. Just the prompt.`;
}

async function generatePrompt(
  topic: string,
  platformName: string | null,
  brand: Record<string, string | null> | null,
  profileContext: string,
  retries = 2,
): Promise<string> {
  const prompt = buildInternalPrompt(topic, platformName, brand, profileContext);

  const content = await callTextAI(
    [{ role: 'user', content: prompt }],
    { maxTokens: 512, temperature: 0.7 },
  );

  return content.replace(/```/g, '').trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { brandId, platform, topic, customPrompt, supabaseToken } = body;

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    let internalPrompt: string;

    if (customPrompt) {
      internalPrompt = topic;
    } else {
      let brand: Record<string, string | null> | null = null;
      if (brandId && supabaseToken) {
        brand = await fetchBrand(brandId, supabaseToken).catch(() => null);
      }

      const profile = supabaseToken
        ? await fetchProfileByToken(supabaseToken).catch(() => null)
        : null;
      const profileContext = buildProfileContext(profile);

      internalPrompt = await generatePrompt(topic, platform ?? null, brand, profileContext);
    }

    const provider = getImageProvider();
    const { imageUrl, generationTime, provider: providerName } = await provider.generate({
      prompt: internalPrompt,
      supabaseToken,
    });

    return NextResponse.json({
      imageUrl,
      generationTime,
      provider: providerName,
    });
  } catch (err: unknown) {
    console.error('Image generate API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
