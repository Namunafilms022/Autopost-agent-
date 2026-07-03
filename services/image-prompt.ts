import { supabase } from '@/lib/supabase';
import type { ImagePrompt, ImagePromptInput } from '@/types/image-prompt';

export async function createImagePrompt(input: ImagePromptInput): Promise<ImagePrompt> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('image_prompts')
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateImagePrompt(id: string, input: Partial<ImagePromptInput>): Promise<ImagePrompt> {
  const { data, error } = await supabase
    .from('image_prompts')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
