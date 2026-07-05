import type { SocialProvider, ProviderToken, ProviderAccount } from './types';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const youtubeProvider: SocialProvider = {
  async exchangeCode(code: string, redirectUri: string): Promise<ProviderToken> {
    const clientId = process.env.YOUTUBE_CLIENT_ID!;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET!;

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`YouTube token exchange failed (${res.status}): ${text}`);
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
    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`YouTube userinfo failed (${res.status}): ${text}`);
    }

    const data = await res.json() as {
      items?: Array<{ id: string; snippet?: { title?: string } }>;
    };

    if (!data.items || data.items.length === 0) {
      throw new Error('No YouTube channel found for this account');
    }

    return {
      account_id: data.items[0].id,
      account_name: data.items[0].snippet?.title ?? 'YouTube Channel',
    };
  },

  async refreshToken(token: string): Promise<ProviderToken> {
    const clientId = process.env.YOUTUBE_CLIENT_ID!;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET!;

    const body = new URLSearchParams({
      refresh_token: token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`YouTube token refresh failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number };
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  },

  publish(): never {
    throw new Error('YouTube publishing not implemented yet');
  },
};
