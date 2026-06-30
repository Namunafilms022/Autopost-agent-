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

export async function uploadAsset(
  file: File,
  metadata: { name: string; brand_id?: string | null; tags?: string[] },
): Promise<Asset> {
  const ext = file.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const type = file.type.startsWith('video') ? 'video' : 'image';

  const { data, error: dbError } = await supabase
    .from('assets')
    .insert({
      name: metadata.name,
      type,
      mime_type: file.type,
      size_bytes: file.size,
      url: publicUrl,
      brand_id: metadata.brand_id ?? null,
      tags: metadata.tags ?? [],
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw dbError;
  }

  return data;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
