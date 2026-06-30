export interface SocialAccount {
  id: string;
  user_id: string;
  platform: 'Instagram' | 'Facebook' | 'LinkedIn' | 'X' | 'Threads';
  account_name: string;
  account_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  status: 'connected' | 'expired' | 'disconnected';
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
}

export const SOCIAL_PLATFORMS = [
  { name: 'Instagram', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { name: 'Facebook', color: 'text-blue-600', bg: 'bg-blue-600/10' },
  { name: 'LinkedIn', color: 'text-blue-700', bg: 'bg-blue-700/10' },
  { name: 'X', color: 'text-foreground', bg: 'bg-muted' },
  { name: 'Threads', color: 'text-foreground', bg: 'bg-muted' },
] as const;

export const PLATFORM_OAUTH_URLS: Record<string, string> = {
  Instagram: 'https://api.instagram.com/oauth/authorize',
  Facebook: 'https://www.facebook.com/v19.0/dialog/oauth',
  LinkedIn: 'https://www.linkedin.com/oauth/v2/authorization',
  X: 'https://twitter.com/i/oauth2/authorize',
  Threads: 'https://threads.net/oauth/authorize',
};
