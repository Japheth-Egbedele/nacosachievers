'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, loadStoredToken, setAccessToken } from './api';

export type UserRole = 'member' | 'alumni' | 'executive' | 'staff' | 'super_admin' | 'guest';

export interface AuthUser {
  id: string;
  role: UserRole;
  email?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  matric_number?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiFetch<AuthUser>('/users/me');
      setUser(me);
    } catch {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  useEffect(() => {
    loadStoredToken();
    let active = true;
    void (async () => {
      try {
        await refreshUser();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ access_token: string; user: { id: string; role: UserRole } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      false,
    );
    setAccessToken(data.access_token);
    await refreshUser();
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' }, false);
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    setUser(null);
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = isSuperAdmin || user?.role === 'executive';

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshUser, isAdmin, isSuperAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
