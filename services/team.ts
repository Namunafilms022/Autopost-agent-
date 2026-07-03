import { supabase } from '@/lib/supabase';
import type { Team, TeamMember, TeamInvitation, TeamWithMemberCount, TeamRole } from '@/types/team';

// ---- Teams ----

export async function getUserTeams(): Promise<TeamWithMemberCount[]> {
  const { data: memberships, error: mErr } = await supabase
    .from('team_members')
    .select('team_id, role, teams!inner(*)');

  if (mErr) {
    console.error('getUserTeams error (teams table may not exist):', mErr);
    return [];
  }

  const teams = await Promise.all(
    (memberships ?? []).map(async (m: Record<string, unknown>) => {
      const team = (m as { teams: Team; role: TeamRole }).teams;
      const role = (m as { role: TeamRole }).role;
      const { count } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id);
      return { ...team, member_count: count ?? 0, role };
    }),
  );

  return teams;
}

export async function getTeam(teamId: string): Promise<TeamWithMemberCount | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (error || !data) return null;

  const role = await getMemberRole(teamId);
  const { count } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId);

  return { ...data, member_count: count ?? 0, role: role ?? 'viewer' };
}

export async function createTeam(name: string): Promise<Team> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data: team, error: tErr } = await supabase
    .from('teams')
    .insert({ name, created_by: user.user.id })
    .select()
    .single();

  if (tErr || !team) throw tErr ?? new Error('Failed to create team');

  const { error: mErr } = await supabase
    .from('team_members')
    .insert({ team_id: team.id, user_id: user.user.id, role: 'owner' });

  if (mErr) throw mErr;

  return team;
}

export async function updateTeam(teamId: string, name: string): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .update({ name })
    .eq('id', teamId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', teamId);
  if (error) throw error;
}

// ---- Members ----

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*, users:user_id(email)')
    .eq('team_id', teamId);

  if (error) throw error;
  return (data ?? []).map((m: Record<string, unknown>) => {
    const member = m as { id: string; team_id: string; user_id: string; role: TeamRole; created_at: string; users: { email: string } | null };
    return {
      id: member.id,
      team_id: member.team_id,
      user_id: member.user_id,
      role: member.role,
      created_at: member.created_at,
      user_email: member.users?.email,
    };
  });
}

export async function getMemberRole(teamId: string): Promise<TeamRole | null> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.user.id)
    .maybeSingle();

  return (data as { role: TeamRole } | null)?.role ?? null;
}

export async function updateMemberRole(teamId: string, userId: string, role: TeamRole): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function removeMember(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
}

// ---- Invitations ----

export async function getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
  const { data, error } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getUserInvitations(): Promise<TeamInvitation[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user?.email) return [];

  const { data, error } = await supabase
    .from('team_invitations')
    .select('*, teams(name)')
    .eq('email', user.user.email)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((inv: Record<string, unknown>) => {
    const i = inv as unknown as TeamInvitation & { teams: { name: string } | null };
    return { ...i, team_name: i.teams?.name };
  });
}

export async function inviteMember(teamId: string, email: string, role: TeamRole): Promise<TeamInvitation> {
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('team_invitations')
    .insert({ team_id: teamId, email, role, invited_by: user.user?.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}
