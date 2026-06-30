CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT,
  image_prompt TEXT,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'posted', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.queue_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue items"
  ON public.queue_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own queue items"
  ON public.queue_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue items"
  ON public.queue_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own queue items"
  ON public.queue_items FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER queue_items_updated_at
  BEFORE UPDATE ON public.queue_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
