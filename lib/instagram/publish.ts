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

interface IgAccountInfo {
  igId: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
}

export async function resolveInstagramBusinessAccount(
  accessToken: string,
): Promise<IgAccountInfo> {
  addLog('graph-start', 'Starting Instagram account resolution', { tokenLength: accessToken.length });

  // Strategy 1: /me/accounts with instagram_business_account field expansion
  const result = await tryViaMeAccounts(accessToken);
  if (result) return result;

  // Strategy 2: For each page, query the page directly with its token
  addLog('graph-strategy-2', 'Trying per-page direct query for instagram_business_account');
  const result2 = await tryViaPageDirect(accessToken);
  if (result2) return result2;

  // Strategy 3: Try /me/instagram_business_account
  addLog('graph-strategy-3', 'Trying /me/instagram_business_account endpoint');
  const result3 = await tryViaUserEndpoint(accessToken);
  if (result3) return result3;

  // Strategy 4: Try /{page-id}/instagram_accounts with page access token
  addLog('graph-strategy-4', 'Trying /{page-id}/instagram_accounts endpoint');
  const result4 = await tryViaPageInstagramAccounts(accessToken);
  if (result4) return result4;

  addLog('graph-exhausted', 'All strategies exhausted. Instagram account not found.');
  throw new Error(
    'No Facebook Page linked to an Instagram Business account. '
    + 'Please verify in Meta Business Suite that your Instagram Business account is properly linked to a Facebook Page, '
    + 'and that your Meta App has the required permissions (instagram_basic, pages_read_engagement).',
  );
}

async function tryViaMeAccounts(userToken: string): Promise<IgAccountInfo | null> {
  addLog('strategy-1', 'Querying /me/accounts with instagram_business_account field');
  const url = `${FB_API}/me/accounts?fields=instagram_business_account{id},name,id,access_token&access_token=${userToken}`;
  const res = await fetch(url);
  const body = await res.json();
  addLog('strategy-1-response', `Status ${res.status}`, { body: JSON.stringify(body).slice(0, 3000) });

  if (!res.ok) {
    addLog('strategy-1-error', `/me/accounts failed: ${parseError(body.error || body)}`);
    return null;
  }

  const pages = body.data ?? [];
  addLog('strategy-1-pages', `Found ${pages.length} pages`, {
    pages: pages.map((p: Record<string, unknown>) => ({
      id: p.id,
      name: p.name,
      hasIg: !!p.instagram_business_account,
      igId: (p.instagram_business_account as Record<string, unknown> | undefined)?.id,
    })),
  });

  for (const page of pages) {
    if (page.instagram_business_account) {
      const result: IgAccountInfo = {
        igId: page.instagram_business_account.id,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token || userToken,
      };
      addLog('strategy-1-found', 'Found Instagram account via /me/accounts', result);
      return result;
    }
  }

  addLog('strategy-1-no-ig', 'No page had instagram_business_account field');
  return null;
}

async function tryViaPageDirect(userToken: string): Promise<IgAccountInfo | null> {
  // First get all pages to get their page tokens
  const listUrl = `${FB_API}/me/accounts?fields=id,name,access_token&access_token=${userToken}`;
  const listRes = await fetch(listUrl);
  const listBody = await listRes.json();
  addLog('strategy-2-pages', `Fetching page list for direct query`, { status: listRes.status });

  if (!listRes.ok) return null;

  const pages: Array<Record<string, unknown>> = listBody.data ?? [];
  addLog('strategy-2-count', `Found ${pages.length} pages to try individually`);

  for (const page of pages) {
    const pageId = page.id as string;
    const pageToken = page.access_token as string || userToken;
    addLog('strategy-2-trying', `Querying page ${pageId} (${page.name})`, { pageId });

    // Try with page access token
    const pageUrl = `${FB_API}/${pageId}?fields=instagram_business_account{id},name,id&access_token=${pageToken}`;
    const pageRes = await fetch(pageUrl);
    const pageBody = await pageRes.json();
    addLog('strategy-2-response', `Page ${pageId} status ${pageRes.status}`, { body: JSON.stringify(pageBody).slice(0, 2000) });

    if (pageRes.ok && pageBody.instagram_business_account) {
      const result: IgAccountInfo = {
        igId: pageBody.instagram_business_account.id,
        pageId,
        pageName: (pageBody.name || page.name) as string,
        pageAccessToken: pageToken,
      };
      addLog('strategy-2-found', 'Found Instagram account via direct page query', result);
      return result;
    }

    // Try with user access token
    const userUrl = `${FB_API}/${pageId}?fields=instagram_business_account{id},name,id&access_token=${userToken}`;
    const userRes = await fetch(userUrl);
    const userBody = await userRes.json();
    addLog('strategy-2-user-response', `Page ${pageId} with user token status ${userRes.status}`, { body: JSON.stringify(userBody).slice(0, 2000) });

    if (userRes.ok && userBody.instagram_business_account) {
      const result: IgAccountInfo = {
        igId: userBody.instagram_business_account.id,
        pageId,
        pageName: (userBody.name || page.name) as string,
        pageAccessToken: pageToken,
      };
      addLog('strategy-2-found', 'Found Instagram account via direct page query (user token)', result);
      return result;
    }
  }

  addLog('strategy-2-none', 'No Instagram account found via direct page queries');
  return null;
}

