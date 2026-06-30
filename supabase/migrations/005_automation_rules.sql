CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('schedule', 'approval')),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  action_type TEXT NOT NULL CHECK (action_type IN ('generate', 'post', 'recycle', 'publish')),
  action_config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own automation rules"
  ON public.automation_rules FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own automation rules"
  ON public.automation_rules FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own automation rules"
  ON public.automation_rules FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own automation rules"
  ON public.automation_rules FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
