import { addLog } from '@/lib/oauth-log';

export function getAuthorizationUrl(state: string): string {
  const clientId = process.env.INSTAGRAM_CLIENT_ID!;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  addLog('auth-url', 'Building Instagram Business Login URL', { clientId: clientId?.slice(0, 6) + '...', baseUrl, redirectUri });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'instagram_business_basic,instagram_business_content_publish',
    state,
  });

  const url = `https://www.instagram.com/oauth/authorize?${params}`;
  addLog('auth-url', 'Generated OAuth URL', { url: url.slice(0, 120) + '...' });
  return url;
}

export async function exchangeCode(
  code: string,
): Promise<{ access_token: string; user_id: string; expires_in?: number }> {
  const clientId = process.env.INSTAGRAM_CLIENT_ID!;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET!;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  addLog('exchange-code', 'Exchanging code via Instagram API', {
    clientId: clientId?.slice(0, 6) + '...',
    clientSecretSet: !!clientSecret,
    codeLength: code.length,
    redirectUri,
  });

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    addLog('exchange-code', `FAILED: Token exchange returned ${res.status}`, { response: text });
    throw new Error(`Instagram token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  if (!data.access_token || !data.user_id) {
    addLog('exchange-code', 'FAILED: Missing access_token or user_id in response', { data });
    throw new Error('Instagram token exchange: missing access_token or user_id');
  }

  addLog('exchange-code', 'Token exchange successful', {
    tokenLength: data.access_token?.length,
    userId: data.user_id,
  });

  return {
    access_token: data.access_token,
    user_id: data.user_id,
    expires_in: data.expires_in,
  };
}

export async function exchangeForLongLivedToken(
  shortToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET!;

  addLog('long-lived', 'Exchanging for long-lived token', {
    shortTokenLength: shortToken.length,
    clientSecretSet: !!clientSecret,
  });

  const url = new URL('https://graph.instagram.com/access_token');
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('access_token', shortToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    addLog('long-lived', `FAILED: Long-lived exchange returned ${res.status}`, { response: text });
    throw new Error(`Instagram long-lived token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  addLog('long-lived', 'Long-lived token obtained', {
    tokenLength: data.access_token?.length,
    expires_in: data.expires_in,
  });

  return data;
}
