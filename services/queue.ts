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
  try {
    console.log(`[Queue] Approving item ${id}...`);
    const { data: user } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log(`[Queue] Fetching queue item ${id}`);
    const { data: itemData, error: fetchError } = await supabase
      .from('queue_items')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error(`[Queue] Failed to fetch item ${id}:`, fetchError);
      throw fetchError;
    }

    if (!itemData) {
      throw new Error(`Item ${id} not found`);
    }

    console.log(`[Queue] Item ${id} metadata:`, {
      id: itemData.id,
      platform: itemData.platform,
      caption: itemData.caption?.substring(0, 100),
      asset_url: itemData.asset_url,
      status: itemData.status,
    });

    const publishUrl = `/api/publish/${itemData.platform.toLowerCase()}`;
    if (!itemData.asset_url) {
      throw new Error(`Item ${id} has no asset_url. Generate an image before publishing.`);
    }

    console.log(`[Queue] Attempting to publish via ${publishUrl}`);

    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': itemData.user_id || '',
      },
      body: JSON.stringify({
        caption: itemData.caption,
        image_url: itemData.asset_url,
        queue_id: itemData.id,
        user_id: itemData.user_id,
        brand_id: itemData.brand_id,
      }),
    });

    const responseBody = await publishResponse.text();
    if (!publishResponse.ok) {
      console.error(`[Queue] Publish API failed with status ${publishResponse.status}: ${responseBody}`);
      throw new Error(`Publish API failed: ${responseBody}`);
    }

    const result = JSON.parse(responseBody);
    console.log(`[Queue] Publishing succeeded:`, result);

    const { error: updateError, data } = await supabase
      .from('queue_items')
      .update({ 
        status: 'posted', 
        reviewed_by: user.user?.id, 
        reviewed_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error(`[Queue] Failed to update item ${id} to 'posted':`, updateError);
      throw updateError;
    }

    console.log(`[Queue] Item ${id} set to posted status`);
    return data;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Queue] Error approving item ${id}:`, errorMsg);

    try {
      await supabase
        .from('queue_items')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (updateError) {
      console.error(`[Queue] Failed to update item ${id} to 'failed':`, updateError);
    }

    throw error;
  }
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
