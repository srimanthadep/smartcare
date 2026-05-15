import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { User, UserRole } from "@/types";
import { safeLocalStorageParse } from "@/lib/storage";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string, role: UserRole) => Promise<void>;
  signup: (name: string, email: string, username: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const USER_STORAGE_KEY = "smartdental_user";

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => 
    safeLocalStorageParse<User | null>(USER_STORAGE_KEY, null)
  );

  const login = useCallback(async (username: string, password: string, role: UserRole) => {
    const response = await api.login({ username, password, role });
    handleAuthSuccess(response);
  }, []);

  const signup = useCallback(async (name: string, email: string, username: string, password: string, role: UserRole) => {
    const response = await api.register({ name, email, username, password, role });
    handleAuthSuccess(response);
  }, []);

  const handleAuthSuccess = (response: { user: User; token: string }) => {
    setUser(response.user);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
    if (response.token) {
      localStorage.setItem("smartcare_token", response.token);
    }
    // Show install prompt again on explicit new login
    localStorage.removeItem("pwa-prompt-dismissed");
  };

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* best-effort cookie clear */ }
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem("smartcare_token");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { user: updatedUser } = await api.me();
      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    } catch {
      setUser(null);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      signup,
      logout,
      refreshUser,
    }),
    [login, signup, logout, refreshUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
