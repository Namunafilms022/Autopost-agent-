export type PlatformName = 'Instagram' | 'Facebook' | 'LinkedIn' | 'X' | 'TikTok' | 'YouTube';

export type PlatformStatus = 'pending' | 'queued' | 'publishing' | 'published' | 'failed';

export interface PlatformState {
  status: PlatformStatus;
  error?: string;
  response?: Record<string, unknown>;
  published_at?: string;
  retry_count: number;
  platform_post_id?: string;
  started_at?: string;
}

export type QueueStatus = 'draft' | 'pending_approval' | 'approved' | 'queued' | 'publishing' | 'published' | 'failed' | 'partially_published';

export interface QueueItem {
  id: string;
  user_id: string;
  brand_id: string | null;
  platform: string;
  platforms: Record<string, PlatformState>;
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
  platforms?: Record<string, PlatformState>;
  caption: string | null;
  hashtags: string | null;
  image_prompt?: string | null;
  title?: string | null;
  asset_url?: string | null;
  scheduled_time: string;
  status: QueueStatus;
  user_id?: string;
}

export interface QueueItemUpdate {
  platform?: string;
  platforms?: Record<string, PlatformState>;
  caption?: string | null;
  hashtags?: string | null;
  image_prompt?: string | null;
  title?: string | null;
  asset_url?: string | null;
  scheduled_time?: string;
  status?: QueueStatus;
}

export const STATUS_FLOW: QueueStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'queued',
  'publishing',
  'published',
];

export const STATUS_LABELS: Record<QueueStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending',
  approved: 'Approved',
  queued: 'Queued',
  publishing: 'Publishing',
  published: 'Published',
  failed: 'Failed',
  partially_published: 'Partially Published',
};

export const STATUS_COLORS: Record<QueueStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
  pending_approval: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  approved: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  queued: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
  publishing: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  published: 'bg-green-600/10 text-green-600 border-green-600/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
  partially_published: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
};

export const PLATFORM_STATUS_LABELS: Record<PlatformStatus, string> = {
  pending: 'Pending',
  queued: 'Queued',
  publishing: 'Publishing',
  published: 'Published',
  failed: 'Failed',
};

export const PLATFORM_STATUS_COLORS: Record<PlatformStatus, string> = {
  pending: 'text-slate-400',
  queued: 'text-indigo-400',
  publishing: 'text-purple-400',
  published: 'text-emerald-400',
  failed: 'text-red-400',
};

export const ALL_PLATFORMS: PlatformName[] = ['Instagram', 'Facebook', 'LinkedIn', 'X', 'TikTok', 'YouTube'];
