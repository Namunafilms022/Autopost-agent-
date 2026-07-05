import { supabase } from '@/lib/supabase';

export interface ContentOutput {
  caption: string;
  hashtags: string;
  title: string;
  imagePrompt: string;
}

export interface ScriptOutput {
  hook: string;
  script: string;
  cta: string;
  estimatedDuration: string;
  sceneSuggestions: string[];
}

export interface VideoPromptOutput {
  videoPrompt: string;
  style: string;
  duration: string;
  musicVibe: string;
}

export interface ImageOutput {
  imageUrl: string;
  generationTime: number;
  provider: string;
}

export async function generateContent(params: {
  platform: string;
  contentType: string;
  topic: string;
  goal: string;
  contentSource: 'ai' | 'asset';
  assetUrl: string | null;
  brandId?: string | null;
}): Promise<ContentOutput> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, supabaseToken: session.access_token }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Error ${res.status}`);
  }

  return res.json();
}

export async function generateQuickContent(params: {
  topic: string;
  platform: string;
  style: string;
}): Promise<ContentOutput> {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch('/api/generate/quick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, supabaseToken: session?.access_token }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Error ${res.status}`);
  }

  return res.json();
}

export async function generateImage(params: {
  topic: string;
  brandId?: string | null;
  platform?: string | null;
  customPrompt?: boolean;
}): Promise<ImageOutput> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch('/api/generate/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandId: params.brandId || null,
      platform: params.platform || null,
      topic: params.topic,
      customPrompt: params.customPrompt || null,
      supabaseToken: session.access_token,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Error ${res.status}`);
  }

  return res.json();
}

export async function generateImagePrompt(params: {
  topic: string;
  platform?: string | null;
  caption?: string | null;
  script?: string | null;
  brandId?: string | null;
}): Promise<{
  imagePrompt: string;
  style: string;
  lighting: string;
  camera: string;
  composition: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch('/api/generate/image-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandId: params.brandId || null,
      platform: params.platform || null,
      topic: params.topic,
      caption: params.caption || null,
      script: params.script || null,
      supabaseToken: session.access_token,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Error ${res.status}`);
  }

  return res.json();
}

export async function generateScript(params: {
  platform: string;
  topic: string;
  brandId?: string | null;
}): Promise<ScriptOutput> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch('/api/generate/script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandId: params.brandId || null,
      platform: params.platform,
      topic: params.topic,
      supabaseToken: session.access_token,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Error ${res.status}`);
  }

  return res.json();
}

export async function generateVideoPrompt(params: {
  topic: string;
  caption: string;
}): Promise<VideoPromptOutput> {
  const res = await fetch('/api/generate/video-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: params.topic, caption: params.caption }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Error ${res.status}`);
  }

  return res.json();
}
