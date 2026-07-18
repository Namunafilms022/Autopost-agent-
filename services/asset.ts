import { supabase } from '@/lib/supabase';
import type { Asset } from '@/types/asset';

const BUCKET = 'assets';

export async function getAssets(): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteAsset(id: string, url: string): Promise<void> {
  const path = url.split('/').pop();
  if (path) {
    await supabase.storage.from(BUCKET).remove([path]);
  }
  const { error } = await supabase.from('assets').delete().eq('id', id);
  if (error) throw error;
}

export async function updateAsset(
  id: string,
  updates: Partial<Pick<Asset, 'name' | 'brand_id' | 'tags'>>,
): Promise<Asset> {
  const { data, error } = await supabase
    .from('assets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

function getAccessToken(): Promise<string | null> {
  return supabase.auth.getSession().then(({ data }) => data.session?.access_token ?? null);
}

export async function uploadAsset(
  file: File,
  metadata: { name: string; brand_id?: string | null; tags?: string[] },
): Promise<Asset> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  // Step 1: Get signed upload URL from server
  const initRes = await fetch('/api/asset/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: metadata.name,
      mimeType: file.type,
      fileSize: file.size,
      accessToken,
      brand_id: metadata.brand_id ?? null,
      tags: metadata.tags ?? [],
    }),
  });

  const initData = await initRes.json();
  if (!initRes.ok) throw new Error(initData.error || 'Failed to initiate upload');

  // Step 2: Upload file directly to Supabase Storage via signed URL (bypasses Vercel 4.5MB limit)
  const uploadRes = await fetch(initData.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  if (!uploadRes.ok) {
    throw new Error(`Failed to upload file to storage (${uploadRes.status})`);
  }

  // Step 3: Confirm and create DB record
  const confirmRes = await fetch('/api/asset/upload', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: initData.path,
      name: initData.name,
      mimeType: initData.mimeType,
      fileSize: initData.fileSize,
      accessToken,
      brand_id: initData.brand_id,
      tags: initData.tags,
    }),
  });

  const confirmData = await confirmRes.json();
  if (!confirmRes.ok) throw new Error(confirmData.error || 'Failed to confirm upload');
  return confirmData.asset;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
