'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId?: string;
}

interface SessionContextType {
  user: UserSession | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType>({ user: null, isLoading: true });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  return (
    <SessionContext.Provider value={{ user, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
