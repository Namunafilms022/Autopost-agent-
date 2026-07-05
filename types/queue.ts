export type QueueStatus = 'draft' | 'pending_approval' | 'approved' | 'publishing' | 'rejected' | 'scheduled' | 'posted' | 'failed';

export interface QueueItem {
  id: string;
  user_id: string;
  brand_id: string;
  platform: string;
  caption: string | null;
  hashtags: string | null;
  image_prompt: string | null;
  title: string | null;
  asset_url: string | null;
  scheduled_time: string;
  status: QueueStatus;
  retry_count: number;
  error_message: string | null;
  published_at: string | null;
  platform_response: Record<string, unknown> | null;
  submitted_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueueItemInput {
  brand_id?: string | null;
  platform: string;
  caption: string | null;
  hashtags: string | null;
  image_prompt?: string | null;
  title?: string | null;
  asset_url?: string | null;
  scheduled_time: string;
  status: QueueStatus;
}

export const STATUS_FLOW: QueueStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'publishing',
  'scheduled',
  'posted',
];

export const STATUS_LABELS: Record<QueueStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending',
  approved: 'Approved',
  publishing: 'Publishing',
  rejected: 'Rejected',
  scheduled: 'Scheduled',
  posted: 'Published',
  failed: 'Failed',
};

export const STATUS_COLORS: Record<QueueStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
  pending_approval: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  approved: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  publishing: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/30',
  scheduled: 'bg-green-500/10 text-green-500 border-green-500/30',
  posted: 'bg-green-600/10 text-green-600 border-green-600/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
};
