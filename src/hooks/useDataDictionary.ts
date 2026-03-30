import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const ADMIN_EMAIL = 'mohammed.aswath07@gmail.com';

export function useIsAdmin() {
  const { user } = useAuth();
  return user?.email === ADMIN_EMAIL;
}

export function useDataDictionaryAuth() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  return useQuery({
    queryKey: ['data-dictionary-auth'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('data-dictionary');
      if (error) throw error;
      return data as { authorized: boolean; generated_at: string };
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
