import crypto from 'crypto';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

import { getAuthorizationUrl } from '@/lib/instagram/oauth';
import { getUserFromRequest } from '@/lib/supabase';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const state = `${user.id}:${crypto.randomUUID()}`;
  const authUrl = getAuthorizationUrl(state);
  console.log('[Instagram Login] Redirect URL:', authUrl);
  redirect(authUrl);
}
