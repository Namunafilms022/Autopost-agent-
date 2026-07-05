export interface PublishLog {
  id: string;
  queue_item_id: string;
  user_id: string;
  platform: string;
  status: 'pending' | 'publishing' | 'success' | 'failed';
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  platform_response: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

export interface PublishLogInput {
  queue_item_id: string;
  user_id: string;
  platform: string;
  status?: PublishLog['status'];
}
