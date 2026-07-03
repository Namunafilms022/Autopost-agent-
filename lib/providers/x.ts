import type { SocialProvider, ProviderToken, ProviderAccount } from './types';

const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

export const xProvider: SocialProvider = {
  async exchangeCode(code: string, redirectUri: string, codeVerifier?: string): Promise<ProviderToken> {
    const clientId = process.env.X_CLIENT_ID!;
    const clientSecret = process.env.X_CLIENT_SECRET!;
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    if (!codeVerifier) {
      throw new Error('X OAuth requires code_verifier');
    }

    const body = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`X token exchange failed (${res.status}): ${text}`);
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
    const res = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`X userinfo failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { data?: { id: string; name: string; username: string } };
    if (!data.data) {
      throw new Error('No user data from X API');
    }

    return {
      account_id: data.data.id,
      account_name: `${data.data.name} (@${data.data.username})`,
    };
  },

  async refreshToken(token: string): Promise<ProviderToken> {
    const clientId = process.env.X_CLIENT_ID!;
    const clientSecret = process.env.X_CLIENT_SECRET!;
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = new URLSearchParams({
      refresh_token: token,
      grant_type: 'refresh_token',
      client_id: clientId,
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`X token refresh failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number };
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  },

  publish(): never {
    throw new Error('X publishing not implemented yet');
  },
};
