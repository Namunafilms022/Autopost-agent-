import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  let body: { name: string; mimeType: string; fileSize: number; accessToken: string; brand_id?: string | null; tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Verify the access token and get user ID
  const userClient = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: `Bearer ${body.accessToken}` } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const ext = body.mimeType === 'video/mp4' ? 'mp4' : body.mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('assets')
    .createSignedUploadUrl(path);

  if (signedUrlError || !signedUrlData) {
    return NextResponse.json({ error: `Failed to create upload URL: ${signedUrlError?.message || 'unknown'}` }, { status: 500 });
  }

  return NextResponse.json({
    uploadUrl: signedUrlData.signedUrl,
    path,
    token: signedUrlData.token,
    name: body.name,
    mimeType: body.mimeType,
    fileSize: body.fileSize,
    brand_id: body.brand_id || null,
    tags: body.tags || [],
    userId: user.id,
  });
}

export async function PUT(req: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  let body: { path: string; name: string; mimeType: string; fileSize: number; accessToken: string; brand_id?: string | null; tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userClient = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: `Bearer ${body.accessToken}` } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(body.path);
  const type = body.mimeType.startsWith('video') ? 'video' : 'image';

  const { data, error: dbError } = await supabase
    .from('assets')
    .insert({
      name: body.name,
      type,
      mime_type: body.mimeType,
      size_bytes: body.fileSize,
      url: publicUrl,
      brand_id: body.brand_id || null,
      tags: body.tags || [],
      user_id: user.id,
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: `DB insert failed: ${dbError.message}` }, { status: 500 });
  }

  return NextResponse.json({ asset: data });
}
