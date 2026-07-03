import type { SocialProvider, ProviderToken, ProviderAccount } from './types';

const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

export const linkedinProvider: SocialProvider = {
  async exchangeCode(code: string, redirectUri: string): Promise<ProviderToken> {
    const clientId = process.env.LINKEDIN_CLIENT_ID!;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;

    const body = new URLSearchParams({
      client_id: clientId,
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
      throw new Error(`LinkedIn token exchange failed (${res.status}): ${text}`);
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
    const res = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`LinkedIn userinfo failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { sub: string; name?: string };
    return {
      account_id: data.sub,
      account_name: data.name ?? 'LinkedIn Account',
    };
  },

  async refreshToken(token: string): Promise<ProviderToken> {
    const clientId = process.env.LINKEDIN_CLIENT_ID!;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;

    const body = new URLSearchParams({
      client_id: clientId,
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
      throw new Error(`LinkedIn token refresh failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number };
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  },

  publish(): never {
    throw new Error('LinkedIn publishing not implemented yet');
  },
};
