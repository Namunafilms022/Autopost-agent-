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

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

export interface PlatformResult {
  platform: string;
  success: boolean;
  platform_response?: Record<string, unknown>;
  error_message?: string;
  platform_post_id?: string;
}

interface SocialAccount {
  access_token: string;
  account_id: string;
  refresh_token?: string;
  token_expires_at?: string;
}

const FB_API = 'https://graph.facebook.com/v19.0';

async function getConnectedAccount(
  userId: string,
  platform: string,
): Promise<SocialAccount | null> {
  const supabase = getServiceClient();
  const { data: account } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('status', 'connected')
    .single();

  if (!account) return null;

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
      // Token refresh failed; return existing token
    }
  }

  return { access_token: account.access_token, account_id: account.account_id };
}

function isVideoUrl(url: string): boolean {
  const videoExts = /\.(mp4|mov|avi|mkv|webm|ogg|m4v|3gp|wmv|flv)$/i;
  const videoKeywords = /\/video\//i;
  return videoExts.test(url) || videoKeywords.test(url) || url.includes('video');
}

function isImageUrl(url: string): boolean {
  const imgExts = /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff?)$/i;
  return imgExts.test(url);
}

export async function dispatchToFacebook(
  caption: string,
  imageUrl: string | null,
  userId: string,
): Promise<PlatformResult> {
  const supabase = getServiceClient();
  const { data: account } = await supabase
    .from('social_accounts')
    .select('access_token, account_id, token_expires_at')
    .eq('user_id', userId)
    .eq('platform', 'Facebook')
    .eq('status', 'connected')
    .single();

  if (!account?.access_token) {
    return { platform: 'Facebook', success: false, error_message: 'No connected Facebook account found. Connect Facebook in Social Settings.' };
  }

  // Check token expiry
  if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) {
    return { platform: 'Facebook', success: false, error_message: 'Facebook token expired. Reconnect Facebook in Social Settings.' };
  }

  try {
    // Check permissions on the user token
    const permRes = await fetch(`${FB_API}/me/permissions?access_token=${account.access_token}`);
    const permData = await permRes.json() as { data?: Array<{ permission: string; status: string }> };
    if (permData?.data) {
      const denied = permData.data.filter(p => p.status === 'declined' || p.status === 'expired');
      if (denied.length > 0) {
        return { platform: 'Facebook', success: false, error_message: `Facebook permissions missing: ${denied.map(p => p.permission).join(', ')}. Reconnect with all required permissions.` };
      }
      const hasPagesManage = permData.data.some(p => p.permission === 'pages_manage_posts' && p.status === 'granted');
      if (!hasPagesManage) {
        return { platform: 'Facebook', success: false, error_message: 'Facebook page management permission not granted. Reconnect Facebook and approve all permissions.' };
      }
    }

    const pagesRes = await fetch(`${FB_API}/me/accounts?fields=id,name,access_token&access_token=${account.access_token}`);
    if (!pagesRes.ok) {
      const text = await pagesRes.text().catch(() => '');
      return { platform: 'Facebook', success: false, error_message: `Facebook API error (${pagesRes.status}): ${text.slice(0, 300)}` };
    }
    const pages = await pagesRes.json() as { data?: Array<{ id: string; name: string; access_token: string }> };

    if (!pages.data || pages.data.length === 0) {
      return { platform: 'Facebook', success: false, error_message: 'No Facebook Page found. Create a Facebook Page first.' };
    }

    const page = pages.data[0];
    if (!page.access_token) {
      return { platform: 'Facebook', success: false, error_message: `Facebook page "${page.name}" has no access token. Reconnect Facebook with pages_manage_posts permission.` };
    }
    let postResult: { id?: string };

      if (imageUrl && isVideoUrl(imageUrl)) {
        // Post video to Facebook
        const res = await fetch(`${FB_API}/${page.id}/videos?access_token=${encodeURIComponent(page.access_token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_url: imageUrl, description: caption }),
        });
        const rawText = await res.text();
        let errMsg: string;
        try {
          const parsed = JSON.parse(rawText);
          errMsg = parsed?.error
            ? `[${res.status}] ${parsed.error.type || ''}(${parsed.error.code || ''}): ${parsed.error.message}`
            : parsed?.id ? 'OK' : `Unexpected [${res.status}]: ${rawText.slice(0, 300)}`;
        } catch {
          errMsg = `Invalid JSON [${res.status}]: ${rawText.slice(0, 300)}`;
        }
        if (errMsg !== 'OK') {
          return { platform: 'Facebook', success: false, error_message: errMsg };
        }
        postResult = JSON.parse(rawText);
      } else if (imageUrl && isImageUrl(imageUrl)) {
        const res = await fetch(`${FB_API}/${page.id}/photos?access_token=${encodeURIComponent(page.access_token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: imageUrl, message: caption }),
        });
        const rawText = await res.text();
        let errMsg: string;
        try {
          const parsed = JSON.parse(rawText);
          errMsg = parsed?.error
            ? `[${res.status}] ${parsed.error.type || ''}(${parsed.error.code || ''}): ${parsed.error.message}`
            : parsed?.id ? 'OK' : `Unexpected [${res.status}]: ${rawText.slice(0, 300)}`;
        } catch {
          errMsg = `Invalid JSON [${res.status}]: ${rawText.slice(0, 300)}`;
        }
        if (errMsg !== 'OK') {
          return { platform: 'Facebook', success: false, error_message: errMsg };
        }
        postResult = JSON.parse(rawText);
      } else {
        // Fallback: text-only post (also handles unknown asset types)
        const res = await fetch(`${FB_API}/${page.id}/feed?access_token=${encodeURIComponent(page.access_token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: caption }),
        });
        const rawText = await res.text();
        let errMsg: string;
        try {
          const parsed = JSON.parse(rawText);
          errMsg = parsed?.error
            ? `[${res.status}] ${parsed.error.type || ''}(${parsed.error.code || ''}): ${parsed.error.message} | raw: ${rawText.slice(0, 300)}`
            : parsed?.id
              ? 'OK'
              : `Unexpected response [${res.status}]: ${rawText.slice(0, 300)}`;
        } catch {
          errMsg = `Invalid JSON [${res.status}]: ${rawText.slice(0, 300)}`;
        }
        if (errMsg !== 'OK') {
          return { platform: 'Facebook', success: false, error_message: errMsg };
        }
        postResult = JSON.parse(rawText);
      }

    return {
      platform: 'Facebook',
      success: true,
      platform_response: { pageId: page.id, pageName: page.name, postId: postResult.id },
      platform_post_id: postResult.id,
    };
  } catch (err) {
    return { platform: 'Facebook', success: false, error_message: friendlyError('Facebook', err) };
  }
}

export async function dispatchToInstagram(
  caption: string,
  imageUrl: string | null,
  userId: string,
): Promise<PlatformResult> {
  if (!imageUrl) {
    return { platform: 'Instagram', success: false, error_message: 'Instagram requires an image. Generate one or upload an asset first.' };
  }

  const supabase = getServiceClient();
  const { data: igAccount } = await supabase
    .from('social_accounts')
    .select('access_token, account_id')
    .eq('user_id', userId)
    .eq('platform', 'Instagram')
    .eq('status', 'connected')
    .single();

  if (!igAccount?.account_id) {
    return { platform: 'Instagram', success: false, error_message: 'No connected Instagram account found. Connect Instagram in Social Settings.' };
  }

  let effectiveToken = igAccount.access_token;
  let igId = igAccount.account_id;

  if (!effectiveToken) {
    const { data: fbAccount } = await supabase
      .from('social_accounts')
      .select('access_token')
      .eq('user_id', userId)
      .eq('platform', 'Facebook')
      .eq('status', 'connected')
      .single();
    effectiveToken = fbAccount?.access_token;
  }

  if (!effectiveToken) {
    return { platform: 'Instagram', success: false, error_message: 'No access token. Reconnect Instagram or Facebook.' };
  }

  // Auto-repair IG Business Account ID
  try {
    const r = await fetch(`${FB_API}/me/instagram_business_account?fields=id&access_token=${effectiveToken}`);
    const d = await r.json();
    if (r.ok && d.id) {
      igId = d.id;
      await supabase.from('social_accounts').update({ account_id: igId }).eq('user_id', userId).eq('platform', 'Instagram');
    }
  } catch { /* ignore */ }

  try {
    const result = await publishMedia(igId, caption, imageUrl, effectiveToken);
    const mediaId = (result as any)?.id;
    return {
      platform: 'Instagram',
      success: true,
      platform_response: result as unknown as Record<string, unknown>,
      platform_post_id: mediaId,
    };
  } catch (err) {
    return { platform: 'Instagram', success: false, error_message: friendlyError('Instagram', err) };
  }
}

export async function dispatchToLinkedIn(
  caption: string,
  imageUrl: string | null,
  userId: string,
): Promise<PlatformResult> {
  const account = await getConnectedAccount(userId, 'LinkedIn');
  if (!account?.access_token || !account?.account_id) {
    return { platform: 'LinkedIn', success: false, error_message: 'No connected LinkedIn account found. Connect LinkedIn in Social Settings.' };
  }
  try {
    const result = await publishToLinkedin(caption, imageUrl || null, account.access_token, account.account_id);
    const postId = (result as any)?.id || (result as any)?.activity;
    return {
      platform: 'LinkedIn',
      success: true,
      platform_response: result as unknown as Record<string, unknown>,
      platform_post_id: postId,
    };
  } catch (err) {
    return { platform: 'LinkedIn', success: false, error_message: friendlyError('LinkedIn', err) };
  }
}

export async function dispatchToX(
  caption: string,
  imageUrl: string | null,
  userId: string,
): Promise<PlatformResult> {
  const account = await getConnectedAccount(userId, 'X');
  if (!account?.access_token) {
    return { platform: 'X', success: false, error_message: 'No connected X account found. Connect X in Social Settings.' };
  }
  try {
    const result = await publishToX(caption, imageUrl || null, account.access_token);
    const tweetId = (result as any)?.id?.toString() || (result as any)?.data?.id;
    return {
      platform: 'X',
      success: true,
      platform_response: result as unknown as Record<string, unknown>,
      platform_post_id: tweetId,
    };
  } catch (err) {
    return { platform: 'X', success: false, error_message: friendlyError('X', err) };
  }
}

export async function dispatchToTikTok(
  caption: string,
  imageUrl: string | null,
  userId: string,
): Promise<PlatformResult> {
  const account = await getConnectedAccount(userId, 'TikTok');
  if (!account?.access_token) {
    return { platform: 'TikTok', success: false, error_message: 'No connected TikTok account found. Connect TikTok in Social Settings.' };
  }
  try {
    const result = await publishToTikTok(caption, imageUrl || null, account.access_token);
    const publishId = (result as any)?.data?.publish_id;
    return {
      platform: 'TikTok',
      success: true,
      platform_response: result as unknown as Record<string, unknown>,
      platform_post_id: publishId,
    };
  } catch (err) {
    return { platform: 'TikTok', success: false, error_message: friendlyError('TikTok', err) };
  }
}

export async function dispatchToYouTube(
  caption: string,
  imageUrl: string | null,
  userId: string,
  title?: string | null,
): Promise<PlatformResult> {
  const account = await getConnectedAccount(userId, 'YouTube');
  if (!account?.access_token || !account?.account_id) {
    return { platform: 'YouTube', success: false, error_message: 'No connected YouTube account found. Connect YouTube in Social Settings.' };
  }
  try {
    const result = await publishToYouTube(caption, imageUrl || null, account.access_token, account.account_id, title);
    const videoId = (result as any)?.id || (result as any)?.videoUrl?.split('v=')[1] || (result as any)?.videoUrl;
    return {
      platform: 'YouTube',
      success: true,
      platform_response: result as unknown as Record<string, unknown>,
      platform_post_id: videoId,
    };
  } catch (err) {
    return { platform: 'YouTube', success: false, error_message: friendlyError('YouTube', err) };
  }
}

export function toFriendlyError(platform: string, rawError: string): string {
  const lower = rawError.toLowerCase();

  if (lower.includes('oauth') || lower.includes('access token') || lower.includes('token expired') || lower.includes('401') || lower.includes('unauthorized')) {
    const map: Record<string, string> = {
      Instagram: 'Instagram: Access Expired. Reconnect Required.',
      Facebook: 'Facebook: Access Expired. Reconnect Required.',
      LinkedIn: 'LinkedIn: Access Expired. Reconnect Required.',
      X: 'X: Access Expired. Reconnect Required.',
      TikTok: 'TikTok: Access Expired. Reconnect Required.',
      YouTube: 'YouTube: Access Expired. Reconnect Required.',
    };
    return map[platform] || `${platform}: Access Expired. Reconnect Required.`;
  }

  if (lower.includes('invalid parameter') || lower.includes('unsupported') || (lower.includes('invalid') && lower.includes('media'))) {
    return `${platform}: Unsupported Media. Check file format and size.`;
  }

  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many')) {
    return `${platform}: Platform Busy. Retry Later.`;
  }

  if (lower.includes('permission') || lower.includes('scope') || lower.includes('forbidden') || lower.includes('403')) {
    if (platform === 'Facebook') return 'Facebook: Missing Permission. Ensure pages_manage_posts is granted.';
    if (platform === 'Instagram') return 'Instagram: Missing Permission. Check Business Account setup.';
    if (platform === 'LinkedIn') return 'LinkedIn: Missing Permission. Re-authenticate with required scopes.';
    if (platform === 'X') return 'X: Missing Permission. X API free tier has no write credits.';
    if (platform === 'TikTok') return 'TikTok: Missing Permission. Ensure video.publish scope is granted.';
    if (platform === 'YouTube') return 'YouTube: Missing Permission. Reconnect YouTube account.';
  }

  if (lower.includes('quota') || lower.includes('credit') || lower.includes('balance')) {
    return `${platform}: API Quota Exceeded. Check your subscription.`;
  }

  if (lower.includes('upload')) {
    return `${platform}: Upload Failed. Check file format and size.`;
  }

  if (lower.includes('privacy') || lower.includes('visibility')) {
    return `${platform}: Invalid Privacy Setting. Check video visibility configuration.`;
  }

  if (lower.includes('not found') || lower.includes('404')) {
    return `${platform}: Resource Not Found. The target account or page may have been removed.`;
  }

  if (lower.includes('network') || lower.includes('timeout') || lower.includes('econnrefused') || lower.includes('enotfound')) {
    return `${platform}: Network Error. Check your internet connection and API endpoint.`;
  }

  return `${platform}: ${rawError.slice(0, 200)}`;
}

export function isOAuthError(rawError: string): boolean {
  const lower = rawError.toLowerCase();
  return lower.includes('oauth') || lower.includes('access token') || lower.includes('token expired') || lower.includes('401') || lower.includes('unauthorized');
}

export function isTemporaryError(rawError: string): boolean {
  const lower = rawError.toLowerCase();
  return lower.includes('rate limit') || lower.includes('429') || lower.includes('too many') || lower.includes('timeout') || lower.includes('network');
}

function friendlyError(platform: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return toFriendlyError(platform, msg);
}
