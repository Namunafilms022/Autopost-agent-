import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { publishQueueItem } from '@/services/publisher';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const results: Array<{ queueItemId: string; success: boolean; error?: string }> = [];

  try {
    // Fetch all approved items that are due
    const { data: items, error: fetchError } = await supabase
      .from('queue_items')
      .select('*')
      .eq('status', 'approved')
      .lte('scheduled_time', new Date().toISOString())
      .order('scheduled_time', { ascending: true });

    if (fetchError) {
      return NextResponse.json({ error: `Failed to fetch queue: ${fetchError.message}` }, { status: 500 });
    }

    // Publish each item sequentially
    for (const item of items ?? []) {
      const result = await publishQueueItem(item.id);
      results.push({ queueItemId: item.id, ...result });
    }
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Worker failed',
      results,
    }, { status: 500 });
  }

  return NextResponse.json({
    processed: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}
