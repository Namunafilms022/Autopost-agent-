import { supabase } from '@/lib/supabase';
import type { AutomationRule, AutomationRuleInput } from '@/types/automation';

export async function getAutomationRules(): Promise<AutomationRule[]> {
  const { data, error } = await supabase
    .from('automation_rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createAutomationRule(input: AutomationRuleInput): Promise<AutomationRule> {
  const { data, error } = await supabase
    .from('automation_rules')
    .insert({
      name: input.name,
      description: input.description ?? null,
      trigger_type: input.trigger_type,
      trigger_config: input.trigger_config,
      action_type: input.action_type,
      action_config: input.action_config,
      enabled: input.enabled ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAutomationRule(
  id: string,
  input: Partial<AutomationRuleInput & { enabled: boolean }>,
): Promise<AutomationRule> {
  const { data, error } = await supabase
    .from('automation_rules')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAutomationRule(id: string): Promise<void> {
  const { error } = await supabase.from('automation_rules').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleAutomationRule(id: string, enabled: boolean): Promise<AutomationRule> {
  const { data, error } = await supabase
    .from('automation_rules')
    .update({ enabled })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
