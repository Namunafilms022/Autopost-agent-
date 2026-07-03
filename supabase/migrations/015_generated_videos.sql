CREATE TABLE IF NOT EXISTS public.generated_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  platform TEXT,
  topic TEXT NOT NULL,
  script TEXT,
  image_url TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  scene_prompts JSONB DEFAULT '[]'::jsonb,
  generation_time INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'openrouter',
  queue_item_id UUID REFERENCES public.queue_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated videos"
  ON public.generated_videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own generated videos"
  ON public.generated_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generated videos"
  ON public.generated_videos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated videos"
  ON public.generated_videos FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER generated_videos_updated_at
  BEFORE UPDATE ON public.generated_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
