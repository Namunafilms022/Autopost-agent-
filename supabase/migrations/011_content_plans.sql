CREATE TABLE IF NOT EXISTS public.content_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days JSONB NOT NULL DEFAULT '[]',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plans"
  ON public.content_plans FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create plans"
  ON public.content_plans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update plans"
  ON public.content_plans FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete plans"
  ON public.content_plans FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER content_plans_updated_at
  BEFORE UPDATE ON public.content_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
