'use client';

import {
  Plus, Users, Mail, Trash2, Shield, LogOut,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  getUserTeams, getTeam, getTeamMembers, getTeamInvitations, getUserInvitations,
  createTeam, updateTeam, deleteTeam,
  inviteMember, updateMemberRole, removeMember,
} from '@/services/team';
import type { TeamWithMemberCount, TeamMember, TeamInvitation, TeamRole } from '@/types/team';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/types/team';
import { useActiveTeam } from '@/hooks/use-team';

export default function TeamsPage() {
  const { activeTeamId, setActiveTeamId, activeRole } = useActiveTeam();

  const [teams, setTeams] = useState<TeamWithMemberCount[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  // Create team
  const [createOpen, setCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  // Selected team detail
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMemberCount | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('editor');
  const [inviting, setInviting] = useState(false);

  // Delete confirmation
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);

  // Pending invitations badge
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userTeams, userInvs] = await Promise.all([
        getUserTeams(),
        getUserInvitations().catch(() => []),
      ]);
      setTeams(userTeams);
      setPendingCount(userInvs.length);
      if (activeTeamId && userTeams.find((t) => t.id === activeTeamId)) {
        selectTeam(activeTeamId);
      }
    } catch {
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const selectTeam = async (teamId: string) => {
    setDetailLoading(true);
    try {
      const [team, mems, invs] = await Promise.all([
        getTeam(teamId),
        getTeamMembers(teamId),
        getTeamInvitations(teamId),
      ]);
      if (team) setSelectedTeam(team);
      setMembers(mems);
      setInvitations(invs);
    } catch {
      toast.error('Failed to load team details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    setCreating(true);
    try {
      const team = await createTeam(teamName.trim());
      setTeams((prev) => {
        const memberCount = 1;
        return [{ ...team, member_count: memberCount, role: 'owner' as TeamRole }, ...prev];
      });
      setCreateOpen(false);
      setTeamName('');
      toast.success('Team created');
      setActiveTeamId(team.id);
      selectTeam(team.id);
    } catch {
      toast.error('Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedTeam) return;
    setInviting(true);
    try {
      const inv = await inviteMember(selectedTeam.id, inviteEmail.trim(), inviteRole);
      setInvitations((prev) => [...prev, { ...inv, team_name: selectedTeam.name }]);
      setInviteEmail('');
      toast.success('Invitation sent');
    } catch {
      toast.error('Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, role: TeamRole) => {
    if (!selectedTeam) return;
    try {
      await updateMemberRole(selectedTeam.id, userId, role);
      setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role } : m)));
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return;
    try {
      await removeMember(selectedTeam.id, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleDeleteTeam = async () => {
    if (!deleteTeamId) return;
    try {
      await deleteTeam(deleteTeamId);
      setTeams((prev) => prev.filter((t) => t.id !== deleteTeamId));
      if (activeTeamId === deleteTeamId) setActiveTeamId(null);
      setSelectedTeam(null);
      toast.success('Team deleted');
    } catch {
      toast.error('Failed to delete team');
    } finally {
      setDeleteTeamId(null);
    }
  };

  const canManage = (role?: TeamRole | null) => role && (role === 'owner' || role === 'admin');
  const isOwner = (role?: TeamRole | null) => role === 'owner';

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="h-6 w-6" />
            Team Workspace
          </h1>
          <p className="text-muted-foreground">Manage teams, members, and permissions.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Team
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Teams List */}
        <div className="space-y-3 lg:col-span-1">
          <h2 className="text-sm font-semibold text-muted-foreground">YOUR TEAMS</h2>
          {teams.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No teams yet. Create one to collaborate.
              </CardContent>
            </Card>
          )}
          {teams.map((team) => (
            <Card
              key={team.id}
              className={`cursor-pointer transition-colors hover:bg-accent ${
                selectedTeam?.id === team.id ? 'border-primary ring-1 ring-primary' : ''
              }`}
              onClick={() => { setActiveTeamId(team.id); selectTeam(team.id); }}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{team.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {team.member_count} member{team.member_count !== 1 ? 's' : ''} · {ROLE_LABELS[team.role]}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">{ROLE_LABELS[team.role]}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Team Detail */}
        <div className="lg:col-span-2">
          {!selectedTeam ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select a team to manage members and settings.
              </CardContent>
            </Card>
          ) : detailLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-6">
              {/* Team header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedTeam.name}</CardTitle>
                      <CardDescription>
                        {selectedTeam.member_count} member{selectedTeam.member_count !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    {canManage(activeRole) && (
                      <div className="flex gap-2">
                        {isOwner(activeRole) && (
                          <Button variant="destructive" size="sm" onClick={() => setDeleteTeamId(selectedTeam.id)}>
                            <Trash2 className="mr-1 h-4 w-4" />
                            Delete Team
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>

              {/* Members */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                            {m.user_email?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{m.user_email ?? 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">Joined {new Date(m.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canManage(activeRole) && m.role !== 'owner' ? (
                            <Select
                              value={m.role}
                              onValueChange={(v) => v && handleRoleChange(m.user_id, v as TeamRole)}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">{ROLE_LABELS[m.role]}</Badge>
                          )}
                          {canManage(activeRole) && m.role !== 'owner' && (
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(m.user_id)}>
                              <LogOut className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Invite */}
              {canManage(activeRole) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Mail className="h-4 w-4" />
                      Invite Member
                    </CardTitle>
                    <CardDescription>Send an invitation by email.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="colleague@example.com"
                          type="email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={inviteRole} onValueChange={(v) => v && setInviteRole(v as TeamRole)}>
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleInvite} disabled={inviting}>
                        {inviting ? 'Sending...' : 'Invite'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Mail className="h-4 w-4" />
                      Pending Invitations
                    </CardTitle>
                    <CardDescription>
                      {invitations.filter((i) => i.status === 'pending').length} pending
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {invitations.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="text-sm">{inv.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {ROLE_LABELS[inv.role]} · {inv.status}
                            </p>
                          </div>
                          <Badge variant="outline">{inv.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Team Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>Give your team a name to get started.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Team Name</Label>
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Marketing Team"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTeam} disabled={creating}>
              {creating ? 'Creating...' : 'Create Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Dialog */}
      <Dialog open={!!deleteTeamId} onOpenChange={(o) => !o && setDeleteTeamId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>This cannot be undone. All data will be removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTeamId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTeam}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
