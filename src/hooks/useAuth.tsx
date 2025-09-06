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

  // Clean up corrupted sessions with better error handling
  const cleanupCorruptedSessions = async () => {
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        // Only clear storage for specific auth errors, not network errors
        if (!sessionError.message.includes('Failed to fetch')) {
          logger.error('Session error, clearing storage:', sessionError);
          localStorage.removeItem('sb-thmyddcvpopzjbvmhbur-auth-token');
          setError('Session expired. Please sign in again.');
        }
        return;
      }
      
      // Only validate session if we have one and no network issues
      if (data?.session) {
        try {
          const { error: testError } = await supabase.auth.getUser();
          if (testError && !testError.message.includes('Failed to fetch')) {
            logger.error('Session validation failed, clearing storage:', testError);
            localStorage.removeItem('sb-thmyddcvpopzjbvmhbur-auth-token');
            await supabase.auth.signOut();
          }
        } catch (validationError) {
          // Don't clear session for network errors during validation
          logger.warn('Session validation skipped due to network error:', validationError);
        }
      }
    } catch (error) {
      logger.warn('Session cleanup skipped due to network error:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Clean up on mount
    cleanupCorruptedSessions();

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        logger.info('Auth state changed', { event, userId: session?.user?.id });
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setError(null);
          // Clear any cached data on sign out
          localStorage.removeItem('sb-thmyddcvpopzjbvmhbur-auth-token');
        } else if (event === 'SIGNED_IN') {
          setSession(session);
          setUser(session?.user ?? null);
          setError(null);
        } else if (event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
          logger.info('Auth token refreshed successfully');
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        
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
    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          logger.error('Failed to get session:', sessionError);
          setError('Failed to load session. Please refresh and try again.');
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        logger.error('Auth initialization error:', error);
        setError('Failed to initialize authentication.');
      } finally {
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
        if (result.error.message.includes('Failed to fetch')) {
          return { error: { message: 'Connection error. Please check your internet connection and try again.' } };
        }
      }
      
      return { error: result.error };
    } catch (error) {
      logger.error('Sign in failed', { error, email });
      // Handle network errors specifically
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        return { error: { message: 'Unable to connect to the authentication service. Please check your internet connection and try again.' } };
      }
      return { error: error as any };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      // Clear all local storage with correct storage key
      localStorage.removeItem('sb-thmyddcvpopzjbvmhbur-auth-token');
      setError(null);
    } catch (error) {
      logger.error('Sign out failed', error);
      // Force clear local state even if API call fails
      setSession(null);
      setUser(null);
      localStorage.removeItem('sb-thmyddcvpopzjbvmhbur-auth-token');
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