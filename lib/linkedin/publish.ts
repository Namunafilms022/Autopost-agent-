const LINKEDIN_API = 'https://api.linkedin.com';

interface LinkedinError {
  message: string;
  status?: number;
  serviceErrorCode?: number;
}

function parseError(raw: unknown): string {
  if (raw instanceof Error) return raw.message;
  try {
    const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const e = (body as { serviceErrorCode?: number; message?: string });
    if (e.message) {
      let msg = e.message;
      if (e.serviceErrorCode) msg += ` (code: ${e.serviceErrorCode})`;
      return msg;
    }
    return JSON.stringify(body);
  } catch {
    return String(raw);
  }
}

async function downloadImage(imageUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status} ${res.statusText}`);
  return res.arrayBuffer();
}

async function initializeImageUpload(
  accessToken: string,
  accountId: string,
): Promise<{ uploadUrl: string; imageUrn: string }> {
  const res = await fetch(`${LINKEDIN_API}/rest/images?action=initializeUpload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'LinkedIn-Version': '202412',
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: `urn:li:person:${accountId}`,
      },
    }),
  });

  const body = await res.json() as {
    value?: { uploadUrl?: string; image?: string };
    message?: string;
    serviceErrorCode?: number;
  };

  if (!res.ok || !body.value?.uploadUrl || !body.value?.image) {
    throw new Error(`LinkedIn image init failed: ${parseError(body)}`);
  }

  return { uploadUrl: body.value.uploadUrl, imageUrn: body.value.image };
}

async function uploadImageBinary(uploadUrl: string, imageData: ArrayBuffer): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: imageData,
    headers: { 'Content-Type': 'application/octet-stream' },
  });

  if (!res.ok) {
    throw new Error(`LinkedIn image upload failed: ${res.status} ${res.statusText}`);
  }
}

async function createPost(
  accessToken: string,
  accountId: string,
  commentary: string,
  imageUrn?: string,
): Promise<string> {
  const body: Record<string, unknown> = {
    author: `urn:li:person:${accountId}`,
    lifecycleState: 'PUBLISHED',
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    commentary,
    isReshareDisabledByAuthor: false,
  };

  if (imageUrn) {
    body.content = {
      media: {
        id: imageUrn,
      },
    };
  }

  const res = await fetch(`${LINKEDIN_API}/rest/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'LinkedIn-Version': '202412',
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json() as { id?: string; message?: string; serviceErrorCode?: number };

  if (!res.ok || !data.id) {
    throw new Error(`LinkedIn post creation failed: ${parseError(data)}`);
  }

  return data.id;
}

export async function publishToLinkedin(
  caption: string,
  imageUrl: string | null,
  accessToken: string,
  accountId: string,
): Promise<{ postId: string }> {
  let imageUrn: string | undefined;

  if (imageUrl) {
    const { uploadUrl, imageUrn: urn } = await initializeImageUpload(accessToken, accountId);
    const imageData = await downloadImage(imageUrl);
    await uploadImageBinary(uploadUrl, imageData);
    imageUrn = urn;
  }

  const postId = await createPost(accessToken, accountId, caption, imageUrn);

  return { postId };
}
