import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

import { getProvider } from '@/lib/providers/registry';
import { getUserFromRequest } from '@/lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const PLATFORM_ALIAS: Record<string, string> = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  x: 'X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  const name = PLATFORM_ALIAS[platform.toLowerCase()];
  if (!name) {
    return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 });
  }

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

  const stateParts = state?.split(':') || [];
  let userId = stateParts[0];
  const codeVerifier = platform.toLowerCase() === 'x' ? stateParts[1] : undefined;

  if (!userId) {
    const user = await getUserFromRequest(req);
    if (!user) redirect('/login');
    userId = user!.id;
  }

  const provider = getProvider(name);
  const redirectUri = `${getBaseUrl()}/api/auth/${platform.toLowerCase()}/callback`;

  let tokens: { access_token: string; refresh_token?: string; expires_in?: number };
  try {
    tokens = await provider!.exchangeCode(code, redirectUri, codeVerifier);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    redirect(`/dashboard/social?error=${encodeURIComponent(name + ': ' + msg)}`);
  }

  let account: { account_id: string; account_name: string };
  try {
    account = await provider!.getAccount(tokens);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    redirect(`/dashboard/social?error=${encodeURIComponent(name + ' userinfo: ' + msg)}`);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error: dbError } = await supabase.from('social_accounts').upsert({
    platform: name,
    user_id: userId,
    account_name: account.account_name,
    account_id: account.account_id || `${name.toLowerCase()}_${userId.slice(0, 8)}`,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_expires_at: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
    status: 'connected',
    connected_at: new Date().toISOString(),
  }, { onConflict: 'user_id, platform' });

  if (dbError) {
    redirect(`/dashboard/social?error=${encodeURIComponent('DB: ' + dbError.message)}`);
  }

  redirect('/dashboard/social?connected=true');
}
