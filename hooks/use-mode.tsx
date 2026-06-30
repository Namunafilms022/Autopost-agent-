'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { getSettings, upsertSettings } from '@/services/settings';
import type { UserMode } from '@/types/settings';

interface ModeContextValue {
  mode: UserMode;
  toggleMode: () => Promise<void>;
}

const STORAGE_KEY = 'autopost-mode';
const ModeContext = createContext<ModeContextValue>({
  mode: 'pro',
  toggleMode: async () => {},
});

function getStoredMode(): UserMode {
  if (typeof window === 'undefined') return 'pro';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'quick' || stored === 'pro') return stored;
  return 'pro';
}

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<UserMode>('pro');
  const syncedRef = useRef(false);

  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;
    const stored = getStoredMode();
    if (stored !== 'pro') {
      setMode(stored);
    }
    getSettings().then((data) => {
      if (data?.mode && data.mode !== stored) {
        setMode(data.mode);
        localStorage.setItem(STORAGE_KEY, data.mode);
      }
    }).catch(() => {});
  }, []);

  const toggleMode = useCallback(async () => {
    const next: UserMode = mode === 'pro' ? 'quick' : 'pro';
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
    try {
      await upsertSettings({ mode: next });
    } catch {
      toast.error('Failed to save mode');
    }
  }, [mode]);

  return (
    <ModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
