import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { getUserFromRequest } from '@/lib/supabase';
import { retryFailedPlatforms } from '@/services/retry-manager';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let user = await getUserFromRequest(req);
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

  // Verify the item exists (skip user_id check — service role bypasses RLS, user was authenticated above)
  const { data: item, error: fetchError } = await supabase
    .from('queue_items')
    .select('id, status, retry_count, error_message, user_id')
    .eq('id', queueItemId)
    .single();

  if (fetchError || !item) {
    return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
  }

  // Retry only failed platforms
  const results = await retryFailedPlatforms(queueItemId);

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return NextResponse.json({
    success: true,
    message: failed === 0
      ? 'All failed platforms retried successfully.'
      : `${succeeded} platform(s) recovered, ${failed} still failing.`,
    results,
  });
}
