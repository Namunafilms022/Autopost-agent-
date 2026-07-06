import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getAuthorizationUrl } from '@/lib/instagram/oauth';
import { getUserFromRequest } from '@/lib/supabase';
import { addLog } from '@/lib/oauth-log';

export async function GET(req: NextRequest) {
  addLog('login-received', 'Login route called', { url: req.url });

  const clientIdSet = !!process.env.INSTAGRAM_CLIENT_ID;
  const clientSecretSet = !!process.env.INSTAGRAM_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  addLog('login-env', 'Environment check', { clientIdSet, clientSecretSet, appUrl });

  const user = await getUserFromRequest(req);
  if (!user) {
    addLog('login-error', 'User not authenticated, redirecting to /login');
    return NextResponse.redirect(new URL('/login', req.url));
  }

  addLog('login-user', 'User authenticated', { userId: user.id.slice(0, 10) + '...' });

  const state = `${user.id}:${crypto.randomUUID()}`;
  const authUrl = getAuthorizationUrl(state);
  addLog('login-redirect', 'Redirecting to Facebook OAuth');

  return new Response(null, {
    status: 302,
    headers: { Location: authUrl },
  });
}
