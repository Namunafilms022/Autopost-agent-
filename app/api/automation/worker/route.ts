import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { publishQueueItem } from '@/services/publish-manager';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const processingItems = new Set<string>();

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const results: Array<{
    queueItemId: string;
    platforms: Array<{ platform: string; success: boolean; error?: string }>;
  }> = [];

  try {
    const stuckThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await supabase
      .from('queue_items')
      .update({ status: 'approved' })
      .eq('status', 'publishing')
      .lt('updated_at', stuckThreshold);

    const { data: items, error: fetchError } = await supabase
      .from('queue_items')
      .select('*')
      .eq('status', 'approved')
      .lte('scheduled_time', new Date().toISOString())
      .order('scheduled_time', { ascending: true });

    if (fetchError) {
      return NextResponse.json({ error: `Failed to fetch queue: ${fetchError.message}` }, { status: 500 });
    }

    for (const item of items ?? []) {
      if (processingItems.has(item.id)) continue;
      processingItems.add(item.id);

      try {
        const platformResults = await publishQueueItem(item.id);
        results.push({
          queueItemId: item.id,
          platforms: platformResults.map(r => ({
            platform: r.platform,
            success: r.success,
            error: r.error_message,
          })),
        });
      } finally {
        processingItems.delete(item.id);
      }
    }
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Worker failed',
      results,
    }, { status: 500 });
  }

  const allPlatforms = results.flatMap(r => r.platforms);
  return NextResponse.json({
    processed: results.length,
    succeeded: allPlatforms.filter(r => r.success).length,
    failed: allPlatforms.filter(r => !r.success).length,
    results,
  });
}
