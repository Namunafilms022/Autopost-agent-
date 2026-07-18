-- Add platforms JSONB column for per-platform state tracking
ALTER TABLE public.queue_items
  ADD COLUMN IF NOT EXISTS platforms JSONB DEFAULT '{}'::jsonb;

-- Drop old CHECK constraint first so we can freely update statuses
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'queue_items_status_check') THEN
    ALTER TABLE public.queue_items DROP CONSTRAINT queue_items_status_check;
  END IF;
END $$;

-- Migrate existing 'posted' status to 'published'
UPDATE public.queue_items SET status = 'published' WHERE status = 'posted';

-- Add updated CHECK constraint with new states
ALTER TABLE public.queue_items
  ADD CONSTRAINT queue_items_status_check
  CHECK (status IN ('draft', 'pending_approval', 'approved', 'queued', 'publishing', 'published', 'failed', 'partially_published', 'rejected', 'scheduled'));

-- platform_post_id and retry_count already exist in publish_logs
