import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

export interface PublishLogEntry {
  id?: string;
  queue_item_id: string;
  platform: string;
  status: string;
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
  platform_post_id?: string;
  platform_response?: Record<string, unknown>;
  error_message?: string;
  retry_count?: number;
}

export async function createLog(entry: Omit<PublishLogEntry, 'id'>): Promise<string | null> {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('publish_logs')
      .insert(entry)
      .select('id')
      .single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function updateLog(id: string, updates: Partial<PublishLogEntry>): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase.from('publish_logs').update(updates).eq('id', id);
  } catch {
    // Non-critical
  }
}

export async function getLogsForItem(queueItemId: string): Promise<PublishLogEntry[]> {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('publish_logs')
      .select('*')
      .eq('queue_item_id', queueItemId)
      .order('started_at', { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getLogsForPlatform(
  queueItemId: string,
  platform: string,
): Promise<PublishLogEntry[]> {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('publish_logs')
      .select('*')
      .eq('queue_item_id', queueItemId)
      .eq('platform', platform)
      .order('started_at', { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}
