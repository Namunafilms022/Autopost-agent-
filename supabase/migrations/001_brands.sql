-- Brands table
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  description TEXT,
  primary_color TEXT DEFAULT '#000000',
  secondary_color TEXT DEFAULT '#ffffff',
  target_audience TEXT,
  brand_tone TEXT,
  language TEXT DEFAULT 'en',
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brands"
  ON public.brands FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own brands"
  ON public.brands FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brands"
  ON public.brands FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brands"
  ON public.brands FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
