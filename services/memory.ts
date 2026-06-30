import { createClient } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { UserProfile, UserProfileInput } from '@/types/memory';

export async function getUserProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertUserProfile(input: UserProfileInput): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      writing_style: input.writing_style ?? null,
      emoji_preference: input.emoji_preference ?? null,
      caption_length: input.caption_length ?? null,
      cta_preference: input.cta_preference ?? null,
      favorite_hashtags: input.favorite_hashtags ?? [],
      preferred_platforms: input.preferred_platforms ?? [],
      additional_notes: input.additional_notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchProfileByToken(token: string): Promise<UserProfileInput | null> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data } = await sb
    .from('user_profiles')
    .select('*')
    .maybeSingle();

  if (!data) return null;

  return {
    writing_style: data.writing_style ?? undefined,
    emoji_preference: data.emoji_preference ?? undefined,
    caption_length: data.caption_length ?? undefined,
    cta_preference: data.cta_preference ?? undefined,
    favorite_hashtags: data.favorite_hashtags ?? [],
    preferred_platforms: data.preferred_platforms ?? [],
    additional_notes: data.additional_notes ?? undefined,
  };
}
