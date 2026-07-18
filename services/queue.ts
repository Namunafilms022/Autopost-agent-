import { supabase } from '@/lib/supabase';
import { tryParseJson } from '@/lib/json-utils';
import type { QueueItem, QueueItemInput, QueueItemUpdate } from '@/types/queue';

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('queue_items')
    .insert({ ...item, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateQueueItem(
  id: string,
  item: QueueItemUpdate,
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
  if (!user) throw new Error('Not authenticated');

  const { data: itemData, error: fetchError } = await supabase
    .from('queue_items')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    throw new Error(`Database fetch failed: ${fetchError.message}`);
  }

  if (!itemData) {
    throw new Error(`Post not found: item ${id} does not exist`);
  }

  if (itemData.status !== 'pending_approval') {
    throw new Error(`Cannot approve: current status is "${itemData.status}", expected "pending_approval"`);
  }

  const now = new Date().toISOString();
  const scheduled = new Date(itemData.scheduled_time);
  const updateScheduled = scheduled <= new Date() ? now : itemData.scheduled_time;

  const { error: updateError, data } = await supabase
    .from('queue_items')
    .update({
      status: 'approved',
      scheduled_time: updateScheduled,
      reviewed_by: user.user?.id,
      reviewed_at: now,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Database update failed: ${updateError.message}`);
  }

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
