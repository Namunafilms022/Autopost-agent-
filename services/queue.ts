import { supabase } from '@/lib/supabase';
import type { QueueItem, QueueItemInput } from '@/types/queue';

export async function getQueueItems(): Promise<QueueItem[]> {
  const { data, error } = await supabase
    .from('queue_items')
    .select('*')
    .order('scheduled_time', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getQueueItem(id: string): Promise<QueueItem | null> {
  const { data, error } = await supabase
    .from('queue_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createQueueItem(item: QueueItemInput): Promise<QueueItem> {
  const { data, error } = await supabase
    .from('queue_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateQueueItem(
  id: string,
  item: Partial<QueueItemInput>,
): Promise<QueueItem> {
  const { data, error } = await supabase
    .from('queue_items')
    .update(item)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteQueueItem(id: string): Promise<void> {
  const { error } = await supabase.from('queue_items').delete().eq('id', id);
  if (error) throw error;
}

export async function submitForApproval(id: string): Promise<QueueItem> {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('queue_items')
    .update({ status: 'pending_approval', submitted_by: user.user?.id })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approveQueueItem(id: string): Promise<QueueItem> {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('queue_items')
    .update({ status: 'approved', reviewed_by: user.user?.id, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function rejectQueueItem(id: string): Promise<QueueItem> {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('queue_items')
    .update({ status: 'rejected', reviewed_by: user.user?.id, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
