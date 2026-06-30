export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Team {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  created_at: string;
  user_email?: string;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: TeamRole;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  team_name?: string;
}

export interface TeamWithMemberCount extends Team {
  member_count: number;
  role: TeamRole;
}

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: 'Full access — manage billing, delete team',
  admin: 'Manage members and content',
  editor: 'Create and edit content',
  viewer: 'Read-only access',
};

export const ROLE_HIERARCHY: TeamRole[] = ['owner', 'admin', 'editor', 'viewer'];
