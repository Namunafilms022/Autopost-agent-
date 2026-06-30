CREATE TABLE IF NOT EXISTS public.competitor_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'Instagram',
  posting_frequency JSONB NOT NULL DEFAULT '{}',
  caption_style JSONB NOT NULL DEFAULT '{}',
  best_hashtags JSONB NOT NULL DEFAULT '[]',
  content_ideas JSONB NOT NULL DEFAULT '[]',
  analysis TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses"
  ON public.competitor_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create analyses"
  ON public.competitor_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete analyses"
  ON public.competitor_analyses FOR DELETE
  USING (auth.uid() = user_id);
