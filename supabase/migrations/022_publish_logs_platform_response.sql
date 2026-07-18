-- Add platform_response column matching the code's PublishLogEntry interface
ALTER TABLE public.publish_logs
  ADD COLUMN IF NOT EXISTS platform_response JSONB;
