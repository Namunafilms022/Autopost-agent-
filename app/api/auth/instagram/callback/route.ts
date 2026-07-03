import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

import { exchangeCode, exchangeForLongLivedToken } from '@/lib/instagram/oauth';
import { resolveInstagramBusinessAccount } from '@/lib/instagram/publish';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const errorParam = req.nextUrl.searchParams.get('error');
  const errorDescription = req.nextUrl.searchParams.get('error_description');

  if (errorParam) {
    redirect(`/dashboard/social?error=${encodeURIComponent(errorDescription || errorParam)}`);
  }
  if (!code) {
    redirect('/dashboard/social?error=No+authorization+code+received');
  }
  if (!state) {
    redirect('/dashboard/social?error=Invalid+state+parameter');
  }

  const userId = state.split(':')[0];
  if (!userId) {
    redirect('/dashboard/social?error=Could+not+parse+user+from+state');
  }

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
    } catch {
      // short-lived is fine
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    redirect(`/dashboard/social?error=${encodeURIComponent('Code exchange: ' + msg)}`);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const resolved = await resolveInstagramBusinessAccount(token);
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
      redirect(`/dashboard/social?error=${encodeURIComponent('DB: ' + dbError.message)}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    redirect(`/dashboard/social?error=${encodeURIComponent('IG resolve: ' + msg)}`);
  }

  redirect('/dashboard/social?connected=true');
}
