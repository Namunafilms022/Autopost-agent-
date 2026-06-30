import { createClient } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { ContentPlan } from '@/types/planner';

export async function getPlans(): Promise<ContentPlan[]> {
  const { data, error } = await supabase
    .from('content_plans')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await supabase.from('content_plans').delete().eq('id', id);
  if (error) throw error;
}

export async function savePlanByToken(
  token: string,
  data: { name: string; days: unknown[]; start_date: string; end_date: string },
): Promise<void> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: user } = await sb.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { error } = await sb.from('content_plans').insert({
    user_id: user.user.id,
    name: data.name,
    days: data.days,
    start_date: data.start_date,
    end_date: data.end_date,
  });

  if (error) throw error;
}
