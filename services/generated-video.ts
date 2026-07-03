import { supabase } from '@/lib/supabase';
import type { GeneratedVideo, GeneratedVideoInput } from '@/types/generated-video';

export async function createGeneratedVideo(input: GeneratedVideoInput): Promise<GeneratedVideo> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('generated_videos')
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGeneratedVideo(id: string, input: Partial<GeneratedVideoInput>): Promise<GeneratedVideo> {
  const { data, error } = await supabase
    .from('generated_videos')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getGeneratedVideos(): Promise<GeneratedVideo[]> {
  const { data, error } = await supabase
    .from('generated_videos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
