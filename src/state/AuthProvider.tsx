import React, { createContext, useContext } from 'react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  isAdmin: boolean;
  isLoggedIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading, error: authError, isAdmin, signInWithGoogle, signOut } = useFirebaseAuth();
  const isLoggedIn = user !== null;

  return (
    <AuthContext.Provider value={{ user, authLoading, authError, isAdmin, isLoggedIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
