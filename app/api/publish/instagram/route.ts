import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { publishMedia } from '@/lib/instagram/publish';
import { getUserFromRequest } from '@/lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  const userId = user?.id || req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { caption, image_url } = await req.json() as { caption?: string; image_url?: string };
  if (!caption || !image_url) {
    return NextResponse.json({ error: 'caption and image_url are required' }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: account } = await supabase
    .from('social_accounts')
    .select('access_token, account_id')
    .eq('user_id', userId)
    .eq('platform', 'Instagram')
    .eq('status', 'connected')
    .single();

  if (!account?.access_token || !account?.account_id) {
    return NextResponse.json({ error: 'No connected Instagram account found' }, { status: 404 });
  }

  try {
    const result = await publishMedia(account.account_id, caption, image_url, account.access_token);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
