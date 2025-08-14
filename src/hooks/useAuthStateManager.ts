import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';

export function useAuthStateManager() {
  const { user, loading: authLoading } = useAuth();
  const { loading: onboardingLoading, needsOnboarding, isAuthenticated } = useOnboardingFlow();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasNavigated, setHasNavigated] = useState(false);
  
  const loading = authLoading || onboardingLoading;

  useEffect(() => {
    // Prevent multiple navigations and only run when not loading
    if (loading || hasNavigated) return;

    const currentPath = location.pathname;
    
    // Public routes that should not trigger redirects
    const publicRoutes = ['/welcome', '/auth/signin', '/auth/callback', '/auth/reset-password'];
    const isPublicRoute = publicRoutes.includes(currentPath);
    
    // Auth-related routes where we should not interfere
    const authRoutes = ['/auth', '/onboarding'];
    const isAuthRoute = authRoutes.includes(currentPath);

    if (!isAuthenticated) {
      // User not authenticated
      if (currentPath.startsWith('/') && !isPublicRoute && !isAuthRoute) {
        navigate('/welcome');
        setHasNavigated(true);
      }
    } else if (needsOnboarding) {
      // User authenticated but needs onboarding
      if (currentPath !== '/onboarding' && !currentPath.startsWith('/auth')) {
        navigate('/onboarding');
        setHasNavigated(true);
      }
    } else {
      // User authenticated and onboarded
      if (isPublicRoute || isAuthRoute) {
        navigate('/');
        setHasNavigated(true);
      }
    }
  }, [loading, isAuthenticated, needsOnboarding, location.pathname, navigate, hasNavigated]);

  // Reset navigation flag when location changes
  useEffect(() => {
    setHasNavigated(false);
  }, [location.pathname]);

  return {
    loading,
    isAuthenticated,
    needsOnboarding,
    user
  };
}