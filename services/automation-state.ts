import { supabase } from '@/lib/supabase';
import type { AutomationState } from '@/types/automation-state';

export async function getAutomationState(): Promise<AutomationState | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('automation_state')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertAutomationState(state: {
  enabled?: boolean;
  last_run_at?: string;
  posts_published_today?: number;
}): Promise<AutomationState> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const existing = await getAutomationState();

  const { data, error } = await supabase
    .from('automation_state')
    .upsert({
      id: existing?.id ?? undefined,
      user_id: user.id,
      enabled: state.enabled ?? existing?.enabled ?? true,
      last_run_at: state.last_run_at ?? existing?.last_run_at ?? null,
      posts_published_today: state.posts_published_today ?? existing?.posts_published_today ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleAutomation(enabled: boolean): Promise<AutomationState> {
  return upsertAutomationState({ enabled });
}
