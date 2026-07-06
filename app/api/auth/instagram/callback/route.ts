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

  // --- Stage 3: Resolve Instagram Business Account ID ---
  // The token exchange returns the Instagram User ID (e.g. 266...), but the
  // Facebook Graph API requires the Instagram Business Account ID (e.g. 178414...).
  // We need to resolve it via the Graph API.
  let pageName = `Instagram ${igUserId}`;
  let resolvedIgId: string | null = null;

  // Strategy A: resolveInstagramBusinessAccount (uses /me/accounts, /me/instagram_business_account)
  try {
    const resolved = await resolveInstagramBusinessAccount(token);
    addLog('resolution-a', 'Strategy A succeeded', resolved);
    if (resolved.igId) resolvedIgId = resolved.igId;
    if (resolved.pageName) pageName = resolved.pageName;
  } catch (errA) {
    addLog('resolution-a-failed', `Strategy A failed: ${errA instanceof Error ? errA.message : 'Unknown'}`);
  }

  // Strategy B: direct call to /me/instagram_business_account
  if (!resolvedIgId) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v22.0/me/instagram_business_account?fields=id,username,name&access_token=${token}`,
      );
      const data = await res.json() as { id?: string; username?: string; name?: string; error?: { message: string } };
      if (res.ok && data.id) {
        resolvedIgId = data.id;
        pageName = data.name || data.username || `Instagram ${data.id}`;
        addLog('resolution-b', 'Strategy B succeeded: /me/instagram_business_account', data);
      } else {
        addLog('resolution-b-failed', `/me/instagram_business_account: ${data.error?.message || 'no id'}`);
      }
    } catch (errB) {
      addLog('resolution-b-error', `Strategy B error: ${errB instanceof Error ? errB.message : 'Unknown'}`);
    }
  }

  // Strategy C: if we have a Facebook-type token, try /me/accounts
  if (!resolvedIgId) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v22.0/me/accounts?fields=instagram_business_account{id},name&access_token=${token}`,
      );
      const data = await res.json() as { data?: Array<{ instagram_business_account?: { id: string }; name: string }> };
      if (res.ok && data.data) {
        for (const page of data.data) {
          if (page.instagram_business_account?.id) {
            resolvedIgId = page.instagram_business_account.id;
            pageName = page.name || `Instagram ${resolvedIgId}`;
            addLog('resolution-c', 'Strategy C succeeded: /me/accounts', { igId: resolvedIgId, pageName });
            break;
          }
        }
        if (!resolvedIgId) addLog('resolution-c-no-ig', '/me/accounts returned pages but none have linked IG');
      }
    } catch (errC) {
      addLog('resolution-c-error', `Strategy C error: ${errC instanceof Error ? errC.message : 'Unknown'}`);
    }
  }

  if (!resolvedIgId) {
    addLog('resolution-exhausted', 'All strategies exhausted, using raw IG user_id from token exchange');
    resolvedIgId = igUserId;
  }

  const finalIgId = resolvedIgId;
  addLog('resolution-final', `Using IG Business Account ID: ${finalIgId}`);

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
    igUserId: finalIgId,
    pageName,
    platform: 'Instagram',
    tokenExpiresAt: expiresAt,
  });

  const { error: dbError } = await supabase.from('social_accounts').upsert({
    user_id: userId,
    platform: 'Instagram',
    account_name: pageName,
    account_id: finalIgId,
    access_token: token,
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
