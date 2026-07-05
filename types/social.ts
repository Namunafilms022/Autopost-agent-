export interface SocialAccount {
  id: string;
  user_id: string;
  platform: 'Instagram' | 'Facebook' | 'LinkedIn' | 'X' | 'TikTok' | 'YouTube';
  account_name: string;
  account_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  status: 'connected' | 'expired' | 'disconnected';
  connected_at: string;
  created_at: string;
  updated_at: string;
}

export interface SocialAccountInput {
  platform: SocialAccount['platform'];
  account_name: string;
  account_id: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  connected_at?: string;
}

export const SOCIAL_PLATFORMS = [
  { name: 'Instagram' as const, color: 'text-pink-500', bg: 'bg-pink-500/10', disabled: false },
  { name: 'Facebook' as const, color: 'text-blue-600', bg: 'bg-blue-600/10', disabled: false },
  { name: 'LinkedIn' as const, color: 'text-blue-700', bg: 'bg-blue-700/10', disabled: false },
  { name: 'X' as const, color: 'text-foreground', bg: 'bg-muted', disabled: false },
  { name: 'TikTok' as const, color: 'text-foreground', bg: 'bg-muted', disabled: false },
  { name: 'YouTube' as const, color: 'text-red-500', bg: 'bg-red-500/10', disabled: false },
];


