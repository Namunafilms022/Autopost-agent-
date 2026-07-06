import { addLog } from '@/lib/oauth-log';

export function getAuthorizationUrl(state: string): string {
  const clientId = process.env.INSTAGRAM_CLIENT_ID!;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  addLog('auth-url', 'Building auth URL', { clientId: clientId?.slice(0, 6) + '...', baseUrl, redirectUri, state: state.slice(0, 20) + '...' });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'pages_show_list,pages_read_engagement,instagram_basic',
    state,
  });

  const url = `https://www.facebook.com/v22.0/dialog/oauth?${params}`;
  addLog('auth-url', 'Generated Facebook OAuth URL', { url: url.slice(0, 100) + '...' });
  return url;
}

export async function exchangeCode(
  code: string,
): Promise<{ access_token: string; expires_in?: number }> {
  const clientId = process.env.INSTAGRAM_CLIENT_ID!;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET!;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  addLog('exchange-code', 'Exchanging code for token', {
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

  const res = await fetch('https://graph.facebook.com/v22.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    addLog('exchange-code', `FAILED: Token exchange returned ${res.status}`, { response: text });
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in?: number };
  addLog('exchange-code', 'Token exchange successful', {
    tokenLength: data.access_token?.length,
    expires_in: data.expires_in,
  });

  return { access_token: data.access_token, expires_in: data.expires_in };
}

export async function exchangeForLongLivedToken(
  shortToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env.INSTAGRAM_CLIENT_ID!;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET!;

  addLog('long-lived', 'Exchanging for long-lived token', {
    shortTokenLength: shortToken.length,
    clientId: clientId?.slice(0, 6) + '...',
    clientSecretSet: !!clientSecret,
  });

  const url = new URL('https://graph.facebook.com/v22.0/oauth/access_token');
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('fb_exchange_token', shortToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    addLog('long-lived', `FAILED: Long-lived exchange returned ${res.status}`, { response: text });
    throw new Error(`Long-lived token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  addLog('long-lived', 'Long-lived token obtained', {
    tokenLength: data.access_token?.length,
    expires_in: data.expires_in,
  });

  return data;
}
