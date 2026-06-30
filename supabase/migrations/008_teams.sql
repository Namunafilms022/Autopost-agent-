CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS: teams
CREATE POLICY "Team members can view team"
  ON public.teams FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.team_members WHERE team_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update team"
  ON public.teams FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Owners can delete team"
  ON public.teams FOR DELETE
  USING (created_by = auth.uid());

-- RLS: team_members
CREATE POLICY "Team members can view members"
  ON public.team_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_id AND tm.user_id = auth.uid())
  );

CREATE POLICY "Owners and admins can invite members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_members.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR team_members.user_id = auth.uid()
  );

CREATE POLICY "Owners and admins can update members"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_members.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Owners and admins can remove members"
  ON public.team_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_members.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- RLS: team_invitations
CREATE POLICY "Team members can view invitations"
  ON public.team_invitations FOR SELECT
  USING (
    email = auth.jwt() ->> 'email'
    OR EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_invitations.team_id AND user_id = auth.uid())
  );

CREATE POLICY "Owners and admins can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_invitations.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Invited user can accept or decline"
  ON public.team_invitations FOR UPDATE
  USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Owners and admins can delete invitations"
  ON public.team_invitations FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_invitations.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Triggers
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add team_id to brands
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_brands_team_id ON public.brands(team_id);

-- Drop old brand RLS policies and recreate with team support
DROP POLICY IF EXISTS "Users can view own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can create own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can update own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can delete own brands" ON public.brands;

CREATE POLICY "Users can view brands"
  ON public.brands FOR SELECT
  USING (
    user_id = auth.uid()
    OR (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members WHERE team_id = brands.team_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create brands"
  ON public.brands FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members WHERE team_id = brands.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    ))
  );

CREATE POLICY "Users can update brands"
  ON public.brands FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members WHERE team_id = brands.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    ))
  );

CREATE POLICY "Users can delete brands"
  ON public.brands FOR DELETE
  USING (
    user_id = auth.uid()
    OR (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members WHERE team_id = brands.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    ))
  );
