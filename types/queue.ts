export type QueueStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'scheduled' | 'posted' | 'failed';

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
  submitted_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueueItemInput {
  brand_id: string;
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
  'scheduled',
  'posted',
];

export const STATUS_LABELS: Record<QueueStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  scheduled: 'Scheduled',
  posted: 'Posted',
  failed: 'Failed',
};

export const STATUS_COLORS: Record<QueueStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
  pending_approval: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  approved: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/30',
  scheduled: 'bg-green-500/10 text-green-500 border-green-500/30',
  posted: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
};
