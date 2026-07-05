const TWITTER_API = 'https://api.twitter.com';

interface XError {
  detail?: string;
  title?: string;
  status?: number;
  type?: string;
  errors?: Array<{ message: string; code?: number }>;
}

function parseError(raw: unknown): string {
  if (raw instanceof Error) return raw.message;
  try {
    const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const b = body as XError;
    if (b.errors?.length) {
      return b.errors.map((e) => `${e.message}${e.code ? ` (code: ${e.code})` : ''}`).join('; ');
    }
    return b.detail || b.title || JSON.stringify(body);
  } catch {
    return String(raw);
  }
}

async function uploadMedia(
  imageUrl: string,
  accessToken: string,
): Promise<string> {
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error(`Failed to download image: ${imageRes.status}`);
  const imageBuffer = await imageRes.arrayBuffer();

  const formData = new FormData();
  formData.append('media', new Blob([imageBuffer]), 'media.jpg');

  const res = await fetch(`${TWITTER_API}/1.1/media/upload.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const body = await res.json() as {
    media_id_string?: string;
    media_id?: number;
    error?: { message?: string };
    errors?: Array<{ message: string }>;
  };

  if (!res.ok || (!body.media_id_string && !body.media_id)) {
    throw new Error(`X media upload failed: ${parseError(body)}`);
  }

  return body.media_id_string || String(body.media_id);
}

export async function publishToX(
  caption: string,
  imageUrl: string | null,
  accessToken: string,
): Promise<{ tweetId: string }> {
  let mediaIds: string[] = [];

  if (imageUrl) {
    try {
      const mediaId = await uploadMedia(imageUrl, accessToken);
      mediaIds = [mediaId];
    } catch (err) {
      throw err;
    }
  }

  const body: Record<string, unknown> = { text: caption };
  if (mediaIds.length > 0) {
    body.media = { media_ids: mediaIds };
  }

  const res = await fetch(`${TWITTER_API}/2/tweets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json() as {
    data?: { id: string; text?: string };
    errors?: Array<{ message: string; code?: number }>;
  };

  if (!res.ok || !data.data?.id) {
    throw new Error(`X tweet creation failed: ${parseError(data)}`);
  }

  return { tweetId: data.data.id };
}
