import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingFlow } from "@/hooks/useOnboardingFlow";
import { Dashboard } from "@/components/Dashboard";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: onboardingLoading, needsOnboarding, isAuthenticated } = useOnboardingFlow();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [exchangingCode, setExchangingCode] = useState(false);

  const loading = authLoading || onboardingLoading || exchangingCode;

  // Handle Supabase email verification / magic link PKCE code at root
  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error') || searchParams.get('error_description');
    if (!code && !errorParam) return;

    if (errorParam) {
      navigate('/auth?error=' + encodeURIComponent(errorParam), { replace: true });
      return;
    }

    setExchangingCode(true);
    supabase.auth.exchangeCodeForSession(window.location.href)
      .then(({ error }) => {
        // Clean the URL regardless
        const cleanParams = new URLSearchParams(searchParams);
        cleanParams.delete('code');
        cleanParams.delete('state');
        setSearchParams(cleanParams, { replace: true });
        if (error) {
          navigate('/auth?error=' + encodeURIComponent(error.message), { replace: true });
        }
      })
      .finally(() => setExchangingCode(false));
  }, [searchParams, navigate, setSearchParams]);

  useEffect(() => {
    if (!loading && !searchParams.get('code')) {
      if (!isAuthenticated) {
        navigate('/welcome');
      } else if (needsOnboarding) {
        navigate('/onboarding');
      }
    }
  }, [loading, isAuthenticated, needsOnboarding, navigate, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading Aqademiq...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || needsOnboarding) {
    return null;
  }

  return (
    <div className="pb-16 sm:pb-0">
      <Dashboard />
    </div>
  );
};

export default Index;
