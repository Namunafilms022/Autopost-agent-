CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  writing_style TEXT,
  emoji_preference TEXT,
  caption_length TEXT,
  cta_preference TEXT,
  favorite_hashtags TEXT[] DEFAULT '{}',
  preferred_platforms TEXT[] DEFAULT '{}',
  additional_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profile"
  ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
