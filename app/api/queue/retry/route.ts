import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { getUserFromRequest } from '@/lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  const userId = user?.id || req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { queueItemId } = await req.json() as { queueItemId?: string };
  if (!queueItemId) {
    return NextResponse.json({ error: 'queueItemId is required' }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Verify the item belongs to this user
  const { data: item, error: fetchError } = await supabase
    .from('queue_items')
    .select('id, status, retry_count, error_message, user_id')
    .eq('id', queueItemId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !item) {
    return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
  }

  if (item.status !== 'failed') {
    return NextResponse.json({ error: `Cannot retry: current status is "${item.status}"` }, { status: 400 });
  }

  if ((item.retry_count ?? 0) >= 3) {
    return NextResponse.json({ error: 'Max retries (3) reached. Create a new post instead.' }, { status: 400 });
  }

  // Reset to approved so the worker will pick it up
  const { error: updateError } = await supabase
    .from('queue_items')
    .update({
      status: 'approved',
      error_message: null,
    })
    .eq('id', queueItemId);

  if (updateError) {
    return NextResponse.json({ error: `Database update failed: ${updateError.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Post reset to approved. Automation will retry on next cycle.' });
}
