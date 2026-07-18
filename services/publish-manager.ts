import { createClient } from '@supabase/supabase-js';
import { dispatchToInstagram, dispatchToFacebook, dispatchToLinkedIn, dispatchToX, dispatchToTikTok, dispatchToYouTube, type PlatformResult, toFriendlyError } from './platform-dispatcher';
import { createLog, updateLog } from './log-service';
import { validateMedia, getCapability } from './capability-checker';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const processingItems = new Set<string>();

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

interface PlatformState {
  status: string;
  error?: string;
  response?: Record<string, unknown>;
  published_at?: string;
  retry_count: number;
  platform_post_id?: string;
  started_at?: string;
}

export interface PublishProgress {
  platform: string;
  status: 'pending' | 'publishing' | 'published' | 'failed';
  error?: string;
}

type ProgressCallback = (progress: PublishProgress) => void;

export async function publishQueueItem(
  queueItemId: string,
  specificPlatforms?: string[],
  onProgress?: ProgressCallback,
): Promise<PlatformResult[]> {
  if (processingItems.has(queueItemId)) {
    return [{ platform: 'unknown', success: false, error_message: 'Already processing this item' }];
  }
  processingItems.add(queueItemId);

  try {
    return await publishQueueItemInternal(queueItemId, specificPlatforms, onProgress);
  } finally {
    processingItems.delete(queueItemId);
  }
}

async function publishQueueItemInternal(
  queueItemId: string,
  specificPlatforms?: string[],
  onProgress?: ProgressCallback,
): Promise<PlatformResult[]> {
  const supabase = getServiceClient();

  const { data: item, error: fetchError } = await supabase
    .from('queue_items')
    .select('*')
    .eq('id', queueItemId)
    .single();

  if (fetchError || !item) {
    return [{ platform: 'unknown', success: false, error_message: `Queue item not found: ${fetchError?.message ?? 'unknown'}` }];
  }

  if (item.status !== 'approved' && !specificPlatforms) {
    return [{ platform: 'unknown', success: false, error_message: `Cannot publish: status is "${item.status}"` }];
  }

  const caption = item.caption ?? '';
  const imageUrl = item.asset_url ?? null;
  const title = item.title ?? null;

  const platforms = (item.platforms as Record<string, PlatformState>) ?? {};

  let targetPlatforms: string[];
  if (specificPlatforms && specificPlatforms.length > 0) {
    targetPlatforms = specificPlatforms;
  } else if (Object.keys(platforms).length > 0) {
    targetPlatforms = Object.keys(platforms);
  } else {
    targetPlatforms = [item.platform];
  }

  const allPlatformStates = { ...platforms };
  const now = new Date().toISOString();

  for (const platform of targetPlatforms) {
    allPlatformStates[platform] = {
      ...allPlatformStates[platform],
      status: 'publishing',
      started_at: now,
      retry_count: (allPlatformStates[platform]?.retry_count ?? 0),
    };
  }

  await supabase.from('queue_items').update({
    status: 'publishing',
    platforms: allPlatformStates,
  }).eq('id', queueItemId);

  const logIds: Record<string, string | null> = {};
  for (const platform of targetPlatforms) {
    logIds[platform] = await createLog({
      queue_item_id: queueItemId,
      platform,
      status: 'publishing',
      started_at: now,
      retry_count: allPlatformStates[platform]?.retry_count ?? 0,
    });
  }

  const dispatchers: Record<string, (caption: string, imageUrl: string | null, userId: string, title?: string | null) => Promise<PlatformResult>> = {
    Instagram: dispatchToInstagram,
    Facebook: dispatchToFacebook,
    LinkedIn: dispatchToLinkedIn,
    X: dispatchToX,
    TikTok: dispatchToTikTok,
    YouTube: dispatchToYouTube,
  };

  const publishPromises = targetPlatforms.map(async (platform) => {
    const dispatcher = dispatchers[platform];
    if (!dispatcher) {
      const errMsg = `Unknown platform: ${platform}`;
      if (onProgress) onProgress({ platform, status: 'failed', error: errMsg });
      return { platform, success: false, error_message: errMsg } as PlatformResult;
    }

    if (onProgress) onProgress({ platform, status: 'publishing' });

    const result = await dispatcher(caption, imageUrl, item.user_id, title);

    if (onProgress) {
      onProgress({ platform, status: result.success ? 'published' : 'failed', error: result.error_message });
    }

    return result;
  });

  const settledResults = await Promise.allSettled(publishPromises);

  const results: PlatformResult[] = settledResults.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return { platform: targetPlatforms[i], success: false, error_message: `Publish error: ${r.reason?.message ?? 'Unknown'}` };
  });

  const finishedAt = new Date().toISOString();

  for (const result of results) {
    const existing = allPlatformStates[result.platform] ?? { retry_count: 0 };
    allPlatformStates[result.platform] = {
      status: result.success ? 'published' : 'failed',
      error: result.error_message ?? undefined,
      response: result.platform_response ?? undefined,
      published_at: result.success ? finishedAt : undefined,
      retry_count: (existing.retry_count ?? 0) + (result.success ? 0 : 1),
      platform_post_id: result.platform_post_id ?? undefined,
      started_at: existing.started_at ?? now,
    };
  }

  const allPublished = results.every(r => r.success);
  const somePublished = results.some(r => r.success);

  let overallStatus: string;
  if (allPublished) {
    overallStatus = 'published';
  } else if (somePublished) {
    overallStatus = 'partially_published';
  } else {
    overallStatus = 'failed';
  }

  const updates: Record<string, unknown> = {
    platforms: allPlatformStates,
    status: overallStatus,
  };

  if (overallStatus === 'published') {
    updates.published_at = finishedAt;
    updates.error_message = null;
  } else if (overallStatus === 'failed') {
    updates.error_message = results.map(r => r.error_message).filter(Boolean).join('; ');
  } else if (overallStatus === 'partially_published') {
    const errors = results.filter(r => !r.success).map(r => r.error_message).filter(Boolean);
    updates.error_message = errors.length > 0 ? errors.join('; ') : null;
  }

  await supabase
    .from('queue_items')
    .update(updates)
    .eq('id', queueItemId);

  for (const result of results) {
    const logId = logIds[result.platform];
    if (logId) {
      await updateLog(logId, {
        status: result.success ? 'success' : 'failed',
        finished_at: finishedAt,
        platform_response: result.platform_response ?? undefined,
        platform_post_id: result.platform_post_id ?? undefined,
        error_message: result.error_message ?? undefined,
        duration_ms: new Date(finishedAt).getTime() - new Date(allPlatformStates[result.platform]?.started_at ?? now).getTime(),
      });
    }
  }

  return results;
}

export function validatePublishMedia(
  platformNames: string[],
  mediaType: 'image' | 'video' | 'text',
  metadata?: { duration?: number; aspectRatio?: number; count?: number },
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const name of platformNames) {
    const cap = getCapability(name);
    if (!cap) continue;

    const validation = validateMedia([name], { type: mediaType });
    if (validation.errors.length > 0) {
      errors.push(...validation.errors.map(e => `${name}: ${e}`));
    }
    if (validation.warnings.length > 0) {
      warnings.push(...validation.warnings.map(w => `${name}: ${w}`));
    }

    if (metadata?.duration && cap.maxDuration && metadata.duration > cap.maxDuration) {
      errors.push(`${name}: Video too long (${metadata.duration}s, max ${cap.maxDuration}s)`);
    }

    if (metadata?.duration && cap.minDuration && metadata.duration < cap.minDuration) {
      errors.push(`${name}: Video too short (${metadata.duration}s, min ${cap.minDuration}s)`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
