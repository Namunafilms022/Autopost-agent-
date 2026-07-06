import { addLog } from '@/lib/oauth-log';

const FB_API = 'https://graph.facebook.com/v22.0';

interface IgError {
  message: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

function parseError(raw: unknown): string {
  if (raw instanceof Error) return raw.message;
  try {
    const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const e = (body as { error?: IgError }).error;
    if (e) {
      let msg = e.message;
      if (e.type) msg = `[${e.type}] ${msg}`;
      if (e.code) msg += ` (code: ${e.code})`;
      if (e.error_subcode) msg += ` (subcode: ${e.error_subcode})`;
      return msg;
    }
    return JSON.stringify(body);
  } catch {
    return String(raw);
  }
}

export async function resolveInstagramBusinessAccount(
  accessToken: string,
): Promise<{ igId: string; pageId: string; pageName: string; pageAccessToken: string }> {
  const url = `${FB_API}/me/accounts?fields=instagram_business_account{id},name,id,access_token&access_token=${accessToken}`;
  addLog('graph-request', 'Fetching /me/accounts', { url: url.replace(accessToken, 'TOKEN_REDACTED') });

  const res = await fetch(url);
  const body = await res.json();

  addLog('graph-response', `/me/accounts response status=${res.status}`, { body: JSON.stringify(body).slice(0, 3000) });

  if (!res.ok || body.error) {
    const errMsg = `Failed to fetch Pages: ${parseError(body.error || body)}`;
    addLog('graph-error', errMsg, { status: res.status });
    throw new Error(errMsg);
  }

  const pages = body.data ?? [];
  addLog('graph-pages', `Found ${pages.length} pages`, {
    pages: pages.map((p: Record<string, unknown>) => ({ id: p.id, name: p.name, hasIg: !!p.instagram_business_account, igId: (p.instagram_business_account as Record<string, unknown> | undefined)?.id })),
  });

  if (pages.length === 0) {
    addLog('graph-no-pages', 'No pages returned from /me/accounts');
    throw new Error('No Facebook Pages found. The token may lack pages_show_list permission.');
  }

  for (const page of pages) {
    if (page.instagram_business_account) {
      const result = {
        igId: page.instagram_business_account.id,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token || accessToken,
      };
      addLog('graph-found', 'Found Instagram Business Account', result);
      return result;
    }
  }

  addLog('graph-no-ig', 'No page has instagram_business_account field');
  throw new Error('No Facebook Page linked to an Instagram Business account. Please connect your Instagram account to a Facebook Page in Meta Business Suite (https://business.facebook.com).');
}

export async function createMediaContainer(
  igUserId: string,
  imageUrl: string,
  caption: string,
  accessToken: string,
): Promise<string> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  });

  const res = await fetch(`${FB_API}/${igUserId}/media`, { method: 'POST', body: params });
  const body = await res.json() as { id?: string; error?: IgError };

  if (!res.ok || !body.id) {
    throw new Error(parseError(body.error || body));
  }

  return body.id;
}

export async function getMediaContainerStatus(
  containerId: string,
  accessToken: string,
): Promise<{ status: string; status_code?: string }> {
  const url = `${FB_API}/${containerId}?fields=status,status_code&access_token=${accessToken}`;
  const res = await fetch(url);
  const body = await res.json() as { status?: string; status_code?: string; error?: IgError };

  if (!res.ok || body.error) {
    throw new Error(parseError(body.error || body));
  }

  return { status: body.status ?? 'UNKNOWN', status_code: body.status_code };
}

export async function publishMediaContainer(
  igUserId: string,
  containerId: string,
  accessToken: string,
): Promise<string> {
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  const res = await fetch(`${FB_API}/${igUserId}/media_publish`, { method: 'POST', body: params });
  const body = await res.json() as { id?: string; error?: IgError };

  if (!res.ok || !body.id) {
    throw new Error(parseError(body.error || body));
  }

  return body.id;
}

export async function publishMedia(
  igUserId: string,
  caption: string,
  imageUrl: string,
  accessToken: string,
): Promise<{ mediaId: string; publishId: string }> {
  const containerId = await createMediaContainer(igUserId, imageUrl, caption, accessToken);

  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const { status } = await getMediaContainerStatus(containerId, accessToken);
    if (status === 'FINISHED') break;
    if (status === 'ERROR') {
      throw new Error('Media container failed to process');
    }
    if (i === maxAttempts - 1) {
      throw new Error(`Media container not ready after ${maxAttempts * 2}s (status: ${status})`);
    }
  }

  const publishId = await publishMediaContainer(igUserId, containerId, accessToken);

  return { mediaId: containerId, publishId };
}
