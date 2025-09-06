import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, options?: { data?: any }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clear any auth errors
  const clearError = () => setError(null);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        logger.info('Auth state changed', { event, userId: session?.user?.id });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          setError(null);
        } else if (event === 'SIGNED_IN') {
          setError(null);
          // Handle successful sign in - redirect to dashboard
          const currentPath = window.location.pathname;
          if (currentPath.includes('/auth') || currentPath === '/welcome') {
            setTimeout(() => {
              window.location.href = '/';
            }, 100);
          }
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        logger.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, options?: { data?: any }) => {
    try {
      const redirectUrl = `${window.location.origin}/auth/verify`;
      
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: options?.data
        }
      });
      
      logger.info('Sign up attempt', { email, hasError: !!result.error });
      return { error: result.error };
    } catch (error) {
      logger.error('Sign up failed', { error, email });
      return { error: error as any };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      clearError();
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      logger.info('Sign in attempt', { email, hasError: !!result.error });
      
      if (result.error) {
        // Handle specific auth errors with user-friendly messages
        if (result.error.message.includes('Invalid login credentials')) {
          return { error: { message: 'Invalid email or password. Please check your credentials and try again.' } };
        }
        if (result.error.message.includes('Email not confirmed')) {
          return { error: { message: 'Please check your email and click the confirmation link before signing in.' } };
        }
      }
      
      return { error: result.error };
    } catch (error) {
      logger.error('Sign in failed', { error, email });
      return { error: error as any };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setError(null);
    } catch (error) {
      logger.error('Sign out failed', error);
      // Force clear local state even if API call fails
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    clearError,
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