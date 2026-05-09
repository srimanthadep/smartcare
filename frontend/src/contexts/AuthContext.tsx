import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { User, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string, role: UserRole) => Promise<void>;
  signup: (name: string, email: string, username: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
}

const USER_STORAGE_KEY = "smartdental_user";

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });

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
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
    if (response.token) {
      sessionStorage.setItem("smartcare_token", response.token);
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem("smartcare_token");
    // Ideally call a backend logout to clear the cookie
  }, []);

  useEffect(() => {
    api.me().then(({ user: updatedUser }) => {
      setUser(updatedUser);
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }).catch(() => {
      setUser(null);
      sessionStorage.removeItem(USER_STORAGE_KEY);
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      signup,
      logout,
    }),
    [login, signup, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
