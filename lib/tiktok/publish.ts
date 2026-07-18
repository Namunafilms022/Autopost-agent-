const TIKTOK_API = 'https://open.tiktokapis.com/v2';

function parseError(raw: unknown): string {
  if (raw instanceof Error) return raw.message;
  try {
    const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const b = body as { error?: { code?: string; message?: string } };
    if (b.error?.message) {
      return `${b.error.message}${b.error.code ? ` (${b.error.code})` : ''}`;
    }
    return JSON.stringify(body);
  } catch {
    return String(raw);
  }
}

async function tikTokFetch(url: string, options: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, options);
  const text = await res.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`TikTok returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`TikTok API error (${res.status}): ${parseError(body)}`);
  }
  return body;
}

async function checkContentType(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.headers.get('content-type');
  } catch {
    return null;
  }
}

export async function publishToTikTok(
  caption: string,
  assetUrl: string | null,
  accessToken: string,
): Promise<{ publishId: string }> {
  if (!assetUrl) {
    throw new Error('TikTok requires a video asset to publish');
  }

  const contentType = await checkContentType(assetUrl);
  if (contentType && contentType.startsWith('image/')) {
    throw new Error(`TikTok requires video content (got image: ${contentType})`);
  }

  // Step 1: Download the video from the asset URL
  const videoRes = await fetch(assetUrl);
  if (!videoRes.ok) throw new Error(`Failed to download asset: ${videoRes.status}`);
  const videoBuffer = await videoRes.arrayBuffer();
  const videoSize = videoBuffer.byteLength;

  // Step 2: Initialize video publish (FILE_UPLOAD, single chunk)
  const initBody = await tikTokFetch(`${TIKTOK_API}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: caption.slice(0, 2200),
        privacy_level: 'SELF_ONLY',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: videoSize,
        chunk_size: videoSize,
        total_chunk_count: 1,
      },
    }),
  });

  const uploadUrl = (initBody.data as Record<string, unknown>)?.upload_url as string;
  const publishId = (initBody.data as Record<string, unknown>)?.publish_id as string;

  if (!uploadUrl || !publishId) {
    throw new Error(`TikTok init failed: no upload_url or publish_id in response`);
  }

  // Step 3: Upload video to the upload_url (TikTok requires Content-Range header)
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: new Blob([videoBuffer], { type: 'video/mp4' }),
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
    },
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => '');
    throw new Error(`TikTok upload to ${uploadUrl} failed (${uploadRes.status}): ${text.slice(0, 200)}`);
  }

  // Step 4: Poll for status (up to 60s)
  const maxPolls = 12;
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusBody = await tikTokFetch(`${TIKTOK_API}/post/publish/status/fetch/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: publishId }),
    });

    const status = (statusBody.data as Record<string, unknown>)?.status as string;
    if (status === 'PUBLISH_COMPLETE') {
      return { publishId };
    }
    if (status === 'FAILED') {
      const reason = (statusBody.data as Record<string, unknown>)?.fail_reason as string || 'unknown';
      throw new Error(`TikTok publish failed: ${reason}`);
    }
  }

  return { publishId };
}
