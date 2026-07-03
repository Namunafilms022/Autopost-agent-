import type { SocialProvider, ProviderToken, ProviderAccount } from './types';

const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';

export const tiktokProvider: SocialProvider = {
  async exchangeCode(code: string, redirectUri: string): Promise<ProviderToken> {
    const clientId = process.env.TIKTOK_CLIENT_ID!;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;

    const body = new URLSearchParams({
      client_key: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`TikTok token exchange failed (${res.status}): ${text}`);
    }

    const data = await res.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  },

  async getAccount(token: ProviderToken): Promise<ProviderAccount> {
    const res = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`TikTok userinfo failed (${res.status}): ${text}`);
    }

    const data = await res.json() as {
      data?: { user?: { display_name?: string } };
    };

    const displayName = data?.data?.user?.display_name;
    return {
      account_id: '',
      account_name: displayName ?? 'TikTok Account',
    };
  },

  async refreshToken(token: string): Promise<ProviderToken> {
    const clientId = process.env.TIKTOK_CLIENT_ID!;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;

    const body = new URLSearchParams({
      client_key: clientId,
      client_secret: clientSecret,
      refresh_token: token,
      grant_type: 'refresh_token',
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`TikTok token refresh failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number };
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  },

  publish(): never {
    throw new Error('TikTok publishing not implemented yet');
  },
};
