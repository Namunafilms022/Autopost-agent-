import { createClient } from '@supabase/supabase-js';
import { xProvider } from '@/lib/providers/x';
import { linkedinProvider } from '@/lib/providers/linkedin';
import { tiktokProvider } from '@/lib/providers/tiktok';
import { youtubeProvider } from '@/lib/providers/youtube';

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

const FB_API = 'https://graph.facebook.com/v22.0';

async function publishToFacebook(
  caption: string,
  imageUrl: string | null,
  userId: string,
): Promise<PublishResult> {
  const supabase = getServiceClient();

  const { data: account } = await supabase
    .from('social_accounts')
    .select('access_token, account_id')
    .eq('user_id', userId)
    .eq('platform', 'Facebook')
    .eq('status', 'connected')
    .single();

  if (!account?.access_token) {
    return { success: false, error_message: 'No connected Facebook account found' };
  }

  try {
    // Get the first page the user manages
    const pagesRes = await fetch(`${FB_API}/me/accounts?fields=id,name,access_token&access_token=${account.access_token}`);
    const pages = await pagesRes.json() as { data?: Array<{ id: string; name: string; access_token: string }> };

    if (!pages.data || pages.data.length === 0) {
      return { success: false, error_message: 'No Facebook pages found to post to. Create a Facebook Page first.' };
    }

    const page = pages.data[0];
    let postResult: { id?: string };

    if (imageUrl) {
      const body = new URLSearchParams({
        url: imageUrl,
        message: caption,
        access_token: page.access_token,
      });
      const res = await fetch(`${FB_API}/${page.id}/photos`, { method: 'POST', body });
      postResult = await res.json() as { id?: string; error?: { message: string } };
      if (!res.ok || !postResult.id) {
        const err = (postResult as { error?: { message: string } }).error;
        throw new Error(err?.message || JSON.stringify(postResult));
      }
    } else {
      const body = new URLSearchParams({
        message: caption,
        access_token: page.access_token,
      });
      const res = await fetch(`${FB_API}/${page.id}/feed`, { method: 'POST', body });
      postResult = await res.json() as { id?: string; error?: { message: string } };
      if (!res.ok || !postResult.id) {
        const err = (postResult as { error?: { message: string } }).error;
        throw new Error(err?.message || JSON.stringify(postResult));
      }
    }

    return { success: true, platform_response: { pageId: page.id, pageName: page.name, postId: postResult.id } };
  } catch (err) {
    return { success: false, error_message: err instanceof Error ? err.message : String(err) };
  }
}

async function publishToInstagram(
  caption: string,
  imageUrl: string | null,
  userId: string,
): Promise<PublishResult> {
  if (!imageUrl) {
    return { success: false, error_message: 'Instagram requires an image. Generate one before publishing.' };
  }

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
  const { data: account } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('status', 'connected')
    .single();

  if (!account) return null;

  // Auto-refresh if token is expired
  if (
    account.refresh_token &&
    account.token_expires_at &&
    new Date(account.token_expires_at) <= new Date()
  ) {
    try {
      const providerMap: Record<string, { refreshToken: (token: string) => Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> }> = {
        X: xProvider,
        LinkedIn: linkedinProvider,
        TikTok: tiktokProvider,
        YouTube: youtubeProvider,
      };
      const provider = providerMap[platform];
      if (provider) {
        const fresh = await provider.refreshToken(account.refresh_token);
        const expiresAt = fresh.expires_in
          ? new Date(Date.now() + fresh.expires_in * 1000).toISOString()
          : null;
        await supabase
          .from('social_accounts')
          .update({
            access_token: fresh.access_token,
            refresh_token: fresh.refresh_token ?? account.refresh_token,
            token_expires_at: expiresAt,
          })
          .eq('id', account.id);
        return { access_token: fresh.access_token, account_id: account.account_id };
      }
    } catch {
      // Token refresh failed; return existing token (will likely 401)
    }
  }

  return { access_token: account.access_token, account_id: account.account_id };
}

async function publishToFacebookPlatform(
  caption: string,
  imageUrl: string | null,
  userId: string,
): Promise<PublishResult> {
  return publishToFacebook(caption, imageUrl, userId);
}

async function publishToLinkedinPlatform(
  caption: string,
  imageUrl: string | null,
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
  imageUrl: string | null,
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
  imageUrl: string | null,
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
  imageUrl: string | null,
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
  const imageUrl = item.asset_url ?? null;

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
      case 'Facebook':
        result = await publishToFacebookPlatform(caption, imageUrl, item.user_id);
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
