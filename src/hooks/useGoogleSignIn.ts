import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useGoogleSignIn = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call edge function to get the OAuth URL
      const { data, error: functionError } = await supabase.functions.invoke(
        'google-oauth',
        {
          body: { 
            action: 'signin-authorize',
            redirectUri: `${window.location.origin}/auth-callback`
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data?.url) {
        throw new Error('Failed to generate OAuth URL');
      }

      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate Google sign-in';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Google sign-in error:', err);
    }
  };

  return { 
    handleGoogleSignIn, 
    isLoading, 
    error 
  };
};
