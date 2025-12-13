import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { validateAuthSession, cleanupAuthState } from '@/utils/authCleanup';
import { useOfflineAuth } from '@/hooks/useOfflineAuth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, options?: { data?: any }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { cacheSession, getCachedSession, clearCachedAuth } = useOfflineAuth();

  // Clear any auth errors
  const clearError = () => setError(null);

  // Cache session whenever it changes
  const handleSessionChange = useCallback((newSession: Session | null, newUser: User | null) => {
    setSession(newSession);
    setUser(newUser);
    
    // Cache for offline use when we have a valid session
    if (newSession && newUser) {
      cacheSession(newSession, newUser);
    }
  }, [cacheSession]);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        logger.info('Auth state changed', { event, userId: session?.user?.id });
        
        // Handle different auth events with enhanced error recovery
        if (event === 'SIGNED_OUT') {
          handleSessionChange(null, null);
          setError(null);
          setLoading(false);
        } else if (event === 'PASSWORD_RECOVERY') {
          // Handle password recovery - navigate to reset page and preserve session
          if (session) {
            handleSessionChange(session, session.user);
            setError(null);
            
            const currentPath = window.location.pathname;
            if (!currentPath.includes('/auth/reset-password')) {
              window.history.replaceState({}, '', '/auth/reset-password');
            }
          }
          setLoading(false);
        } else if (event === 'SIGNED_IN') {
          if (session) {
            handleSessionChange(session, session.user);
            setError(null);
            
            // Check if this is a password recovery flow
            const urlHash = window.location.hash;
            const urlSearch = window.location.search;
            const isRecovery = urlHash.includes('type=recovery') || 
                              urlHash.includes('recovery_token') || 
                              urlSearch.includes('type=recovery') || 
                              urlSearch.includes('recovery_token');
            
            if (isRecovery) {
              // Redirect to reset password page and preserve the session
              window.history.replaceState({}, '', '/auth/reset-password');
              setLoading(false);
              return;
            }
            
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
            handleSessionChange(session, session.user);
            setError(null);
          }
          setLoading(false);
        } else if (event === 'USER_UPDATED') {
          if (session) {
            handleSessionChange(session, session.user);
          }
          setLoading(false);
        } else {
          // For other events, validate session
          if (session) {
            // Validate session in background to catch token issues early
            // But DON'T cleanup if offline - trust local session
            setTimeout(async () => {
              const isValid = await validateAuthSession();
              if (!isValid && mounted && navigator.onLine) {
                logger.warn('Invalid session detected while online, cleaning up');
                await cleanupAuthState(false); // Not intentional logout
                handleSessionChange(null, null);
              }
            }, 0);
            
            handleSessionChange(session, session.user);
          } else {
            handleSessionChange(null, null);
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
            handleSessionChange(session, session.user);
          }
        } else {
          // If offline and validation failed, try to use cached session
          if (!navigator.onLine) {
            logger.info('Offline - attempting to restore from cached session');
            const cached = await getCachedSession();
            if (cached && mounted) {
              logger.info('Restored user from cached session', { userId: cached.userId });
              // Create a minimal user object from cache
              // The actual session will be restored when back online
              setUser({
                id: cached.userId,
                email: cached.email,
                user_metadata: cached.userMetadata,
                app_metadata: {},
                aud: 'authenticated',
                created_at: '',
              } as User);
              setLoading(false);
              return;
            }
          }
          
          // Only clean up if online and session is truly invalid
          if (navigator.onLine) {
            await cleanupAuthState(false);
          }
        }
      } catch (error) {
        logger.error('Auth initialization error:', error);
        
        // On error while offline, try cached session
        if (!navigator.onLine && mounted) {
          const cached = await getCachedSession();
          if (cached) {
            logger.info('Using cached session after init error', { userId: cached.userId });
            setUser({
              id: cached.userId,
              email: cached.email,
              user_metadata: cached.userMetadata,
              app_metadata: {},
              aud: 'authenticated',
              created_at: '',
            } as User);
            setLoading(false);
            return;
          }
        }
        
        if (mounted) {
          handleSessionChange(null, null);
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
        const errorCode = (result.error as any).code;
        const errorReasons = (result.error as any).weak_password?.reasons || [];
        
        // Handle weak password errors specifically (status 422, code: weak_password)
        if (result.error.status === 422 && errorCode === 'weak_password') {
          logger.warn('Weak password rejected during signup', { 
            reasons: errorReasons, 
            email 
          });
          
          if (errorReasons.includes('pwned')) {
            return { 
              error: { 
                message: 'This password has been found in a data breach. Please choose a different, more secure password that you haven\'t used elsewhere.',
                isRetryable: false
              } 
            };
          }
          
          return { 
            error: { 
              message: 'Password is too weak. Please choose a stronger password with a mix of uppercase, lowercase, numbers, and symbols.',
              isRetryable: false
            } 
          };
        }
        
        // Handle other 422 errors (database validation errors)
        if (result.error.status === 422) {
          logger.error('Database validation error during signup', { 
            error: result.error, 
            email 
          });
          return { 
            error: { 
              message: 'Account creation failed due to a validation error. Please try again.',
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

  const signInWithGoogle = async () => {
    try {
      clearError();
      const redirectUrl = `${window.location.origin}/`;
      
      logger.info('Starting Google sign-in');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) {
        logger.error('Google sign-in error:', error);
        setError(error.message);
        return { error };
      }
      
      return { error: null };
    } catch (error: any) {
      logger.error('Google sign-in exception:', error);
      setError(error.message || 'Failed to sign in with Google');
      return { error };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      clearError();
      
      // Enhanced sign out with cleanup
      if (navigator.onLine) {
        await supabase.auth.signOut({ scope: 'global' });
      }
      
      // Intentional logout - clear everything including offline cache
      await cleanupAuthState(true);
      await clearCachedAuth();
      
      handleSessionChange(null, null);
    } catch (error) {
      logger.error('Sign out failed', error);
      
      // Force clear local state even if API call fails
      handleSessionChange(null, null);
      
      // Force cleanup on error - intentional logout
      await cleanupAuthState(true);
      await clearCachedAuth();
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
    signInWithGoogle,
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