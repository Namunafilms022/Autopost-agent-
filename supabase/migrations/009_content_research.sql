CREATE TABLE IF NOT EXISTS public.content_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  industry TEXT,
  topics JSONB NOT NULL DEFAULT '[]',
  hashtags JSONB NOT NULL DEFAULT '[]',
  audio JSONB NOT NULL DEFAULT '[]',
  ideas JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own research"
  ON public.content_research FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create research"
  ON public.content_research FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete research"
  ON public.content_research FOR DELETE
  USING (auth.uid() = user_id);
