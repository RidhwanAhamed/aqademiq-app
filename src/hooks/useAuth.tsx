import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, retryOperation } from '@/config/supabaseClient';
import { logger } from '@/utils/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, options?: { data?: any }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle successful sign in - redirect to dashboard
        if (event === 'SIGNED_IN' && session?.user) {
          const currentPath = window.location.pathname;
          // Only redirect if we're on an auth page
          if (currentPath.includes('/auth') || currentPath === '/welcome') {
            // Use navigate instead of window.location for better SPA behavior
            setTimeout(() => {
              window.location.href = '/';
            }, 100);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, options?: { data?: any }) => {
    try {
      const redirectUrl = `${window.location.origin}/auth/verify`;
      
      const result = await retryOperation(async () => {
        return await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: options?.data
          }
        });
      }, 2, 1000);
      
      logger.info('Sign up attempt', { email, hasError: !!result.error });
      return { error: result.error };
    } catch (error) {
      logger.error('Sign up failed', { error, email });
      return { error: error as any };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await retryOperation(async () => {
        return await supabase.auth.signInWithPassword({
          email,
          password,
        });
      }, 2, 1000);
      
      logger.info('Sign in attempt', { email, hasError: !!result.error });
      return { error: result.error };
    } catch (error) {
      logger.error('Sign in failed', { error, email });
      return { error: error as any };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}