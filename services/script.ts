import { supabase } from '@/lib/supabase';
import type { Script, ScriptInput } from '@/types/script';

export async function createScript(input: ScriptInput): Promise<Script> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('scripts')
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateScript(id: string, input: Partial<ScriptInput>): Promise<Script> {
  const { data, error } = await supabase
    .from('scripts')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
