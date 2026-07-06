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
  console.log('[Instagram Resolve] Fetching Pages:', url.replace(accessToken, 'TOKEN_REDACTED'));

  const res = await fetch(url);
  const body = await res.json() as { data?: Array<{ id: string; name: string; access_token?: string; instagram_business_account?: { id: string } }>; error?: IgError };

  console.log('[Instagram Resolve] Response status:', res.status);
  console.log('[Instagram Resolve] Response body:', JSON.stringify(body, null, 2).slice(0, 2000));

  if (!res.ok || body.error) {
    const errMsg = `Failed to fetch Pages: ${parseError(body.error || body)}`;
    console.error('[Instagram Resolve] Error:', errMsg);
    throw new Error(errMsg);
  }

  const pages = body.data ?? [];
  console.log('[Instagram Resolve] Pages found:', pages.length);
  for (const page of pages) {
    console.log('[Instagram Resolve] Page:', { id: page.id, name: page.name, hasIg: !!page.instagram_business_account, igId: page.instagram_business_account?.id });
  }

  for (const page of pages) {
    if (page.instagram_business_account) {
      const result = {
        igId: page.instagram_business_account.id,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token || accessToken,
      };
      console.log('[Instagram Resolve] Found Instagram account:', result);
      return result;
    }
  }

  const errMsg = 'No Facebook Page linked to an Instagram Business account.';
  console.error('[Instagram Resolve]', errMsg);
  throw new Error(errMsg);
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
