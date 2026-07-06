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

  // --- Stage 2: Resolve Instagram Account ---
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

  // --- Stage 3: Database Update ---
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
