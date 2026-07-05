import { NextResponse } from 'next/server';

import { callTextAI } from '@/lib/ai-config';
import { tryParseJson } from '@/lib/json-utils';
import { fetchProfileByToken } from '@/services/memory';
import { buildProfileContext } from '@/types/memory';

function buildSystemPrompt(profileContext: string): string {
  return `You are "Ghost", an AI social media content assistant. The user gives you a vague prompt like "I need an Instagram reel about AI". Your job is to:

1. Infer the platform, content type, topic, and style from their message.
2. Generate a complete social media post optimized for that platform.
${profileContext}
Respond in JSON format (no markdown, no code blocks, raw JSON only):

{
  "inferred": {
    "platform": "[Inferred platform: Instagram, Facebook, LinkedIn, X, or Threads]",
    "contentType": "[Inferred content type: Post, Reel, Story, Carousel, Video, Article, or Thread]",
    "style": "[Inferred style: Casual, Professional, Playful, Luxury, Authoritative, Friendly, Bold, or Minimalist]",
    "reasoning": "[Brief explanation of why you inferred these choices]"
  },
  "caption": "[Full, engaging, platform-optimized caption. Follow platform rules: Instagram=conversational+emojis, LinkedIn=professional, X=concise, etc. Include line breaks if appropriate.]",
  "hashtags": "[Relevant hashtags as space-separated string, e.g. '#AI #Technology']",
  "imagePrompt": "[Detailed image generation prompt describing the visual concept. Include style, mood, colors, composition.]"
}

Rules:
- Caption must respect platform character limits: Instagram=2200, Facebook=63206, LinkedIn=3000, X=280, Threads=500.
- Max hashtags: Instagram/Facebook/LinkedIn=30, X/Threads=10.
- Be creative but practical. The caption should feel ready to post.
- If the user doesn't specify a platform, default to Instagram.
- If the user doesn't specify a style, default to the most appropriate for their topic.`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, supabaseToken } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const profile = supabaseToken ? await fetchProfileByToken(supabaseToken).catch(() => null) : null;
    const profileContext = buildProfileContext(profile);
    const systemPrompt = buildSystemPrompt(profileContext);

    const content = await callTextAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      { maxTokens: 2048, temperature: 0.8 },
    );

    const { data: parsed, error: parseError } = tryParseJson(content);
    if (parseError) throw new Error(`Failed to parse AI response: ${parseError}`);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error('Chat API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
