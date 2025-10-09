import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { validateAuthSession, cleanupAuthState } from '@/utils/authCleanup';

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
      async (event, session) => {
        if (!mounted) return;

        logger.info('Auth state changed', { event, userId: session?.user?.id });
        
        // Handle different auth events with enhanced error recovery
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setError(null);
          setLoading(false);
        } else if (event === 'PASSWORD_RECOVERY') {
          // Handle password recovery - navigate to reset page and preserve session
          if (session) {
            setSession(session);
            setUser(session.user);
            setError(null);
            
            const currentPath = window.location.pathname;
            if (!currentPath.includes('/auth/reset-password')) {
              window.history.replaceState({}, '', '/auth/reset-password');
            }
          }
          setLoading(false);
        } else if (event === 'SIGNED_IN') {
          if (session) {
            setSession(session);
            setUser(session.user);
            setError(null);
            
            // Handle successful sign in - redirect to dashboard
            // BUT don't redirect if we're on the password reset page
            const currentPath = window.location.pathname;
            if ((currentPath.includes('/auth') || currentPath === '/welcome') && 
                !currentPath.includes('/auth/reset-password')) {
              setTimeout(() => {
                window.location.href = '/';
              }, 100);
            }
          }
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          if (session) {
            setSession(session);
            setUser(session.user);
            setError(null);
          }
          setLoading(false);
        } else if (event === 'USER_UPDATED') {
          if (session) {
            setSession(session);
            setUser(session.user);
          }
          setLoading(false);
        } else {
          // For other events, validate session
          if (session) {
            // Validate session in background to catch token issues early
            setTimeout(async () => {
              const isValid = await validateAuthSession();
              if (!isValid && mounted) {
                logger.warn('Invalid session detected, cleaning up');
                await cleanupAuthState();
                setSession(null);
                setUser(null);
              }
            }, 0);
            
            setSession(session);
            setUser(session.user);
          } else {
            setSession(null);
            setUser(null);
          }
          setLoading(false);
        }
      }
    );

    // THEN check for existing session with enhanced validation
    const initializeAuth = async () => {
      try {
        // First validate if we have a good session
        const isValid = await validateAuthSession();
        
        if (isValid) {
          const { data: { session } } = await supabase.auth.getSession();
          if (mounted && session) {
            setSession(session);
            setUser(session.user);
          }
        } else {
          // Clean up invalid state
          await cleanupAuthState();
        }
      } catch (error) {
        logger.error('Auth initialization error:', error);
        if (mounted) {
          // On critical error, ensure clean state
          setSession(null);
          setUser(null);
        }
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
      clearError();
      const redirectUrl = `${window.location.origin}/auth/verify`;
      
      logger.info('Starting signup process', { email });
      
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: options?.data
        }
      });
      
      logger.info('Signup API response', { 
        email, 
        hasError: !!result.error, 
        errorMessage: result.error?.message,
        errorStatus: result.error?.status,
        hasUser: !!result.data?.user,
        needsConfirmation: !result.data?.user?.email_confirmed_at
      });
      
      if (result.error) {
        // Enhanced error handling for sign up with specific 422 handling
        if (result.error.status === 422) {
          logger.error('Database validation error during signup', { 
            error: result.error, 
            email 
          });
          return { 
            error: { 
              message: 'Account creation failed due to a database error. Please try again in a moment.',
              isRetryable: true,
              originalError: result.error
            } 
          };
        }
        
        if (result.error.message.includes('User already registered')) {
          return { error: { message: 'An account with this email already exists. Please sign in instead.' } };
        }
        if (result.error.message.includes('Invalid email')) {
          return { error: { message: 'Please enter a valid email address.' } };
        }
        if (result.error.message.includes('Password')) {
          return { error: { message: 'Password must be at least 6 characters long.' } };
        }
        if (result.error.message.includes('duplicate') || result.error.message.includes('constraint')) {
          return { 
            error: { 
              message: 'This email is already registered. Please try signing in instead.',
              isRetryable: false
            } 
          };
        }
        if (result.error.message.includes('network') || result.error.message.includes('fetch')) {
          return { 
            error: { 
              message: 'Network error during signup. Please check your connection and try again.',
              isRetryable: true
            } 
          };
        }
      }
      
      // Successful signup
      if (result.data?.user && !result.data.user.email_confirmed_at) {
        logger.info('Signup successful, verification email should be sent', { 
          email,
          userId: result.data.user.id 
        });
      }
      
      return { error: result.error };
    } catch (error) {
      logger.error('Sign up failed with exception', { error, email });
      
      // Handle network errors gracefully
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { 
          error: { 
            message: 'Connection error during signup. Please check your internet connection and try again.',
            isRetryable: true
          } 
        };
      }
      
      return { 
        error: { 
          message: 'An unexpected error occurred during signup. Please try again.',
          isRetryable: true,
          originalError: error
        } as any 
      };
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
        // Enhanced error handling with user-friendly messages
        if (result.error.message.includes('Invalid login credentials')) {
          return { error: { message: 'Invalid email or password. Please check your credentials and try again.' } };
        }
        if (result.error.message.includes('Email not confirmed')) {
          return { error: { message: 'Please check your email and click the confirmation link before signing in.' } };
        }
        if (result.error.message.includes('Too many requests')) {
          return { error: { message: 'Too many login attempts. Please wait a moment before trying again.' } };
        }
        if (result.error.message.includes('fetch')) {
          return { error: { message: 'Connection error. Please check your internet connection and try again.' } };
        }
      }
      
      return { error: result.error };
    } catch (error) {
      logger.error('Sign in failed', { error, email });
      
      // Handle network errors gracefully
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { error: { message: 'Connection error. Please check your internet connection and try again.' } };
      }
      
      return { error: error as any };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      clearError();
      
      // Enhanced sign out with cleanup
      await supabase.auth.signOut({ scope: 'global' });
      
      // Ensure complete cleanup
      await cleanupAuthState();
      
    } catch (error) {
      logger.error('Sign out failed', error);
      
      // Force clear local state even if API call fails
      setSession(null);
      setUser(null);
      
      // Force cleanup on error
      await cleanupAuthState();
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