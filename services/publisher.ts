import { createClient } from '@supabase/supabase-js';

import { publishMedia } from '@/lib/instagram/publish';
import { publishToLinkedin } from '@/lib/linkedin/publish';
import { publishToX } from '@/lib/x/publish';
import { publishToTikTok } from '@/lib/tiktok/publish';
import { publishToYouTube } from '@/lib/youtube/publish';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface PublishResult {
  success: boolean;
  platform_response?: Record<string, unknown>;
  error_message?: string;
}

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

async function publishToInstagram(
  caption: string,
  imageUrl: string,
  userId: string,
): Promise<PublishResult> {
  const supabase = getServiceClient();

  const { data: account } = await supabase
    .from('social_accounts')
    .select('access_token, account_id')
    .eq('user_id', userId)
    .eq('platform', 'Instagram')
    .eq('status', 'connected')
    .single();

  if (!account?.access_token || !account?.account_id) {
    return { success: false, error_message: 'No connected Instagram account found' };
  }

  try {
    const result = await publishMedia(account.account_id, caption, imageUrl, account.access_token);
    return { success: true, platform_response: result as unknown as Record<string, unknown> };
  } catch (err) {
    return { success: false, error_message: err instanceof Error ? err.message : String(err) };
  }
}

async function getConnectedAccount(
  userId: string,
  platform: string,
): Promise<{ access_token: string; account_id: string } | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('social_accounts')
    .select('access_token, account_id')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('status', 'connected')
    .single();
  return data ?? null;
}

async function publishToLinkedinPlatform(
  caption: string,
  imageUrl: string,
  userId: string,
): Promise<PublishResult> {
  const account = await getConnectedAccount(userId, 'LinkedIn');
  if (!account?.access_token || !account?.account_id) {
    return { success: false, error_message: 'No connected LinkedIn account found' };
  }
  try {
    const result = await publishToLinkedin(caption, imageUrl || null, account.access_token, account.account_id);
    return { success: true, platform_response: result as unknown as Record<string, unknown> };
  } catch (err) {
    return { success: false, error_message: err instanceof Error ? err.message : String(err) };
  }
}

async function publishToXPlatform(
  caption: string,
  imageUrl: string,
  userId: string,
): Promise<PublishResult> {
  const account = await getConnectedAccount(userId, 'X');
  if (!account?.access_token) {
    return { success: false, error_message: 'No connected X account found' };
  }
  try {
    const result = await publishToX(caption, imageUrl || null, account.access_token);
    return { success: true, platform_response: result as unknown as Record<string, unknown> };
  } catch (err) {
    return { success: false, error_message: err instanceof Error ? err.message : String(err) };
  }
}

async function publishToTikTokPlatform(
  caption: string,
  imageUrl: string,
  userId: string,
): Promise<PublishResult> {
  const account = await getConnectedAccount(userId, 'TikTok');
  if (!account?.access_token) {
    return { success: false, error_message: 'No connected TikTok account found' };
  }
  try {
    const result = await publishToTikTok(caption, imageUrl || null, account.access_token);
    return { success: true, platform_response: result as unknown as Record<string, unknown> };
  } catch (err) {
    return { success: false, error_message: err instanceof Error ? err.message : String(err) };
  }
}

async function publishToYouTubePlatform(
  caption: string,
  imageUrl: string,
  userId: string,
  title?: string | null,
): Promise<PublishResult> {
  const account = await getConnectedAccount(userId, 'YouTube');
  if (!account?.access_token || !account?.account_id) {
    return { success: false, error_message: 'No connected YouTube account found' };
  }
  try {
    const result = await publishToYouTube(caption, imageUrl || null, account.access_token, account.account_id, title);
    return { success: true, platform_response: result as unknown as Record<string, unknown> };
  } catch (err) {
    return { success: false, error_message: err instanceof Error ? err.message : String(err) };
  }
}

export async function publishQueueItem(
  queueItemId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient();

  // Fetch the queue item
  const { data: item, error: fetchError } = await supabase
    .from('queue_items')
    .select('*')
    .eq('id', queueItemId)
    .single();

  if (fetchError || !item) {
    return { success: false, error: `Queue item not found: ${fetchError?.message ?? 'unknown'}` };
  }

  // Only publish approved items
  if (item.status !== 'approved') {
    return { success: false, error: `Cannot publish: status is "${item.status}", expected "approved"` };
  }

  const platform = item.platform;
  const caption = item.caption ?? '';
  const imageUrl = item.asset_url ?? '';

  if (!imageUrl) {
    return { success: false, error: 'No asset_url set. Generate an image before publishing.' };
  }

  // Set status to publishing
  await supabase
    .from('queue_items')
    .update({ status: 'publishing' })
    .eq('id', queueItemId);

  // Create publish log
  const now = new Date().toISOString();
  let log: { id: string } | null = null;
  try {
    const { data: logData } = await supabase
      .from('publish_logs')
      .insert({
        queue_item_id: queueItemId,
        user_id: item.user_id,
        platform,
        status: 'publishing',
        started_at: now,
      })
      .select()
      .single();
    log = logData;
  } catch {
    // Logging is non-critical; continue even if log insert fails
  }

  let result: PublishResult;

  try {
    switch (platform) {
      case 'Instagram':
        result = await publishToInstagram(caption, imageUrl, item.user_id);
        break;
      case 'LinkedIn':
        result = await publishToLinkedinPlatform(caption, imageUrl, item.user_id);
        break;
      case 'X':
        result = await publishToXPlatform(caption, imageUrl, item.user_id);
        break;
      case 'TikTok':
        result = await publishToTikTokPlatform(caption, imageUrl, item.user_id);
        break;
      case 'YouTube':
        result = await publishToYouTubePlatform(caption, imageUrl, item.user_id, item.title);
        break;
      default:
        result = { success: false, error_message: `Unknown platform: ${platform}` };
    }
  } catch (err) {
    result = { success: false, error_message: err instanceof Error ? err.message : String(err) };
  }

  const finishedAt = new Date().toISOString();

  // Update queue item
  if (result.success) {
    await supabase
      .from('queue_items')
      .update({
        status: 'posted',
        published_at: finishedAt,
        platform_response: result.platform_response ?? null,
        error_message: null,
        retry_count: 0,
      })
      .eq('id', queueItemId);
  } else {
    const currentRetry = (item.retry_count ?? 0) + 1;
    const updates: Record<string, unknown> = {
      error_message: result.error_message ?? null,
      retry_count: currentRetry,
    };

    if (currentRetry >= 3) {
      updates.status = 'failed';
    } else {
      updates.status = 'approved';
    }

    await supabase
      .from('queue_items')
      .update(updates)
      .eq('id', queueItemId);
  }

  // Update publish log
  if (log?.id) {
    await supabase
      .from('publish_logs')
      .update({
        status: result.success ? 'success' : 'failed',
        finished_at: finishedAt,
        platform_response: result.platform_response ?? null,
        error_message: result.error_message ?? null,
        duration_ms: new Date(finishedAt).getTime() - new Date(now).getTime(),
      })
      .eq('id', log.id);
  }

  return { success: result.success, error: result.error_message };
}
