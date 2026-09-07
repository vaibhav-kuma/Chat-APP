import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, apiPost } from "../api/client";
import type { MeResponse, User } from "../api/types";

interface AuthContextValue {
  user: User | null;
  membership: MeResponse["membership"] | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ mfaRequired: boolean }>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<MeResponse["membership"] | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api<MeResponse>("/auth/me");
      setUser(me.user);
      setMembership(me.membership);
    } catch {
      setUser(null);
      setMembership(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiPost<{ user: User; mfaRequired: boolean }>("/auth/login", { email, password });
    setUser(res.user);
    await refresh();
    return { mfaRequired: res.mfaRequired };
  }, [refresh]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await apiPost<{ user: User }>("/auth/register", { email, password, name });
    setUser(res.user);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await apiPost("/auth/logout").catch(() => undefined);
    setUser(null);
    setMembership(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, membership, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
