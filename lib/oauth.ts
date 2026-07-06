export interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  scope: string;
  parseTokenResponse: (data: Record<string, unknown>) => { access_token: string; refresh_token?: string; expires_in?: number };
  extraParams?: Record<string, string>;
}

export const PLATFORM_OAUTH: Record<string, OAuthConfig> = {
  Facebook: {
    authorizeUrl: 'https://www.facebook.com/v22.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
    clientIdEnv: 'FACEBOOK_CLIENT_ID',
    clientSecretEnv: 'FACEBOOK_CLIENT_SECRET',
    scope: 'pages_show_list,pages_read_engagement',
    parseTokenResponse: (data: Record<string, unknown>) => ({
      access_token: data.access_token as string,
      refresh_token: undefined,
      expires_in: data.expires_in as number | undefined,
    }),
  },
  LinkedIn: {
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    scope: 'openid profile email w_member_social',
    parseTokenResponse: (data: Record<string, unknown>) => ({
      access_token: data.access_token as string,
      refresh_token: undefined,
      expires_in: data.expires_in as number | undefined,
    }),
  },
  X: {
    authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET',
    scope: 'tweet.read tweet.write users.read',
    extraParams: {},
    parseTokenResponse: (data: Record<string, unknown>) => ({
      access_token: data.access_token as string,
      refresh_token: data.refresh_token as string | undefined,
      expires_in: data.expires_in as number | undefined,
    }),
  },
  TikTok: {
    authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    clientIdEnv: 'TIKTOK_CLIENT_ID',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    scope: 'user.info.basic,video.publish,video.upload',
    parseTokenResponse: (data: Record<string, unknown>) => ({
      access_token: data.access_token as string,
      refresh_token: data.refresh_token as string | undefined,
      expires_in: data.expires_in as number | undefined,
    }),
  },
  YouTube: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    clientSecretEnv: 'YOUTUBE_CLIENT_SECRET',
    scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload',
    parseTokenResponse: (data: Record<string, unknown>) => ({
      access_token: data.access_token as string,
      refresh_token: data.refresh_token as string | undefined,
      expires_in: data.expires_in as number | undefined,
    }),
  },
};

export function getOAuthConfig(platform: string): OAuthConfig | undefined {
  return PLATFORM_OAUTH[platform];
}

function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export function buildOAuthUrl(platform: string): string | null {
  const config = getOAuthConfig(platform);
  if (!config) return null;

  const clientId = process.env[config.clientIdEnv];
  if (!clientId) return null;

  const redirectUri = `${getBaseUrl()}/api/auth/${platform.toLowerCase()}/callback`;
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
    ...config.extraParams,
  });

  return `${config.authorizeUrl}?${params}`;
}

export async function exchangeCode(
  platform: string,
  code: string,
  redirectUriOverride?: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const config = getOAuthConfig(platform);
  if (!config) throw new Error(`Unknown platform: ${platform}`);

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  if (!clientId || !clientSecret) throw new Error(`${platform} OAuth credentials not configured`);

  const redirectUri = redirectUriOverride || `${getBaseUrl()}/api/auth/${platform.toLowerCase()}/callback`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return config.parseTokenResponse(data);
}

export async function exchangeForLongLivedToken(
  platform: string,
  shortLivedToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const config = getOAuthConfig(platform);
  if (!config) throw new Error(`Unknown platform: ${platform}`);

  const clientSecret = process.env[config.clientSecretEnv];

  const clientId = process.env[config.clientIdEnv];
  const url = new URL('https://graph.facebook.com/v22.0/oauth/access_token');
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', clientId!);
  url.searchParams.set('client_secret', clientSecret!);
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Long-lived token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}


