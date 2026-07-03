import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

import { getOAuthConfig } from '@/lib/oauth';
import { getUserFromRequest } from '@/lib/supabase';
import type { NextRequest } from 'next/server';

const PLATFORM_ALIAS: Record<string, string> = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  x: 'X',
  tiktok: 'TikTok',
};

function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export async function GET(
  req: NextRequest,
  { params: routeParams }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await routeParams;
  const name = PLATFORM_ALIAS[platform.toLowerCase()];
  if (!name) {
    return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 });
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const config = getOAuthConfig(name);
  if (!config) {
    return NextResponse.json({ error: `OAuth not configured for ${name}` }, { status: 400 });
  }

  const clientId = process.env[config.clientIdEnv];
  if (!clientId) {
    return NextResponse.json({ error: `${config.clientIdEnv} not set` }, { status: 400 });
  }

  const redirectUri = `${getBaseUrl()}/api/auth/${platform.toLowerCase()}/callback`;
  const state = `${user.id}:${crypto.randomUUID()}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
    ...config.extraParams,
  });

  redirect(`${config.authorizeUrl}?${params}`);
}
