import { supabase } from '@/lib/supabase';
import type { PublishLog, PublishLogInput } from '@/types/publish-log';

const MAX_RETRY = 3;
export { MAX_RETRY };

export async function getPublishLogs(limit = 50): Promise<PublishLog[]> {
  const { data, error } = await supabase
    .from('publish_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getPublishLogsForItem(queueItemId: string): Promise<PublishLog[]> {
  const { data, error } = await supabase
    .from('publish_logs')
    .select('*')
    .eq('queue_item_id', queueItemId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createPublishLog(input: PublishLogInput): Promise<PublishLog> {
  const { data, error } = await supabase
    .from('publish_logs')
    .insert({
      queue_item_id: input.queue_item_id,
      user_id: input.user_id,
      platform: input.platform,
      status: input.status ?? 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completePublishLog(
  id: string,
  startedAt: string,
  result: {
    status: 'success' | 'failed';
    platform_response?: Record<string, unknown> | null;
    error_message?: string | null;
  },
): Promise<PublishLog> {
  const finishedAt = new Date().toISOString();
  const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();

  const { data, error } = await supabase
    .from('publish_logs')
    .update({
      status: result.status,
      finished_at: finishedAt,
      platform_response: result.platform_response ?? null,
      error_message: result.error_message ?? null,
      duration_ms: durationMs,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
