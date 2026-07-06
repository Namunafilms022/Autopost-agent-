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
  addLog('callback-received', `Callback received`, { url: req.url, method: req.method });

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const errorParam = req.nextUrl.searchParams.get('error');
  const errorDescription = req.nextUrl.searchParams.get('error_description');

  addLog('callback-params', 'Parsed query params', {
    hasCode: !!code,
    hasState: !!state,
    hasError: !!errorParam,
    errorDescription: errorDescription || null,
    codeLength: code?.length ?? 0,
    statePreview: state ? `${state.slice(0, 20)}...` : null,
  });

  if (errorParam) {
    addLog('callback-error', `Facebook returned error: ${errorParam}`, { errorDescription });
    return redirectToSocial(errorDescription || errorParam);
  }

  if (!code) {
    addLog('callback-error', 'No authorization code received from Facebook');
    return redirectToSocial('OAuth callback missing code');
  }

  if (!state) {
    addLog('callback-error', 'Invalid state parameter');
    return redirectToSocial('OAuth callback missing state');
  }

  const userId = state.split(':')[0];
  if (!userId) {
    addLog('callback-error', `Could not parse user from state: ${state}`);
    return redirectToSocial('OAuth callback invalid state format');
  }

  addLog('callback-user', `Parsed userId from state`, { userId: userId.slice(0, 10) + '...' });

  // --- Stage 2: Token Exchange ---
  addLog('token-exchange', 'Starting token exchange');
  let token: string;
  let expiresIn: number | undefined;

  try {
    const r = await exchangeCode(code);
    token = r.access_token;
    expiresIn = r.expires_in;
    addLog('token-exchange', 'Short-lived token obtained', { tokenLength: token.length, expiresIn });

    try {
      const lt = await exchangeForLongLivedToken(token);
      token = lt.access_token;
      expiresIn = lt.expires_in;
      addLog('token-exchange', 'Long-lived token obtained', { tokenLength: token.length, expiresIn });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown';
      addLog('token-exchange', `Long-lived exchange failed, using short-lived: ${msg}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    addLog('token-exchange', `FAILED: ${msg}`);
    return redirectToSocial(`Token exchange failed: ${msg}`);
  }

  // --- Stage 3: Meta Graph API ---
  addLog('graph-api', 'Calling resolveInstagramBusinessAccount');
  let resolved: { igId: string; pageId: string; pageName: string; pageAccessToken: string };
  try {
    resolved = await resolveInstagramBusinessAccount(token);
    addLog('graph-api', 'Instagram account resolved', resolved);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    addLog('graph-api', `FAILED: ${msg}`);
    return redirectToSocial(`Instagram account not found: ${msg}`);
  }

  // --- Stage 4: Database Update ---
  addLog('db-upsert', 'Upserting social_accounts record', {
    userId: userId.slice(0, 10) + '...',
    platform: 'Instagram',
    accountName: resolved.pageName,
    accountId: resolved.igId,
  });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  const { error: dbError } = await supabase.from('social_accounts').upsert({
    user_id: userId,
    platform: 'Instagram',
    account_name: resolved.pageName,
    account_id: resolved.igId,
    access_token: token,
    token_expires_at: expiresAt,
    status: 'connected',
    connected_at: new Date().toISOString(),
  }, { onConflict: 'user_id, platform' });

  if (dbError) {
    addLog('db-upsert', `FAILED: ${dbError.message}`, { details: dbError.details, code: dbError.code, hint: dbError.hint });
    return redirectToSocial(`Database update failed: ${dbError.message}`);
  }

  addLog('db-upsert', 'Database updated successfully');
  addLog('flow-complete', 'Instagram OAuth flow completed successfully');

  return redirectConnected();
}
