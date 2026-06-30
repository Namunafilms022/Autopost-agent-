import { supabase } from '@/lib/supabase';
import type { UserSettings, UserSettingsInput } from '@/types/settings';

export async function getSettings(): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return data;
}

export async function upsertSettings(input: UserSettingsInput): Promise<UserSettings> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, ...input })
    .select()
    .single();

  if (error) throw error;
  return data;
}
