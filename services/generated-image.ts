import { supabase } from '@/lib/supabase';
import type { GeneratedImage, GeneratedImageInput } from '@/types/generated-image';

export async function createGeneratedImage(input: GeneratedImageInput): Promise<GeneratedImage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('generated_images')
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGeneratedImage(id: string, input: Partial<GeneratedImageInput>): Promise<GeneratedImage> {
  const { data, error } = await supabase
    .from('generated_images')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
