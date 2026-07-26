"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiGet } from "@/src/lib/api-client";

export interface SessionUser {
  id: string;
  role: "ADMIN" | "EMPLOYEE";
  employeeId?: string | null;
  name: string;
  email: string;
}

interface SessionContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  isLoading: true,
  refresh: async () => {},
});

/**
 * Memuat sesi dari /api/auth/me SEKALI per mount shell (bukan per navigasi)
 * dan membagikannya ke Header, Sidebar, dan AppShell.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet<SessionUser>("/api/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch sesi awal; setState terjadi asinkron setelah await
    refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ user, isLoading, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
