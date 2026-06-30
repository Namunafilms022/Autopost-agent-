DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'queue_items_status_check'
  ) THEN
    ALTER TABLE public.queue_items DROP CONSTRAINT queue_items_status_check;
  END IF;
END $$;

ALTER TABLE public.queue_items
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE public.queue_items
  ADD CONSTRAINT queue_items_status_check
  CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'posted', 'failed'));
