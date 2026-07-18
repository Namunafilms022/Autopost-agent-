import { createClient } from '@supabase/supabase-js';
import { isOAuthError, isTemporaryError } from './platform-dispatcher';
import type { PlatformState } from '@/types/queue';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const RETRY_BACKOFFS = [30_000, 120_000, 600_000];

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

export interface RetryResult {
  queueItemId: string;
  platform: string;
  success: boolean;
  error?: string;
}

export async function retryFailedPlatforms(
  queueItemId: string,
): Promise<RetryResult[]> {
  const supabase = getServiceClient();

  const { data: item } = await supabase
    .from('queue_items')
    .select('*')
    .eq('id', queueItemId)
    .single();

  if (!item) {
    return [{ queueItemId, platform: 'unknown', success: false, error: 'Queue item not found' }];
  }

  const platforms = (item.platforms as Record<string, PlatformState>) ?? {};

  const now = Date.now();
  const failedPlatforms: string[] = [];

  for (const [platform, state] of Object.entries(platforms)) {
    if (state.status !== 'failed') continue;

    const retryCount = state.retry_count ?? 0;
    const rawError = state.error ?? '';

    if (isOAuthError(rawError)) continue;

    if (retryCount >= RETRY_BACKOFFS.length) continue;

    const lastAttempt = state.started_at ? new Date(state.started_at).getTime() : 0;
    const backoffMs = RETRY_BACKOFFS[retryCount];
    if (now - lastAttempt < backoffMs) continue;

    failedPlatforms.push(platform);
  }

  if (failedPlatforms.length === 0) {
    return [{ queueItemId, platform: 'all', success: false, error: 'No retryable platforms found' }];
  }

  const { publishQueueItem } = await import('./publish-manager');
  const results = await publishQueueItem(queueItemId, failedPlatforms);

  return results.map(r => ({
    queueItemId,
    platform: r.platform,
    success: r.success,
    error: r.error_message,
  }));
}

export function getNextRetryDelay(retryCount: number): number | null {
  if (retryCount >= RETRY_BACKOFFS.length) return null;
  return RETRY_BACKOFFS[retryCount];
}
