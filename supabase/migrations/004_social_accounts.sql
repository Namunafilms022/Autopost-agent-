CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('Instagram', 'Facebook', 'LinkedIn', 'X', 'Threads')),
  account_name TEXT NOT NULL,
  account_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'expired', 'disconnected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own social accounts"
  ON public.social_accounts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own social accounts"
  ON public.social_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social accounts"
  ON public.social_accounts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own social accounts"
  ON public.social_accounts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER social_accounts_updated_at
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
