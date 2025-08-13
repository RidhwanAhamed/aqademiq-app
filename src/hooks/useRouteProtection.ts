import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { useNavigate, useLocation } from 'react-router-dom';

interface UseRouteProtectionOptions {
  skipProtection?: boolean;
}

export function useRouteProtection(options: UseRouteProtectionOptions = {}) {
  const { user, loading: authLoading } = useAuth();
  const { loading: onboardingLoading, needsOnboarding, isAuthenticated } = useOnboardingFlow();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationIntentRef = useRef<string | null>(null);
  
  const loading = authLoading || onboardingLoading;

  // Allow explicit navigation to auth routes
  const allowNavigation = (path: string) => {
    navigationIntentRef.current = path;
    setTimeout(() => {
      navigationIntentRef.current = null;
    }, 100);
  };

  useEffect(() => {
    if (loading || options.skipProtection) return;

    const currentPath = location.pathname;
    
    // If user explicitly navigated to a route, don't interfere
    if (navigationIntentRef.current === currentPath) return;
    
    // Public routes that don't require authentication
    const publicRoutes = ['/welcome', '/auth', '/onboarding'];
    const isPublicRoute = publicRoutes.includes(currentPath);

    if (!isAuthenticated) {
      // User not authenticated, redirect to welcome unless already on a public route
      if (!isPublicRoute) {
        navigate('/welcome');
      }
    } else if (needsOnboarding) {
      // User authenticated but needs onboarding
      if (currentPath !== '/onboarding') {
        navigate('/onboarding');
      }
    } else {
      // User authenticated and onboarded, redirect away from public routes to dashboard
      if (isPublicRoute) {
        navigate('/');
      }
    }
  }, [loading, isAuthenticated, needsOnboarding, location.pathname, navigate, options.skipProtection]);

  return {
    loading,
    isAuthenticated,
    needsOnboarding,
    allowNavigation
  };
}