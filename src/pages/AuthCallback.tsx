import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Helper stub (same as in Auth.tsx)—replace with your own
async function checkOnboardingStatus(uid: string) {
  // Call your API or Supabase to check if onboarding is needed
  return false;
}

export default function AuthCallback() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth token/verification result
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          toast({
            title: "Welcome!",
            description: "Email verified. Logging you in...",
          });
          const needsOnboarding = await checkOnboardingStatus(session.user.id);
          setTimeout(() => {
            if (needsOnboarding) {
              navigate('/onboarding');
            } else {
              navigate('/dashboard');
            }
          }, 1500);
        }
      }
    );
    // Clean up listener
    return () => authListener?.subscription?.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-center text-lg">Processing authentication, please wait...</p>
    </div>
  );
}
