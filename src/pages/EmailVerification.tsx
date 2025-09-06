import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Mail, ArrowRight, GraduationCap, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the session to check if verification was successful
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setVerificationStatus('error');
          setErrorMessage(error.message || 'Email verification failed');
          return;
        }

        if (session?.user) {
          // User is verified and logged in
          setVerificationStatus('success');
          toast({
            title: "Email verified successfully!",
            description: "Your account has been activated.",
          });
        } else {
          // Check URL params for error
          const error = searchParams.get('error');
          const errorDescription = searchParams.get('error_description');
          
          if (error) {
            setVerificationStatus('error');
            setErrorMessage(errorDescription || 'Email verification failed');
          } else {
            setVerificationStatus('success');
            toast({
              title: "Email verified!",
              description: "You can now sign in to your account.",
            });
          }
        }
      } catch (error) {
        setVerificationStatus('error');
        setErrorMessage('Something went wrong during verification');
      }
    };

    verifyEmail();
  }, [searchParams, toast]);

  const handleContinueToLogin = () => {
    navigate('/auth', { 
      state: { 
        message: verificationStatus === 'success' ? 'Your email has been verified. Please sign in.' : undefined 
      } 
    });
  };

  const handleRetryVerification = () => {
    navigate('/auth', { 
      state: { 
        message: 'Please request a new verification email.',
        activeTab: 'signup'
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-accent/20 rounded-full blur-3xl" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Aqademiq
              </CardTitle>
              <p className="text-muted-foreground">
                Email Verification
              </p>
            </div>
          </CardHeader>

          <CardContent className="text-center space-y-6">
            {verificationStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">Email Verified Successfully!</h2>
                  <p className="text-muted-foreground">
                    Thank you for verifying your email address. Your account is now active and ready to use.
                  </p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-center gap-2 text-green-800 dark:text-green-200">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm font-medium">Account Activated</span>
                  </div>
                </div>

                <Button 
                  onClick={handleContinueToLogin} 
                  className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-200"
                >
                  Continue to Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {verificationStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">Verification Failed</h2>
                  <p className="text-muted-foreground">
                    We couldn't verify your email address. The link may have expired or already been used.
                  </p>
                  {errorMessage && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      {errorMessage}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handleRetryVerification} 
                    className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-200"
                  >
                    Request New Verification Email
                  </Button>
                  
                  <Button 
                    onClick={handleContinueToLogin} 
                    variant="outline"
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </motion.div>
            )}

            {verificationStatus === 'loading' && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">Verifying Email...</h2>
                  <p className="text-muted-foreground">
                    Please wait while we verify your email address.
                  </p>
                </div>

                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Need help? Contact our support team for assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}