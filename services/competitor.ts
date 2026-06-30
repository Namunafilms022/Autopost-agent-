import { createClient } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { CompetitorAnalysis } from '@/types/competitor';

export async function getAnalyses(): Promise<CompetitorAnalysis[]> {
  const { data, error } = await supabase
    .from('competitor_analyses')
    .select('*')
    .order('generated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteAnalysis(id: string): Promise<void> {
  const { error } = await supabase.from('competitor_analyses').delete().eq('id', id);
  if (error) throw error;
}

export async function saveAnalysisByToken(
  token: string,
  data: {
    handle: string;
    platform: string;
    posting_frequency: unknown;
    caption_style: unknown;
    best_hashtags: unknown[];
    content_ideas: unknown[];
    analysis?: string;
  },
): Promise<void> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: user } = await sb.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { error } = await sb.from('competitor_analyses').insert({
    user_id: user.user.id,
    handle: data.handle,
    platform: data.platform,
    posting_frequency: data.posting_frequency,
    caption_style: data.caption_style,
    best_hashtags: data.best_hashtags,
    content_ideas: data.content_ideas,
    analysis: data.analysis ?? null,
  });

  if (error) throw error;
}
