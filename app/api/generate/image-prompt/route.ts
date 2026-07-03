import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { callTextAI } from '@/lib/ai-config';
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

interface ImagePromptResult {
  imagePrompt: string;
  style: string;
  lighting: string;
  camera: string;
  composition: string;
}

async function callAI(prompt: string): Promise<ImagePromptResult> {
  const content = await callTextAI(
    [{ role: 'user', content: prompt }],
    { maxTokens: 2048, temperature: 0.8 },
  );

  const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);

  if (!parsed.imagePrompt) {
    throw new Error('Missing image prompt in AI response');
  }

  return {
    imagePrompt: parsed.imagePrompt,
    style: parsed.style ?? '',
    lighting: parsed.lighting ?? '',
    camera: parsed.camera ?? '',
    composition: parsed.composition ?? '',
  };
}

function buildPrompt(
  topic: string,
  platformName: string | null,
  caption: string | null,
  script: string | null,
  brand: Record<string, string | null> | null,
  profileContext: string,
) {
  const platform = platformName ? getPlatform(platformName) : null;

  let brandSection = '';
  if (brand) {
    brandSection = `
**Brand:** ${brand.brand_name}
**Industry:** ${brand.industry || 'N/A'}
**Brand Tone:** ${brand.brand_tone || 'N/A'}
**Primary Color:** ${brand.primary_color}
**Secondary Color:** ${brand.secondary_color}`;
  }

  let contextSection = '';
  if (caption) contextSection += `\n**Generated Caption:** ${caption}`;
  if (script) contextSection += `\n**Video Script:** ${script}`;
  if (platform) contextSection += `\n**Platform:** ${platformName}`;

  return `You are a professional AI image prompt engineer. Generate a detailed, production-quality image prompt suitable for image generation models like Flux, Imagen, GPT Image, Midjourney, and SDXL.

Use the following context to create a prompt that perfectly matches the brand and content:${brandSection}${contextSection}

**Topic:** ${topic}
${profileContext}

**Prompt Requirements:**
- Subject: Clear description of the main subject
- Environment: Detailed setting and background
- Mood/Atmosphere: Emotional tone
- Lighting: Specific lighting conditions
- Lens/Camera: Camera type and lens specifications
- Camera Angle: Shot angle and perspective
- Composition: Framing and layout
- Color Palette: Specific colors and harmonies
- Realism Level: Photorealistic / Stylized / Artistic
- Aspect Ratio: 16:9 / 9:16 / 1:1 / 4:3 (choose based on platform)
- Negative Prompt: What to avoid

Generate the following JSON structure (no markdown, no code blocks, raw JSON only):

{
  "imagePrompt": "[Complete, detailed image generation prompt — 2-4 sentences covering subject, environment, mood, lighting, colors, and style. Ready to paste into any AI image generator.]",
  "style": "[Art style — e.g. 'Photorealistic', 'Cinematic', 'Minimalist', 'Illustration', '3D Render', 'Oil Painting']",
  "lighting": "[Lighting description — e.g. 'Golden hour, soft warm backlighting', 'Dramatic side lighting with deep shadows', 'Soft diffused studio lighting']",
  "camera": "[Camera specs — e.g. 'Shot on 35mm lens, f/1.8, shallow depth of field', 'Wide angle 24mm, sharp focus', 'Drone aerial shot']",
  "composition": "[Composition notes — e.g. 'Rule of thirds, subject centered', 'Leading lines toward focal point', 'Symmetrical framing']"
}

Respond with ONLY the JSON object. No other text.`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { brandId, platform, topic, caption, script, supabaseToken } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    let brand: Record<string, string | null> | null = null;
    if (brandId && supabaseToken) {
      brand = await fetchBrand(brandId, supabaseToken).catch(() => null);
    }

    const profile = supabaseToken
      ? await fetchProfileByToken(supabaseToken).catch(() => null)
      : null;
    const profileContext = buildProfileContext(profile);

    const prompt = buildPrompt(topic, platform ?? null, caption ?? null, script ?? null, brand, profileContext);
    const result = await callAI(prompt);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('Image Prompt API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
