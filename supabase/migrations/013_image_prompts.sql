CREATE TABLE IF NOT EXISTS public.image_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  platform TEXT,
  topic TEXT NOT NULL,
  caption TEXT,
  script TEXT,
  image_prompt TEXT,
  style TEXT,
  lighting TEXT,
  camera TEXT,
  composition TEXT,
  queue_item_id UUID REFERENCES public.queue_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.image_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own image prompts"
  ON public.image_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own image prompts"
  ON public.image_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own image prompts"
  ON public.image_prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own image prompts"
  ON public.image_prompts FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER image_prompts_updated_at
  BEFORE UPDATE ON public.image_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
