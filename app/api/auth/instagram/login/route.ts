import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getAuthorizationUrl } from '@/lib/instagram/oauth';
import { getUserFromRequest } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  console.log('[Instagram Login] Request received:', req.url);
  console.log('[Instagram Login] INSTAGRAM_CLIENT_ID set:', !!process.env.INSTAGRAM_CLIENT_ID);
  console.log('[Instagram Login] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const state = `${user.id}:${crypto.randomUUID()}`;
  const authUrl = getAuthorizationUrl(state);
  console.log('[Instagram Login] Redirecting to Facebook OAuth URL');
  return new Response(null, {
    status: 302,
    headers: { Location: authUrl },
  });
}
