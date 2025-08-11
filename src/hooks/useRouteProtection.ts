import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { useNavigate, useLocation } from 'react-router-dom';

export function useRouteProtection() {
  const { user, loading: authLoading } = useAuth();
  const { loading: onboardingLoading, needsOnboarding, isAuthenticated } = useOnboardingFlow();
  const navigate = useNavigate();
  const location = useLocation();
  
  const loading = authLoading || onboardingLoading;

  useEffect(() => {
    if (loading) return;

    const currentPath = location.pathname;
    
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
      // User authenticated and onboarded, redirect away from public routes
      if (isPublicRoute) {
        navigate('/');
      }
    }
  }, [loading, isAuthenticated, needsOnboarding, location.pathname, navigate]);

  return {
    loading,
    isAuthenticated,
    needsOnboarding
  };
}