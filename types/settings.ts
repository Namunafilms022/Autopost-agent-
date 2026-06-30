export type UserMode = 'quick' | 'pro';

export interface UserSettings {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  openrouter_api_key: string | null;
  timezone: string;
  default_language: string;
  default_tone: string;
  dark_mode: boolean;
  mode: UserMode;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsInput {
  full_name?: string | null;
  avatar_url?: string | null;
  openrouter_api_key?: string | null;
  timezone?: string;
  default_language?: string;
  default_tone?: string;
  dark_mode?: boolean;
  mode?: UserMode;
}

export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Kathmandu',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const;

export const TONES = [
  'Professional',
  'Casual',
  'Luxury',
  'Playful',
  'Authoritative',
  'Friendly',
  'Innovative',
  'Traditional',
  'Minimalist',
  'Bold',
] as const;

export const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'Nepali', value: 'ne' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Chinese', value: 'zh' },
] as const;
