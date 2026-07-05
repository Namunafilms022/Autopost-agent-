const TIKTOK_API = 'https://open.tiktokapis.com/v2';

interface TikTokError {
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
}

function parseError(raw: unknown): string {
  if (raw instanceof Error) return raw.message;
  try {
    const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const b = body as TikTokError;
    if (b.error?.message) {
      return `${b.error.message}${b.error.code ? ` (${b.error.code})` : ''}`;
    }
    return JSON.stringify(body);
  } catch {
    return String(raw);
  }
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
    throw new Error(`TikTok requires video content (got image: ${contentType}). Convert your post to video format first.`);
  }

  const videoRes = await fetch(assetUrl);
  if (!videoRes.ok) throw new Error(`Failed to download asset: ${videoRes.status}`);
  const videoBuffer = await videoRes.arrayBuffer();

  const formData = new FormData();
  formData.append('video', new Blob([videoBuffer], { type: 'video/mp4' }));

  const uploadRes = await fetch(`${TIKTOK_API}/video/upload/?access_token=${accessToken}`, {
    method: 'POST',
    body: formData,
  });

  const uploadBody = await uploadRes.json() as {
    data?: { publish_id?: string };
    error?: { code?: string; message?: string };
  };

  if (!uploadRes.ok || !uploadBody.data?.publish_id) {
    throw new Error(`TikTok video upload failed: ${parseError(uploadBody)}`);
  }

  const publishId = uploadBody.data.publish_id;

  const publishRes = await fetch(`${TIKTOK_API}/video/publish/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      post_info: {
        title: caption.slice(0, 2200),
        privacy_level: 0,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      publish_id: publishId,
    }),
  });

  const publishBody = await publishRes.json() as {
    data?: { publish_id?: string };
    error?: { code?: string; message?: string };
  };

  if (!publishRes.ok) {
    throw new Error(`TikTok publish failed: ${parseError(publishBody)}`);
  }

  return { publishId: publishBody.data?.publish_id ?? publishId };
}
