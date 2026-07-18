import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { addLog } from '@/lib/oauth-log';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FB_API = 'https://graph.facebook.com/v22.0';

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
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const errorParam = req.nextUrl.searchParams.get('error');
  const errorDescription = req.nextUrl.searchParams.get('error_description');

  if (errorParam) {
    return redirectToSocial(errorDescription || errorParam);
  }
  if (!code) {
    return redirectToSocial('OAuth callback missing code');
  }

  // --- Stage 1: Token Exchange via Facebook Login ---
  const clientId = process.env.FACEBOOK_CLIENT_ID!;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET!;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  let token: string;
  let expiresIn: number | undefined;

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    const res = await fetch(`${FB_API}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Token exchange failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const data = await res.json() as { access_token: string; expires_in?: number };
    token = data.access_token;
    expiresIn = data.expires_in;
    addLog('ig-token-exchange', 'Facebook OAuth token obtained');
  } catch (err) {
    return redirectToSocial(`Instagram/Facebook token exchange failed: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  // --- Stage 2: Resolve Instagram Business Account ID ---
  let igAccountId: string | null = null;
  let pageName = 'Instagram Account';

  try {
    const r1 = await fetch(`${FB_API}/me/instagram_business_account?fields=id,username,name&access_token=${token}`);
    const d1 = await r1.json() as { id?: string; username?: string; name?: string; error?: { message: string } };
    addLog('ig-resolve', `/me/instagram_business_account status=${r1.status}`, { body: JSON.stringify(d1).slice(0, 300) });
    if (r1.ok && d1.id) {
      igAccountId = d1.id;
      pageName = d1.name || d1.username || `Instagram ${d1.id}`;
    }
  } catch { /* ignore */ }

  if (!igAccountId) {
    try {
      const r2 = await fetch(`${FB_API}/me/accounts?fields=instagram_business_account{id},name&access_token=${token}`);
      const d2 = await r2.json() as { data?: Array<{ instagram_business_account?: { id: string }; name: string }> };
      addLog('ig-resolve-fallback', `/me/accounts status=${r2.status}`, { body: JSON.stringify(d2).slice(0, 300) });
      if (r2.ok && d2.data) {
        for (const page of d2.data) {
          if (page.instagram_business_account?.id) {
            igAccountId = page.instagram_business_account.id;
            pageName = page.name;
            break;
          }
        }
      }
    } catch { /* ignore */ }
  }

  if (!igAccountId) {
    return redirectToSocial(
      'Could not find your Instagram Business Account. Make sure your Instagram account is a Business or Creator account '
      + 'and is linked to a Facebook Page in Meta Business Suite.',
    );
  }

  addLog('ig-resolve-success', `Resolved IG Business Account ID: ${igAccountId}`);

  // --- Stage 3: Long-lived token exchange ---
  try {
    const fbUrl = new URL(`${FB_API}/oauth/access_token`);
    fbUrl.searchParams.set('grant_type', 'fb_exchange_token');
    fbUrl.searchParams.set('client_id', clientId);
    fbUrl.searchParams.set('client_secret', clientSecret);
    fbUrl.searchParams.set('fb_exchange_token', token);
    const llRes = await fetch(fbUrl.toString());
    if (llRes.ok) {
      const llData = await llRes.json() as { access_token: string; expires_in: number };
      token = llData.access_token;
      expiresIn = llData.expires_in;
      addLog('ig-long-lived', 'Token exchanged for long-lived Facebook token');
    }
  } catch { /* ignore */ }

  // --- Stage 4: Database Update ---
  const userId = state?.split(':')[0];
  if (!userId) {
    return redirectToSocial('Invalid state parameter');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  addLog('ig-db-upsert', 'Saving Instagram account', { igAccountId, pageName });

  const { error: dbError } = await supabase.from('social_accounts').upsert({
    user_id: userId,
    platform: 'Instagram',
    account_name: pageName,
    account_id: igAccountId,
    access_token: token,
    token_expires_at: expiresAt,
    status: 'connected',
    connected_at: new Date().toISOString(),
  }, { onConflict: 'user_id, platform' });

  if (dbError) {
    return redirectToSocial(`Database update failed: ${dbError.message}`);
  }

  return redirectConnected();
}
