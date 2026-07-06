import type { SocialProvider, ProviderToken, ProviderAccount } from './types';

const FB_API = 'https://graph.facebook.com/v22.0';

export const facebookProvider: SocialProvider = {
  async exchangeCode(code: string, redirectUri: string): Promise<ProviderToken> {
    const clientId = process.env.FACEBOOK_CLIENT_ID!;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET!;

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const res = await fetch(`${FB_API}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Facebook token exchange failed (${res.status}): ${text}`);
    }

    const data = await res.json() as {
      access_token: string;
      expires_in?: number;
    };

    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
    };
  },

  async getAccount(token: ProviderToken): Promise<ProviderAccount> {
    const res = await fetch(`${FB_API}/me?fields=id,name&access_token=${token.access_token}`);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Facebook userinfo failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { id: string; name: string };

    return {
      account_id: data.id,
      account_name: data.name,
    };
  },

  async refreshToken(token: string): Promise<ProviderToken> {
    const clientId = process.env.FACEBOOK_CLIENT_ID!;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET!;

    const url = new URL(`${FB_API}/oauth/access_token`);
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('client_secret', clientSecret);
    url.searchParams.set('fb_exchange_token', token);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Facebook long-lived token exchange failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    return { access_token: data.access_token, expires_in: data.expires_in };
  },

  publish(): never {
    throw new Error('Facebook publishing not implemented');
  },
};
