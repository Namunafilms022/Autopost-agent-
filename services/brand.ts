import { supabase } from '@/lib/supabase';
import type { Brand } from '@/types/brand';

const BUCKET = 'brand-logos';

export async function getBrands(): Promise<Brand[]> {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getBrand(id: string): Promise<Brand | null> {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createBrand(
  brand: Omit<Brand, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
): Promise<Brand> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error('Auth error: ' + userError.message);
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('brands')
    .insert({ ...brand, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBrand(
  id: string,
  brand: Partial<Omit<Brand, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<Brand> {
  const { data, error } = await supabase
    .from('brands')
    .update(brand)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBrand(id: string): Promise<void> {
  const brand = await getBrand(id);
  if (brand?.logo_url) {
    await deleteLogo(brand.logo_url);
  }

  const { error } = await supabase.from('brands').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadLogo(file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}

export async function deleteLogo(url: string): Promise<void> {
  const path = url.split('/').pop();
  if (!path) return;

  await supabase.storage.from(BUCKET).remove([path]);
}
