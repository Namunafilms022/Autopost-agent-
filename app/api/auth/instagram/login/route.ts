import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getAuthorizationUrl } from '@/lib/instagram/oauth';
import { getUserFromRequest } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const state = `${user.id}:${crypto.randomUUID()}`;
  const authUrl = getAuthorizationUrl(state);
  return NextResponse.redirect(new URL(authUrl));
}
