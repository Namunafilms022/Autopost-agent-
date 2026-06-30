'use client';

import { LogOut, Zap, SlidersHorizontal, Users, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMode } from '@/hooks/use-mode';
import { useActiveTeam } from '@/hooks/use-team';
import { useUser } from '@/hooks/use-user';
import { supabase } from '@/lib/supabase';
import { getUserTeams } from '@/services/team';
import type { TeamWithMemberCount } from '@/types/team';

export function Navbar() {
  const router = useRouter();
  const { user } = useUser();
  const { mode, toggleMode } = useMode();
  const { activeTeamId, setActiveTeamId, activeRole } = useActiveTeam();
  const [teams, setTeams] = useState<TeamWithMemberCount[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    getUserTeams()
      .then(setTeams)
      .catch(() => {});
  }, []);

  const activeTeam = teams.find((t) => t.id === activeTeamId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out');
    router.push('/login');
  };

  const initials = user?.email?.charAt(0).toUpperCase() ?? 'U';

  return (
    <header className="flex h-14 items-center justify-end gap-2 border-b bg-background px-4">
      {/* Team Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger className="mr-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{activeTeam?.name ?? 'Personal'}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setActiveTeamId(null)}>
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">
                {user?.email?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <span>Personal</span>
            </div>
            {!activeTeamId && <span className="ml-auto text-xs text-primary">Active</span>}
          </DropdownMenuItem>
          {teams.map((team) => (
            <DropdownMenuItem key={team.id} onClick={() => setActiveTeamId(team.id)}>
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <span>{team.name}</span>
              </div>
              {activeTeamId === team.id && <span className="ml-auto text-xs text-primary">Active</span>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/dashboard/teams')}>
            <Users className="mr-2 h-4 w-4" />
            Manage Teams
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={toggleMode}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          mode === 'quick'
            ? 'border-primary bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted'
        }`}
      >
        {mode === 'quick' ? <Zap className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
        {mode === 'quick' ? 'Quick' : 'Pro'}
      </button>
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none hover:opacity-80">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{user?.email}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{user?.email}</span>
              <span className="text-xs text-muted-foreground">{user?.id?.slice(0, 8)}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleMode}>
            {mode === 'quick' ? (
              <SlidersHorizontal className="mr-2 h-4 w-4" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Switch to {mode === 'quick' ? 'Pro' : 'Quick'} Mode
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} variant="destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
