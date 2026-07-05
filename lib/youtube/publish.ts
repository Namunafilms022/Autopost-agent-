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
): Promise<{ videoId: string }> {
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

  const boundary = `yt_boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closing = `\r\n--${boundary}--\r\n`;

  const metadataPart = `${delimiter}Content-Type: application/json\r\n\r\n${metadata}`;
  const videoPart = `${delimiter}Content-Type: video/mp4\r\n\r\n`;

  const encoder = new TextEncoder();
  const metadataBytes = encoder.encode(metadataPart);
  const videoBytes = new Uint8Array(videoBuffer);
  const closingBytes = encoder.encode(closing);

  const totalLength = metadataBytes.length + videoBytes.length + closingBytes.length;
  const body = new Uint8Array(totalLength);
  body.set(metadataBytes, 0);
  body.set(videoBytes, metadataBytes.length);
  body.set(closingBytes, metadataBytes.length + videoBytes.length);

  const res = await fetch(
    `${YOUTUBE_UPLOAD}/videos?part=snippet,status&uploadType=multipart`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
        'Content-Length': String(totalLength),
      },
      body,
    },
  );

  const data = await res.json() as {
    id?: string;
    error?: { code?: number; message?: string; errors?: Array<{ message?: string; reason?: string }> };
  };

  if (!res.ok || !data.id) {
    throw new Error(`YouTube upload failed: ${parseError(data)}`);
  }

  return { videoId: data.id };
}
