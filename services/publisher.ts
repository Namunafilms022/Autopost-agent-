import { publishQueueItem } from './publish-manager';

export async function publishQueueItemLegacy(
  queueItemId: string,
): Promise<{ success: boolean; error?: string }> {
  const results = await publishQueueItem(queueItemId);
  const allOk = results.every(r => r.success);
  const errors = results.filter(r => !r.success).map(r => r.error_message).filter(Boolean);
  return {
    success: allOk,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

export { publishQueueItem };
