import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Lock, Eye, EyeOff, GraduationCap, Brain, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function PasswordResetConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState<'form' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionCheckedAt, setSessionCheckedAt] = useState<Date | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    // Check if we have valid reset session with retry logic
    const checkResetSession = async () => {
      setSessionCheckedAt(new Date());
      
      // Check URL params for errors first
      const error_param = searchParams.get('error');
      const error_description = searchParams.get('error_description');
      
      if (error_param) {
        setResetStatus('error');
        if (error_param === 'access_denied') {
          setErrorMessage('Reset link has expired or already been used. Links are valid for 24 hours and can only be used once.');
        } else {
          setErrorMessage(error_description || 'Password reset link is invalid or has expired.');
        }
        return;
      }
      
      // Retry session check up to 6 times over 2 seconds
      // This handles cases where email scanners or slow auth processes delay the session
      let session = null;
      let lastError = null;
      
      for (let attempt = 1; attempt <= 6; attempt++) {
        const { data, error } = await supabase.auth.getSession();
        
        console.log(`Reset session check (attempt ${attempt}/6):`, {
          hasSession: !!data.session,
          hasError: !!error,
          timestamp: new Date().toISOString()
        });
        
        if (data.session?.user) {
          session = data.session;
          break;
        }
        
        lastError = error;
        
        // Wait before next attempt (exponential backoff: 100ms, 200ms, 300ms, 400ms, 500ms, 600ms)
        if (attempt < 6) {
          await new Promise(resolve => setTimeout(resolve, attempt * 100));
        }
      }
      
      // After all retries, check if we have a valid session
      if (lastError) {
        setResetStatus('error');
        setErrorMessage(`Session error: ${lastError.message}. Please request a new password reset.`);
      } else if (!session?.user) {
        setResetStatus('error');
        setErrorMessage('No active reset session found. The link may have expired. Password reset links are valid for 24 hours.');
      }
      // If we have a session, form stays in 'form' status (default)
    };

    checkResetSession();
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        toast({
          title: "Password reset failed",
          description: error.message,
          variant: "destructive",
        });
        setResetStatus('error');
        setErrorMessage(error.message);
      } else {
        setResetStatus('success');
        toast({
          title: "Password updated successfully!",
          description: "You can now sign in with your new password.",
        });
        
        // Auto redirect after 3 seconds
        setTimeout(() => {
          navigate('/auth', { 
            state: { 
              message: 'Your password has been updated. Please sign in with your new password.' 
            }
          });
        }, 3000);
      }
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
      setResetStatus('error');
      setErrorMessage('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewReset = async () => {
    const email = searchParams.get('email');
    
    if (email) {
      // Try to resend directly if we have the email
      setResendingEmail(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        
        if (!error) {
          toast({
            title: "New reset email sent!",
            description: "Check your inbox for the new password reset link. It will be valid for 24 hours.",
          });
          // Don't navigate away, let user know to check email
          setErrorMessage('New reset email sent! Check your inbox and spam folder. The link is valid for 24 hours.');
        } else {
          throw error;
        }
      } catch (error) {
        console.error('Resend error:', error);
        // Fall back to navigation
        navigate('/auth', { 
          state: { 
            message: 'Please enter your email to request a new password reset.',
            showForgotPassword: true
          } 
        });
      } finally {
        setResendingEmail(false);
      }
    } else {
      // No email in URL, navigate to auth page
      navigate('/auth', { 
        state: { 
          message: 'Please enter your email to request a new password reset.',
          showForgotPassword: true
        } 
      });
    }
  };

  const handleBackToLogin = () => {
    navigate('/auth');
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    return strength;
  };

  const passwordStrength = getPasswordStrength(form.watch('password') || '');

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
                {resetStatus === 'form' ? 'Reset Your Password' : 
                 resetStatus === 'success' ? 'Password Updated' : 'Reset Failed'}
              </p>
            </div>
          </CardHeader>

          <CardContent>
            {resetStatus === 'form' && (
              <motion.form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      className="pl-10 pr-10"
                      {...form.register('password')}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                  )}
                  
                  {/* Password strength indicator */}
                  {form.watch('password') && (
                    <div className="space-y-2">
                      <Progress value={passwordStrength} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Password strength: {passwordStrength < 50 ? 'Weak' : passwordStrength < 75 ? 'Medium' : 'Strong'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your new password"
                      className="pl-10 pr-10"
                      {...form.register('confirmPassword')}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={loading}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handleBackToLogin}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  Back to Sign In
                </Button>
              </motion.form>
            )}

            {resetStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-6 text-center"
              >
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">Password Updated Successfully!</h2>
                  <p className="text-muted-foreground">
                    Your password has been updated. You can now sign in with your new password.
                  </p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-center gap-2 text-green-800 dark:text-green-200">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-medium">Password Secured</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  You will be redirected to sign in automatically in 3 seconds...
                </div>

                <Button 
                  onClick={handleBackToLogin} 
                  className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-200"
                >
                  Continue to Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {resetStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-6 text-center"
              >
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold text-foreground">Password Reset Failed</h2>
                  <p className="text-muted-foreground">
                    The reset link has expired or already been used. Password reset links are valid for 24 hours and can only be used once.
                  </p>
                  
                  {errorMessage && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        <strong>Error Details:</strong> {errorMessage}
                      </p>
                      {sessionCheckedAt && (
                        <p className="text-xs text-red-500 dark:text-red-300 mt-2">
                          Checked at: {sessionCheckedAt.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="p-3 bg-muted/50 rounded-lg text-left">
                    <p className="text-sm font-medium mb-2">Why did this happen?</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside ml-2">
                      <li>The link was opened after 24 hours</li>
                      <li>The link was already used once</li>
                      <li>Email delivery was delayed</li>
                      <li>Link was opened multiple times</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handleRequestNewReset} 
                    className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-200"
                    disabled={resendingEmail}
                  >
                    {resendingEmail ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending New Link...
                      </>
                    ) : (
                      'Request New Password Reset'
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleBackToLogin} 
                    variant="outline"
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                  
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>💡 Tip:</strong> The new reset link will be valid for 24 hours. Make sure to use it promptly after receiving the email.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}