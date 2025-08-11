import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingFlow } from "@/hooks/useOnboardingFlow";
import { Dashboard } from "@/components/Dashboard";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: onboardingLoading, needsOnboarding } = useOnboardingFlow();
  const navigate = useNavigate();
  
  const loading = authLoading || onboardingLoading;

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/welcome');
      } else if (needsOnboarding) {
        navigate('/onboarding');
      }
    }
  }, [user, loading, needsOnboarding, navigate]);

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

  if (!user) {
    return null;
  }

  return (
    <div className="pb-16 sm:pb-0">
      <Dashboard />
    </div>
  );
};

export default Index;
