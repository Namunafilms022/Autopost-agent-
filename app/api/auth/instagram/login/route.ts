import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getUserFromRequest } from '@/lib/supabase';
import { addLog } from '@/lib/oauth-log';

export async function GET(req: NextRequest) {
  addLog('ig-login-received', 'Instagram login redirecting to Facebook OAuth');

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL('/dashboard/social?error=Facebook+OAuth+client+ID+not+configured', req.url),
    );
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const state = `${user.id}:${crypto.randomUUID()}`;
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'pages_show_list,instagram_basic,instagram_content_publish',
    state,
  });

  const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?${params}`;
  addLog('ig-login-redirect', authUrl.slice(0, 120));

  return new Response(null, { status: 302, headers: { Location: authUrl } });
}
