import { supabase } from '@/lib/supabase';
import type { ContentResearch } from '@/types/research';

export async function getResearchHistory(): Promise<ContentResearch[]> {
  const { data, error } = await supabase
    .from('content_research')
    .select('*')
    .order('generated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteResearch(id: string): Promise<void> {
  const { error } = await supabase.from('content_research').delete().eq('id', id);
  if (error) throw error;
}

import { createClient } from '@supabase/supabase-js';

export async function fetchResearchByToken(token: string): Promise<ContentResearch[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data, error } = await sb
    .from('content_research')
    .select('*')
    .order('generated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function saveResearchByToken(
  token: string,
  research: {
    brand_id?: string;
    industry?: string;
    topics: unknown[];
    hashtags: unknown[];
    audio: unknown[];
    ideas: unknown[];
  },
): Promise<void> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: user } = await sb.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { error } = await sb.from('content_research').insert({
    user_id: user.user.id,
    brand_id: research.brand_id ?? null,
    industry: research.industry ?? null,
    topics: research.topics,
    hashtags: research.hashtags,
    audio: research.audio,
    ideas: research.ideas,
  });

  if (error) throw error;
}
