import type { SocialProvider } from './types';
import { linkedinProvider } from './linkedin';
import { xProvider } from './x';
import { tiktokProvider } from './tiktok';
import { youtubeProvider } from './youtube';
import { facebookProvider } from './facebook';

const providers: Record<string, SocialProvider> = {
  LinkedIn: linkedinProvider,
  X: xProvider,
  TikTok: tiktokProvider,
  YouTube: youtubeProvider,
  Facebook: facebookProvider,
};

export function getProvider(name: string): SocialProvider | undefined {
  return providers[name];
}

export function getActiveProviders(): string[] {
  return Object.keys(providers);
}

export const DISABLED_PROVIDERS = ['Instagram'];
