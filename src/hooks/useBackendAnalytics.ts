import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AnalyticsResponse, AnalyticsRequest } from '@/types/analytics';

interface UseBackendAnalyticsOptions {
  timeRange: 'week' | 'month' | '3months' | 'all';
  courseId?: string;
  enabled?: boolean;
}

export function useBackendAnalytics(options: UseBackendAnalyticsOptions) {
  const { timeRange, courseId, enabled = true } = options;

  return useQuery<AnalyticsResponse, Error>({
    queryKey: ['backend-analytics', timeRange, courseId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const requestBody: AnalyticsRequest = {
        time_range: timeRange,
        ...(courseId && { course_id: courseId }),
      };

      const { data, error } = await supabase.functions.invoke('compute-analytics', {
        body: requestBody,
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch analytics');
      }

      return data as AnalyticsResponse;
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

export type { AnalyticsResponse, UseBackendAnalyticsOptions };
