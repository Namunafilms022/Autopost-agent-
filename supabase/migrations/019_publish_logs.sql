-- Add 'publishing' status to queue_items CHECK constraint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'queue_items_status_check') THEN
    ALTER TABLE public.queue_items DROP CONSTRAINT queue_items_status_check;
  END IF;
END $$;

ALTER TABLE public.queue_items
  ADD CONSTRAINT queue_items_status_check
  CHECK (status IN ('draft', 'pending_approval', 'approved', 'publishing', 'rejected', 'scheduled', 'posted', 'failed'));

-- Make brand_id optional (users can create posts without selecting a brand)
ALTER TABLE public.queue_items
  ALTER COLUMN brand_id DROP NOT NULL;

-- Add retry and publish tracking columns
ALTER TABLE public.queue_items
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS platform_response JSONB;

-- Publish logs table
CREATE TABLE IF NOT EXISTS public.publish_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_item_id UUID NOT NULL REFERENCES public.queue_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  platform_response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.publish_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own publish logs" ON public.publish_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own publish logs" ON public.publish_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own publish logs" ON public.publish_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Automation state table
CREATE TABLE IF NOT EXISTS public.automation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  posts_published_today INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.automation_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own automation state" ON public.automation_state
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own automation state" ON public.automation_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own automation state" ON public.automation_state
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER automation_state_updated_at BEFORE UPDATE ON public.automation_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
