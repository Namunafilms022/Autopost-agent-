'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';
import { getMemberRole } from '@/services/team';
import type { TeamRole } from '@/types/team';

interface ActiveTeamContextValue {
  activeTeamId: string | null;
  setActiveTeamId: (id: string | null) => void;
  activeRole: TeamRole | null;
  loading: boolean;
}

const ActiveTeamContext = createContext<ActiveTeamContextValue>({
  activeTeamId: null,
  setActiveTeamId: () => {},
  activeRole: null,
  loading: true,
});

const STORAGE_KEY = 'autopost-active-team';

export function ActiveTeamProvider({ children }: { children: React.ReactNode }) {
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<TeamRole | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActiveTeamIdState(stored);
      loadRole(stored);
    }
    setLoading(false);
  }, []);

  const loadRole = async (teamId: string | null) => {
    if (!teamId) {
      setActiveRole(null);
      return;
    }
    const role = await getMemberRole(teamId).catch(() => null);
    setActiveRole(role);
  };

  const setActiveTeamId = useCallback((id: string | null) => {
    setActiveTeamIdState(id);
    setActiveRole(null);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
      loadRole(id);
      toast.success('Switched workspace');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <ActiveTeamContext.Provider value={{ activeTeamId, setActiveTeamId, activeRole, loading }}>
      {children}
    </ActiveTeamContext.Provider>
  );
}

export function useActiveTeam() {
  return useContext(ActiveTeamContext);
}
