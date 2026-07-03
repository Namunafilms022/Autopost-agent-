import { supabase } from '@/lib/supabase';
import type { SocialAccount, SocialAccountInput } from '@/types/social';

export async function getSocialAccounts(): Promise<SocialAccount[]> {
  const { data, error } = await supabase
    .from('social_accounts')
    .select('*')
    .order('platform', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function connectSocialAccount(input: SocialAccountInput): Promise<SocialAccount> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('social_accounts')
    .upsert({
      user_id: user.id,
      platform: input.platform,
      account_name: input.account_name,
      account_id: input.account_id,
      access_token: input.access_token,
      refresh_token: input.refresh_token ?? null,
      token_expires_at: input.token_expires_at ?? null,
      connected_at: new Date().toISOString(),
      status: 'connected',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function disconnectSocialAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from('social_accounts')
    .update({ status: 'disconnected', access_token: '', refresh_token: '' })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteSocialAccount(id: string): Promise<void> {
  const { error } = await supabase.from('social_accounts').delete().eq('id', id);
  if (error) throw error;
}

export async function updateToken(
  id: string,
  token: string,
  refreshToken?: string,
  expiresAt?: string,
): Promise<SocialAccount> {
  const { data, error } = await supabase
    .from('social_accounts')
    .update({
      access_token: token,
      refresh_token: refreshToken ?? null,
      token_expires_at: expiresAt ?? null,
      status: 'connected',
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
