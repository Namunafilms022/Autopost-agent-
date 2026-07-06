import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { exchangeCode, exchangeForLongLivedToken } from '@/lib/instagram/oauth';
import { resolveInstagramBusinessAccount } from '@/lib/instagram/publish';
import { addLog } from '@/lib/oauth-log';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function redirectToSocial(error: string): NextResponse {
  addLog('callback-redirect', `Redirecting with error: ${error}`);
  return NextResponse.redirect(
    new URL(`/dashboard/social?error=${encodeURIComponent(error)}`, process.env.NEXT_PUBLIC_APP_URL),
  );
}

function redirectConnected(): NextResponse {
  addLog('callback-redirect', 'Redirecting with connected=true');
  return NextResponse.redirect(
    new URL('/dashboard/social?connected=true', process.env.NEXT_PUBLIC_APP_URL),
  );
}

export async function GET(req: NextRequest) {
  addLog('callback-received', 'Callback received', { url: req.url });

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const errorParam = req.nextUrl.searchParams.get('error');
  const errorDescription = req.nextUrl.searchParams.get('error_description');

  if (errorParam) {
    addLog('callback-error', `Facebook returned error: ${errorParam}`, { errorDescription });
    return redirectToSocial(errorDescription || errorParam);
  }

  if (!code) {
    addLog('callback-error', 'Missing authorization code');
    return redirectToSocial('OAuth callback missing code');
  }

  // --- Stage 1: Token Exchange ---
  let token: string;
  let igUserId: string | null = null;
  let expiresIn: number | undefined;

  try {
    const r = await exchangeCode(code);
    token = r.access_token;
    igUserId = r.user_id;
    expiresIn = r.expires_in;
    addLog('token-exchange', `Token obtained, IG user_id: ${igUserId}`, { tokenLength: token.length, expiresIn });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    addLog('token-exchange', `FAILED: ${msg}`);
    return redirectToSocial(`Token exchange failed: ${msg}`);
  }

  // --- Stage 2: Exchange for long-lived token ---
  // Try Facebook's fb_exchange_token first (converts IG token to Facebook Graph token)
  try {
    const fbClientId = process.env.FACEBOOK_CLIENT_ID!;
    const fbClientSecret = process.env.FACEBOOK_CLIENT_SECRET!;
    if (fbClientId && fbClientSecret) {
      const url = new URL('https://graph.facebook.com/v22.0/oauth/access_token');
      url.searchParams.set('grant_type', 'fb_exchange_token');
      url.searchParams.set('client_id', fbClientId);
      url.searchParams.set('client_secret', fbClientSecret);
      url.searchParams.set('fb_exchange_token', token);
      const fbRes = await fetch(url.toString());
      if (fbRes.ok) {
        const fbData = await fbRes.json() as { access_token: string; expires_in: number };
        token = fbData.access_token;
        expiresIn = fbData.expires_in;
        addLog('long-lived', 'IG token exchanged via Facebook fb_exchange_token — got Facebook Graph token');
      } else {
        addLog('long-lived-fb-failed', 'Facebook exchange failed, trying Instagram exchange');
        // Fallback: try Instagram's own long-lived exchange
        try {
          const longLived = await exchangeForLongLivedToken(token);
          token = longLived.access_token;
          expiresIn = longLived.expires_in;
          addLog('long-lived', 'IG token exchanged via Instagram ig_exchange_token');
        } catch (igErr) {
          const igMsg = igErr instanceof Error ? igErr.message : 'Unknown';
          addLog('long-lived-failed', `Both exchanges failed: ${igMsg} — storing short-lived token`);
        }
      }
    } else {
      addLog('long-lived-no-fb-creds', 'Facebook credentials not set, trying Instagram exchange');
      try {
        const longLived = await exchangeForLongLivedToken(token);
        token = longLived.access_token;
        expiresIn = longLived.expires_in;
        addLog('long-lived', 'IG token exchanged via Instagram ig_exchange_token');
      } catch (igErr) {
        const igMsg = igErr instanceof Error ? igErr.message : 'Unknown';
        addLog('long-lived-failed', `Instagram exchange failed: ${igMsg} — storing short-lived token`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    addLog('long-lived-error', `Exchange error: ${msg}`);
  }

  // --- Stage 3: Resolve Instagram Account ---
  // Try to get the IG account info from API, fall back to direct user_id from token exchange
  let pageId = igUserId;
  let pageName = `Instagram ${igUserId}`;
  let pageAccessToken = token;

  try {
    const resolved = await resolveInstagramBusinessAccount(token);
    pageId = resolved.pageId || igUserId;
    pageName = resolved.pageName;
    pageAccessToken = resolved.pageAccessToken;
    if (resolved.igId) igUserId = resolved.igId;
    addLog('resolution-success', 'Resolved Instagram account via API', resolved);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    addLog('resolution-fallback', `API resolution failed, using direct user_id: ${msg}`);
    // Fall back to the user_id from token exchange
    if (!igUserId) {
      return redirectToSocial(`Instagram account not found: ${msg}`);
    }
  }

  // --- Stage 4: Database Update ---
  const userId = state?.split(':')[0];
  if (!userId) {
    return redirectToSocial('Invalid state parameter');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  addLog('db-upsert', 'Saving Instagram account', {
    userId: userId.slice(0, 10) + '...',
    igUserId,
    pageId,
    pageName,
    platform: 'Instagram',
  });

  const { error: dbError } = await supabase.from('social_accounts').upsert({
    user_id: userId,
    platform: 'Instagram',
    account_name: pageName,
    account_id: igUserId || pageId,
    access_token: pageAccessToken,
    token_expires_at: expiresAt,
    status: 'connected',
    connected_at: new Date().toISOString(),
  }, { onConflict: 'user_id, platform' });

  if (dbError) {
    addLog('db-upsert', `FAILED: ${dbError.message}`, { details: dbError.details, code: dbError.code });
    return redirectToSocial(`Database update failed: ${dbError.message}`);
  }

  addLog('db-upsert', 'Success');
  addLog('flow-complete', 'Instagram OAuth completed successfully');

  return redirectConnected();
}
