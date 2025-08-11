import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useOnboardingFlow() {
  const { user, loading: authLoading } = useAuth();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [hasSemester, setHasSemester] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const checkOnboardingStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user has completed profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        const profileComplete = profile?.full_name && profile.full_name.trim() !== '';
        setHasProfile(profileComplete);

        // Check if user has an active semester
        const { data: semester } = await supabase
          .from('semesters')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        const semesterComplete = !!semester;
        setHasSemester(semesterComplete);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // On error, assume onboarding is needed for new users
        setHasProfile(false);
        setHasSemester(false);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, authLoading]);

  return {
    loading: authLoading || loading,
    hasProfile,
    hasSemester,
    needsOnboarding: user ? (hasProfile === false || hasSemester === false) : false,
    isAuthenticated: !!user
  };
}