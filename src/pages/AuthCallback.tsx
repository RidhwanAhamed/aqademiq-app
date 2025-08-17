import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle } from 'lucide-react';

export default function AuthCallback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the auth hash from URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = searchParams.get('type');

        if (accessToken) {
          // Handle email verification
          if (type === 'signup' || (!type && user?.email_confirmed_at)) {
            toast({
              title: "Email verified!",
              description: "Continuing with your account setup...",
            });
            
            // Redirect to onboarding with verification flag
            setTimeout(() => {
              navigate('/onboarding?email_verified=true');
            }, 1500);
            return;
          }

          // Handle password recovery
          if (type === 'recovery') {
            toast({
              title: "Password reset",
              description: "You can now set a new password.",
            });
            
            setTimeout(() => {
              navigate('/auth?type=recovery');
            }, 1500);
            return;
          }
        }

        // Check if user is already authenticated and verified
        if (user?.email_confirmed_at) {
          // Check if onboarding is complete
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('user_id', user.id)
            .single();

          if (profile?.onboarding_completed) {
            toast({
              title: "Welcome back!",
              description: "Redirecting to your dashboard...",
            });
            setTimeout(() => navigate('/'), 1500);
          } else {
            toast({
              title: "Continue setup",
              description: "Let's finish setting up your account...",
            });
            setTimeout(() => navigate('/onboarding'), 1500);
          }
        } else {
          // No valid auth state, redirect to sign in
          toast({
            title: "Please sign in",
            description: "Redirecting to sign in page...",
            variant: "destructive",
          });
          setTimeout(() => navigate('/auth'), 2000);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        toast({
          title: "Authentication error",
          description: "Please try signing in again.",
          variant: "destructive",
        });
        setTimeout(() => navigate('/auth'), 2000);
      } finally {
        setIsProcessing(false);
      }
    };

    // Small delay to ensure auth state is updated
    const timer = setTimeout(handleAuthCallback, 500);
    return () => clearTimeout(timer);
  }, [user, navigate, toast, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              {isProcessing ? (
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">
                {isProcessing ? 'Processing...' : 'Success!'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isProcessing 
                  ? 'Please wait while we verify your authentication...'
                  : 'Redirecting you now...'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}