async function tryViaUserEndpoint(userToken: string): Promise<IgAccountInfo | null> {
  addLog('strategy-3', 'Trying /me/instagram_business_account');
  const url = `${FB_API}/me/instagram_business_account?fields=id,username,name&access_token=${userToken}`;
  const res = await fetch(url);
  const body = await res.json();
  addLog('strategy-3-response', `Status ${res.status}`, { body: JSON.stringify(body).slice(0, 2000) });

  if (res.ok && body.id) {
    addLog('strategy-3-found', 'Found Instagram account via /me/instagram_business_account', {
      igId: body.id,
      username: body.username,
    });
    return {
      igId: body.id,
      pageId: body.id,
      pageName: body.username || body.name || `Instagram ${body.id}`,
      pageAccessToken: userToken,
    };
  }

  addLog('strategy-3-none', '/me/instagram_business_account did not return an account');
  return null;
}

async function tryViaPageInstagramAccounts(userToken: string): Promise<IgAccountInfo | null> {
  // First get pages
  const listUrl = `${FB_API}/me/accounts?fields=id,name,access_token&access_token=${userToken}`;
  const listRes = await fetch(listUrl);
  const listBody = await listRes.json();
  if (!listRes.ok) return null;

  const pages: Array<Record<string, unknown>> = listBody.data ?? [];

  for (const page of pages) {
    const pageId = page.id as string;
    const pageToken = page.access_token as string || userToken;

    addLog('strategy-4-trying', `Querying /${pageId}/instagram_accounts`, { pageId });

    // With page token
    const url = `${FB_API}/${pageId}/instagram_accounts?fields=id,username&access_token=${pageToken}`;
    const res = await fetch(url);
    const body = await res.json();
    addLog('strategy-4-response', `Status ${res.status}`, { body: JSON.stringify(body).slice(0, 2000) });

    if (res.ok && body.data && body.data.length > 0) {
      const igAccount = body.data[0];
      const result: IgAccountInfo = {
        igId: igAccount.id,
        pageId,
        pageName: (page.name as string) || `Instagram ${igAccount.id}`,
        pageAccessToken: pageToken,
      };
      addLog('strategy-4-found', 'Found Instagram account via /instagram_accounts', result);
      return result;
    }

    // Try with user token too
    const url2 = `${FB_API}/${pageId}/instagram_accounts?fields=id,username&access_token=${userToken}`;
    const res2 = await fetch(url2);
    const body2 = await res2.json();
    addLog('strategy-4-user-response', `Status ${res2.status}`, { body: JSON.stringify(body2).slice(0, 2000) });

    if (res2.ok && body2.data && body2.data.length > 0) {
      const igAccount = body2.data[0];
      const result: IgAccountInfo = {
        igId: igAccount.id,
        pageId,
        pageName: (page.name as string) || `Instagram ${igAccount.id}`,
        pageAccessToken: pageToken,
      };
      addLog('strategy-4-found', 'Found Instagram account via /instagram_accounts (user token)', result);
      return result;
    }
  }

  addLog('strategy-4-none', 'No Instagram account found via /instagram_accounts');
  return null;
}

export async function createMediaContainer(
  igUserId: string,
  imageUrl: string,
  caption: string,
  accessToken: string,
): Promise<string> {
  const endpoint = `${FB_API}/${igUserId}/media`;
  const tokenType = accessToken.startsWith('EAA') ? 'FB' : accessToken.startsWith('IGQVJ') ? 'IG' : 'UNK';
  const idType = igUserId.startsWith('178414') ? 'IG-BIZ' : igUserId.startsWith('266') ? 'IG-USER' : 'UNK';
  console.error(`[IG] createMedia id=${igUserId} type=${idType} tok=${tokenType} ep=${endpoint}`);
  if (!igUserId.startsWith('178414')) {
    console.error(`[IG] WRONG ID TYPE: stored id ${igUserId} is ${idType}, needs IG-BIZ (178414...)`);
  }

  const params = new URLSearchParams({ image_url: imageUrl, caption, access_token: accessToken });
  const res = await fetch(endpoint, { method: 'POST', body: params });
  const body = await res.json() as { id?: string; error?: IgError };

  console.error(`[IG] createMedia status=${res.status} id=${body.id} err=${body.error?.message?.slice(0, 80)}`);

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
  console.error(`[IG] getStatus id=${containerId}`);

  const res = await fetch(url);
  const body = await res.json() as { status?: string; status_code?: string; error?: IgError };

  console.error(`[IG] getStatus status=${res.status} state=${body.status} err=${(body.error?.message || '').slice(0, 60)}`);

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
  const endpoint = `${FB_API}/${igUserId}/media_publish`;
  console.error(`[IG] publishContainer ig=${igUserId} cid=${containerId}`);

  const params = new URLSearchParams({ creation_id: containerId, access_token: accessToken });
  const res = await fetch(endpoint, { method: 'POST', body: params });
  const body = await res.json() as { id?: string; error?: IgError };

  console.error(`[IG] publishContainer status=${res.status} id=${body.id} err=${(body.error?.message || '').slice(0, 60)}`);

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
  const idType = igUserId.startsWith('178414') ? 'IG-BIZ' : igUserId.startsWith('266') ? 'IG-USER' : 'UNK';
  const tokenType = accessToken.startsWith('EAA') ? 'FB' : accessToken.startsWith('IGQVJ') ? 'IG' : accessToken.slice(0, 10);
  console.error(`[IG] publishMedia id=${igUserId} type=${idType} tok=${tokenType} img=${imageUrl.slice(0, 60)}`);
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
