-- Add user_id column to publish_logs for RLS
ALTER TABLE public.publish_logs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS and create policies if they don't exist
ALTER TABLE public.publish_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'publish_logs' AND policyname = 'Users can view own publish logs') THEN
    CREATE POLICY "Users can view own publish logs" ON public.publish_logs
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'publish_logs' AND policyname = 'Users can create own publish logs') THEN
    CREATE POLICY "Users can create own publish logs" ON public.publish_logs
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'publish_logs' AND policyname = 'Users can update own publish logs') THEN
    CREATE POLICY "Users can update own publish logs" ON public.publish_logs
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;
