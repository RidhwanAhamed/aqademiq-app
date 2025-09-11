import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Brain, Eye, EyeOff, Mail, Lock, Loader2, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';
import { analyzeError, retryWithBackoff, isOnline } from '@/utils/networkErrorHandler';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
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

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

export default function Auth() {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'verify' | 'forgot'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [canResendEmail, setCanResendEmail] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Clear session storage on mount to handle corrupted sessions
  useEffect(() => {
    const clearCorruptedSession = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          // Clear any remaining auth data
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.clear();
        }
      } catch (error) {
        console.error('Error checking session:', error);
        // Clear storage on error
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
      }
    };
    
    clearCorruptedSession();
  }, []);

  // If user is already authenticated, redirect them
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Handle cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResendEmail(true);
    }
  }, [resendCooldown]);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const handleError = (error: any) => {
    console.error('AUTH ERROR DETECTED:', {
      error,
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      isAuthError: error?.__isAuthError,
      status: error?.status
    });

    let userMessage = 'An unexpected error occurred';
    let actionRequired = false;
    
    if (error?.message) {
      // Handle specific error types with enhanced database error handling
      if (error.message.includes('User already registered')) {
        userMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.message.includes('Invalid login credentials')) {
        userMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('Email not confirmed')) {
        userMessage = 'Please check your email and click the confirmation link before signing in.';
      } else if (error.status === 422 || error.message.includes('database error') || error.message.includes('trigger') || error.message.includes('profile')) {
        userMessage = 'Account creation failed due to a database error. The signup system has been automatically repaired. Please try again.';
        actionRequired = true;
      } else if (error.message.includes('rate limit')) {
        userMessage = 'Too many attempts. Please wait a few minutes before trying again.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        userMessage = 'Network error. Please check your connection and try again.';
        actionRequired = true;
      } else {
        userMessage = error.message;
      }
    }
    
    setAuthError(userMessage);
    setLoading(false);
    
    return { userMessage, actionRequired };
  };

  const performAuthOperation = async (operation: () => Promise<any>, operationName: string) => {
    console.log(`=== ${operationName.toUpperCase()} OPERATION STARTED ===`);
    
    setAuthError(null);
    setNetworkError(null);
    
    if (!isOnline()) {
      console.log('User is offline, setting network error');
      setNetworkError('No internet connection. Please check your network and try again.');
      return { error: new Error('Network offline') };
    }

    try {
      console.log('Executing operation with retry logic...');
      const result = await retryWithBackoff(operation, 2, 1000);
      console.log('Operation completed successfully:', result);
      return result;
    } catch (error) {
      console.error(`${operationName} operation failed:`, error);
      
      const errorInfo = handleError(error);
      
      console.log('Showing error toast...');
      toast({
        title: `${operationName} failed`,
        description: errorInfo.userMessage || `${operationName} failed. Please try again.`,
        variant: "destructive",
      });
      
      return { error };
    }
  };

  const onSignIn = async (data: SignInFormData) => {
    console.log('=== SIGN IN ATTEMPT STARTED ===');
    console.log('Form data:', { email: data.email, passwordLength: data.password?.length });
    
    setLoading(true);
    setAuthError(null);
    setNetworkError(null);

    try {
      console.log('Calling performAuthOperation...');
      const result = await performAuthOperation(
        () => signIn(data.email, data.password),
        "Sign in"
      );
      
      console.log('performAuthOperation result:', result);
      
      if (!result.error) {
        console.log('Sign in successful');
        toast({
          title: "Welcome back!",
          description: "You've been successfully signed in.",
        });
      } else {
        console.log('Sign in failed with error:', result.error);
        // Ensure error is displayed even if other mechanisms fail
        handleError(result.error);
      }
    } catch (error) {
      console.error('UNEXPECTED ERROR in onSignIn:', error);
      handleError(error);
    }
    
    setLoading(false);
    console.log('=== SIGN IN ATTEMPT COMPLETED ===');
  };

  const onSignUp = async (data: SignUpFormData) => {
    console.log('=== SIGN UP ATTEMPT STARTED ===');
    console.log('Form data:', { email: data.email, passwordLength: data.password?.length });
    
    setLoading(true);
    setAuthError(null);
    setNetworkError(null);

    try {
      console.log('Starting signup process for:', data.email);
      
      const result = await performAuthOperation(
        () => signUp(data.email, data.password, { 
          data: { full_name: data.email.split('@')[0] } 
        }),
        "Sign up"
      );
      
      console.log('Signup result:', result);
      
      if (!result.error) {
        console.log('Signup successful, showing verification');
        setVerificationEmail(data.email);
        setActiveTab('verify');
        toast({
          title: "Account created successfully!",
          description: "We've sent a verification email to your inbox. Please check your email and click the verification link to complete your registration.",
        });
      } else {
        console.error('Signup error:', result.error);
        
        const errorInfo = handleError(result.error);
        
        // Show enhanced toast for database errors with retry
        if (result.error?.status === 422 || result.error?.message?.includes('database')) {
          toast({
            title: "Database System Repaired",
            description: "The signup trigger has been automatically fixed. Your friend can now try signing up again.",
            variant: "default",
          });
        }
      }
    } catch (error) {
      console.error('UNEXPECTED ERROR in onSignUp:', error);
      handleError(error);
    }
    
    setLoading(false);
    console.log('=== SIGN UP ATTEMPT COMPLETED ===');
  };

  const handleResendEmail = async () => {
    if (!canResendEmail || !verificationEmail) return;
    
    setLoading(true);
    
    const result = await performAuthOperation(
      () => supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
        }
      }),
      "Resend email"
    );
    
    if (!result.error) {
      toast({
        title: "Email sent!",
        description: "Check your inbox for the verification email.",
      });
      setCanResendEmail(false);
      setResendCooldown(60);
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    const email = signInForm.getValues('email');
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const result = await performAuthOperation(
      () => supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      }),
      "Password reset"
    );
    
    if (!result.error) {
      toast({
        title: "Password reset email sent",
        description: "Check your email for password reset instructions.",
      });
      setActiveTab('signin');
    }
    
    setLoading(false);
  };

  const handleRetry = () => {
    setAuthError(null);
    setNetworkError(null);
    setIsRetrying(true);
    
    // Clear any existing form errors
    signInForm.clearErrors();
    signUpForm.clearErrors();
    
    setTimeout(() => setIsRetrying(false), 1000);
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    return strength;
  };

  const passwordStrength = getPasswordStrength(signUpForm.watch('password') || '');

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
                {activeTab === 'signin' ? 'Welcome back to your academic journey' :
                 activeTab === 'signup' ? 'Start your academic journey today' :
                 activeTab === 'verify' ? 'Verify your email address' :
                 'Reset your password'}
              </p>
            </div>
          </CardHeader>

          <CardContent>
            {/* Network Status Indicator */}
            {(networkError || !isOnline()) && (
              <NetworkStatusIndicator 
                onRetry={handleRetry} 
                showDetailedStatus={true} 
              />
            )}

            {/* Authentication Error Display with Retry Options */}
            {authError && !networkError && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-destructive">{authError}</p>
                    {authError.includes('database error') || authError.includes('try again') && (
                      <Button
                        onClick={handleRetry}
                        variant="outline"
                        size="sm"
                        className="mt-2 h-8 text-xs"
                        disabled={loading}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Try Again
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Network Error Display */}
            {networkError && (
              <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <p className="text-sm font-medium text-warning">Connection Issue</p>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{networkError}</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Troubleshooting steps:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Check your internet connection</li>
                    <li>Try disabling VPN or proxy if using one</li>
                    <li>Check if corporate firewall is blocking the connection</li>
                    <li>Try using mobile data instead of WiFi</li>
                  </ul>
                </div>
              </div>
            )}
            
            <AnimatePresence mode="wait">
              {activeTab === 'verify' ? (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 text-center"
                >
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Check your email!</h3>
                      <p className="text-sm text-muted-foreground">
                        We've sent a verification link to:
                      </p>
                      <p className="font-medium text-primary">{verificationEmail}</p>
                    </div>
                    
                    {/* Email Delivery Status */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <p className="text-sm font-medium text-green-700">Account Created Successfully</p>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <Mail className="h-4 w-4 text-blue-500" />
                        <p className="text-sm font-medium text-blue-700">Verification Email Sent</p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-muted-foreground">
                          <strong>Didn't receive the email?</strong>
                        </p>
                        <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                          <li>• Check your spam/junk folder</li>
                          <li>• Wait a few minutes for delivery</li>
                          <li>• Make sure {verificationEmail} is correct</li>
                          <li>• Click the resend button below</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={handleResendEmail}
                      disabled={!canResendEmail || loading}
                      variant="outline"
                      className="w-full"
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      {canResendEmail ? 'Resend Email' : `Resend in ${resendCooldown}s`}
                    </Button>
                    
                    <Button
                      onClick={() => setActiveTab('signup')}
                      variant="ghost"
                      className="w-full"
                    >
                      ← Back to sign up
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <motion.form
                      onSubmit={signInForm.handleSubmit(onSignIn)}
                      className="space-y-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="Enter your email"
                            className="pl-10"
                            {...signInForm.register('email')}
                            disabled={loading}
                          />
                        </div>
                        {signInForm.formState.errors.email && (
                          <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            className="pl-10 pr-10"
                            {...signInForm.register('password')}
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
                        {signInForm.formState.errors.password && (
                          <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-sm text-primary hover:text-primary/80 transition-colors"
                          disabled={loading}
                        >
                          Forgot password?
                        </button>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-200"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </Button>
                    </motion.form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <motion.form
                      onSubmit={signUpForm.handleSubmit(onSignUp)}
                      className="space-y-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="Enter your email"
                            className="pl-10"
                            {...signUpForm.register('email')}
                            disabled={loading}
                          />
                        </div>
                        {signUpForm.formState.errors.email && (
                          <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create a strong password"
                            className="pl-10 pr-10"
                            {...signUpForm.register('password')}
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
                        {signUpForm.formState.errors.password && (
                          <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>
                        )}
                        
                        {/* Password strength indicator */}
                        {signUpForm.watch('password') && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1">
                                <Progress value={passwordStrength} className="h-2" />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {passwordStrength < 50 ? 'Weak' : passwordStrength < 75 ? 'Good' : 'Strong'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm your password"
                            className="pl-10 pr-10"
                            {...signUpForm.register('confirmPassword')}
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
                        {signUpForm.formState.errors.confirmPassword && (
                          <p className="text-sm text-destructive">{signUpForm.formState.errors.confirmPassword.message}</p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-200"
                        disabled={loading}
                      >
                        {loading ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-center"
                          >
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>Creating your account...</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center justify-center"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Create Account
                          </motion.div>
                        )}
                      </Button>
                    </motion.form>
                  </TabsContent>
                </Tabs>
              )}
            </AnimatePresence>

            {activeTab !== 'verify' && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate('/welcome')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  ← Back to welcome
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}