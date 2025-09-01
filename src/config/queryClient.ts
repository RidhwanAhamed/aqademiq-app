import { QueryClient } from '@tanstack/react-query';

// Optimized Query Client configuration for performance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes to reduce unnecessary requests
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      
      // Retry failed requests with exponential backoff
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors or client errors (4xx)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Disable automatic refetching on window focus for better performance
      refetchOnWindowFocus: false,
      
      // Only refetch on reconnect for critical data
      refetchOnReconnect: 'always',
      
      // Disable refetch on mount if data is still fresh
      refetchOnMount: true,
      
      // Enable background refetching for better UX
      refetchInterval: false, // Disable automatic background refetching
      refetchIntervalInBackground: false,
      
      // Network mode for better offline handling
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations only once for failed network requests
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) {
          return false; // Don't retry client errors
        }
        return failureCount < 1; // Only retry once for network errors
      },
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});

// Enhanced error logging for debugging
queryClient.setMutationDefaults(['supabase'], {
  mutationFn: async (variables: any) => {
    throw new Error('Default mutation function should be overridden');
  },
  onError: (error, variables, context) => {
    console.error('Query Client Mutation Error:', {
      error,
      variables,
      context,
      timestamp: new Date().toISOString(),
    });
  },
});

// Query defaults for different data types
queryClient.setQueryDefaults(['user-profile'], {
  staleTime: 10 * 60 * 1000, // User profile data is relatively static
});

queryClient.setQueryDefaults(['calendar-events'], {
  staleTime: 2 * 60 * 1000, // Calendar data changes more frequently
});

queryClient.setQueryDefaults(['real-time'], {
  staleTime: 0, // Real-time data should always be fresh
  gcTime: 1 * 60 * 1000, // But don't keep it in cache long
});