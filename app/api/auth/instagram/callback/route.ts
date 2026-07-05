import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { exchangeCode, exchangeForLongLivedToken } from '@/lib/instagram/oauth';
import { resolveInstagramBusinessAccount } from '@/lib/instagram/publish';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function redirectToSocial(error: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/dashboard/social?error=${encodeURIComponent(error)}`, process.env.NEXT_PUBLIC_APP_URL),
  );
}

function redirectConnected(): NextResponse {
  return NextResponse.redirect(
    new URL('/dashboard/social?connected=true', process.env.NEXT_PUBLIC_APP_URL),
  );
}

export async function GET(req: NextRequest) {
  console.log('[Instagram Callback] Received callback with URL:', req.url);

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const errorParam = req.nextUrl.searchParams.get('error');
  const errorDescription = req.nextUrl.searchParams.get('error_description');

  if (errorParam) {
    console.error('[Instagram Callback] Facebook returned error:', errorParam, errorDescription);
    return redirectToSocial(errorDescription || errorParam);
  }
  if (!code) {
    return redirectToSocial('No authorization code received from Facebook');
  }
  if (!state) {
    return redirectToSocial('Invalid state parameter');
  }

  const userId = state.split(':')[0];
  if (!userId) {
    return redirectToSocial('Could not parse user from state');
  }

  console.log('[Instagram Callback] Exchanging code for token...');

  let token: string;
  let expiresIn: number | undefined;

  try {
    const r = await exchangeCode(code);
    token = r.access_token;
    expiresIn = r.expires_in;

    try {
      const lt = await exchangeForLongLivedToken(token);
      token = lt.access_token;
      expiresIn = lt.expires_in;
    } catch (err) {
      console.warn('[Instagram Callback] Long-lived token exchange failed, using short-lived:', err);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error('[Instagram Callback] Code exchange failed:', msg);
    return redirectToSocial('Code exchange: ' + msg);
  }

  console.log('[Instagram Callback] Token obtained, resolving Instagram Business Account...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const resolved = await resolveInstagramBusinessAccount(token);
    console.log('[Instagram Callback] Resolved:', resolved);

    const { error: dbError } = await supabase.from('social_accounts').upsert({
      user_id: userId,
      platform: 'Instagram',
      account_name: resolved.pageName,
      account_id: resolved.igId,
      access_token: resolved.pageAccessToken,
      token_expires_at: expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null,
      status: 'connected',
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id, platform' });

    if (dbError) {
      console.error('[Instagram Callback] DB upsert failed:', dbError.message);
      return redirectToSocial('DB: ' + dbError.message);
    }

    console.log('[Instagram Callback] Success! Instagram connected.');
    return redirectConnected();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error('[Instagram Callback] Resolve failed:', msg);
    return redirectToSocial('IG resolve: ' + msg);
  }
}
