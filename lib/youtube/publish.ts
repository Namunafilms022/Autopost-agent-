const YOUTUBE_API = 'https://www.googleapis.com';
const YOUTUBE_UPLOAD = 'https://www.googleapis.com/upload/youtube/v3';

interface YouTubeError {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ message?: string; reason?: string }>;
  };
}

function parseError(raw: unknown): string {
  if (raw instanceof Error) return raw.message;
  try {
    const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const b = body as YouTubeError;
    if (b.error?.errors?.length) {
      return b.error.errors.map((e) => `${e.message}${e.reason ? ` (${e.reason})` : ''}`).join('; ');
    }
    if (b.error?.message) {
      return `${b.error.message}${b.error.code ? ` (code: ${b.error.code})` : ''}`;
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

export async function publishToYouTube(
  caption: string,
  assetUrl: string | null,
  accessToken: string,
  channelId: string,
  title?: string | null,
): Promise<{ videoId: string; videoUrl: string }> {
  if (!assetUrl) {
    throw new Error('YouTube requires a video asset to upload');
  }

  const contentType = await checkContentType(assetUrl);
  if (contentType && contentType.startsWith('image/')) {
    throw new Error(`YouTube requires video content (got image: ${contentType}). Create a video post instead.`);
  }

  const videoRes = await fetch(assetUrl);
  if (!videoRes.ok) throw new Error(`Failed to download asset: ${videoRes.status}`);
  const videoBuffer = await videoRes.arrayBuffer();

  const snippet = {
    title: (title || caption).slice(0, 100) || 'Untitled',
    description: caption.slice(0, 5000),
    tags: [],
  };

  const status = {
    privacyStatus: 'public',
    selfDeclaredMadeForKids: false,
  };

  const metadata = JSON.stringify({ snippet, status });

  const resumableRes = await fetch(
    `${YOUTUBE_UPLOAD}/videos?part=snippet,status&uploadType=resumable`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Length': String(videoBuffer.byteLength),
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: metadata,
    },
  );

  if (!resumableRes.ok) {
    const errText = await resumableRes.text();
    throw new Error(`YouTube resumable init failed (${resumableRes.status}): ${errText.slice(0, 200)}`);
  }

  const uploadUrl = resumableRes.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('YouTube resumable init returned no Location header');
  }

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': String(videoBuffer.byteLength),
      'Content-Type': 'video/mp4',
    },
    body: videoBuffer,
  });

  const text = await uploadRes.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch {
    throw new Error(`YouTube upload failed (${uploadRes.status}): ${text.slice(0, 200)}`);
  }

  const d = data as { id?: string; error?: { code?: number; message?: string; errors?: Array<{ message?: string; reason?: string }> } };

  if (!uploadRes.ok || !d.id) {
    throw new Error(`YouTube upload failed: ${parseError(d)}`);
  }

  const videoId = d.id as string;
  return { videoId, videoUrl: `https://www.youtube.com/watch?v=${videoId}` };
}
