import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, EmployeeProfile, Kind, ManagerProfile, onUnauthorized, setAuthToken } from './api';
import { deleteItem, getItem, setItem } from './storage';

const SESSION_KEY = 'hr_session_v1';

type Session =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'employee'; profile: EmployeeProfile }
  | { status: 'manager'; profile: ManagerProfile };

interface AuthContextValue {
  session: Session;
  loginEmployee: (employeeNumber: string, idNumber: string) => Promise<void>;
  loginManager: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function persist(token: string, kind: Kind) {
  await setItem(SESSION_KEY, JSON.stringify({ token, kind }));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({ status: 'loading' });

  const logout = useCallback(async () => {
    setAuthToken(null);
    await deleteItem(SESSION_KEY);
    setSession({ status: 'signedOut' });
  }, []);

  // انتهاء الجلسة من الخادم (401) → خروج تلقائي
  useEffect(() => {
    onUnauthorized(() => {
      void logout();
    });
    return () => onUnauthorized(null);
  }, [logout]);

  // استعادة الجلسة المحفوظة والتحقق منها
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await getItem(SESSION_KEY);
      if (!raw) {
        if (!cancelled) setSession({ status: 'signedOut' });
        return;
      }
      try {
        const saved = JSON.parse(raw) as { token: string; kind: Kind };
        setAuthToken(saved.token);
        const me = await api.me();
        if (cancelled) return;
        setSession(
          me.kind === 'employee'
            ? { status: 'employee', profile: me.profile as EmployeeProfile }
            : { status: 'manager', profile: me.profile as ManagerProfile },
        );
      } catch (e: any) {
        if (cancelled) return;
        // خطأ شبكة: نترك الجلسة محفوظة لكن نعود لشاشة الدخول؛ انتهاء الجلسة: نحذفها
        if (e?.status === 401) {
          setAuthToken(null);
          await deleteItem(SESSION_KEY);
        }
        setSession({ status: 'signedOut' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loginEmployee = useCallback(async (employeeNumber: string, idNumber: string) => {
    const res = await api.loginEmployee(employeeNumber.trim(), idNumber.trim());
    setAuthToken(res.token);
    await persist(res.token, 'employee');
    setSession({ status: 'employee', profile: res.profile });
  }, []);

  const loginManager = useCallback(async (username: string, password: string) => {
    const res = await api.loginManager(username.trim(), password);
    setAuthToken(res.token);
    await persist(res.token, 'manager');
    setSession({ status: 'manager', profile: res.profile });
  }, []);

  const value = useMemo(() => ({ session, loginEmployee, loginManager, logout }), [session, loginEmployee, loginManager, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
