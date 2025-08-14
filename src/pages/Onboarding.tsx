import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRouteProtection } from '@/hooks/useRouteProtection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Brain, ArrowLeft, ArrowRight, CalendarIcon, User, School, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type OnboardingStep = 'account' | 'profile' | 'semester';

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('account');
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const { allowNavigation } = useRouteProtection();

  // Auto-fill timezone on load
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  // Account setup state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile setup state
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Semester setup state
  const [semesterName, setSemesterName] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const stepConfig = {
    account: { 
      title: 'Create Your Account', 
      description: 'Join Aqademiq to start organizing your academic life',
      progress: 33,
      icon: User
    },
    profile: { 
      title: 'Complete Your Profile', 
      description: 'Tell us a bit about yourself',
      progress: 66,
      icon: User
    },
    semester: { 
      title: 'Setup Academic Term', 
      description: 'Configure your current semester or term',
      progress: 100,
      icon: School
    }
  };

  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleAccountSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const { error } = await signUp(email, password);
    
    if (error) {
      let description = error.message;
      
      // Check if user already exists
      if (error.message.includes('already') || error.message.includes('User already registered')) {
        description = "An account with this email already exists.";
        toast({
          title: "Account exists",
          description,
          variant: "destructive",
        });
        toast({
          title: "Ready to sign in?",
          description: "Use the 'Sign in here' link below to access your account.",
        });
        setLoading(false);
        return;
      }
      
      toast({
        title: "Account creation failed", 
        description,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Show success state
    setEmailSent(true);
    setLoading(false);
    
    toast({
      title: "🎉 Account created successfully!",
      description: "Check your email to verify your account and continue.",
    });
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    setResendCooldown(60); // 60 second cooldown
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      toast({
        title: "Resend failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email sent!",
        description: "Check your inbox for the verification link.",
      });
    }
    
    setLoading(false);
    
    // Countdown timer
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user found');

      // First try to update existing profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          timezone: timezone
        })
        .eq('user_id', userData.user.id);

      // If update fails, try to insert a new profile (in case trigger failed)
      if (updateError) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: userData.user.id,
            email: userData.user.email,
            full_name: fullName,
            timezone: timezone
          });

        if (insertError) throw insertError;
      }

      setCompletedSteps(prev => [...prev, 'profile']);
      setCurrentStep('semester');
    } catch (error: any) {
      toast({
        title: "Profile setup failed",
        description: error.message,
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleSemesterSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      toast({
        title: "Please select dates",
        description: "Both start and end dates are required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) throw new Error('No user found');

      const { error } = await supabase
        .from('semesters')
        .insert({
          user_id: userData.user.id,
          name: semesterName,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          is_active: true
        });

      if (error) throw error;

      setCompletedSteps(prev => [...prev, 'semester']);
      
      toast({
        title: "🎉 Welcome to Aqademiq!",
        description: "Your account has been set up successfully. Let's get started!",
      });

      // Short delay before navigation for better UX
      setTimeout(() => navigate('/'), 1500);
    } catch (error: any) {
      toast({
        title: "Semester setup failed",
        description: error.message,
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const currentConfig = stepConfig[currentStep];
  const IconComponent = currentConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-border/50 shadow-elevated">
        <CardHeader className="space-y-4 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center space-x-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <Progress value={currentConfig.progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Step {Object.keys(stepConfig).indexOf(currentStep) + 1} of {Object.keys(stepConfig).length}
            </p>
          </div>

          {/* Step Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              {completedSteps.includes(currentStep) ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <IconComponent className="h-5 w-5 text-primary" />
              )}
              <CardTitle className="text-xl font-semibold">{currentConfig.title}</CardTitle>
            </div>
            <CardDescription className="text-sm">
              {currentConfig.description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === 'account' && !emailSent && (
            <form onSubmit={handleAccountSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a secure password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" 
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}

          {currentStep === 'account' && emailSent && (
            <div className="space-y-6 text-center">
              <div className="space-y-4">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Check your email!</h3>
                  <p className="text-sm text-muted-foreground">
                    We sent a verification link to <strong>{email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click the link in your email to verify your account and continue setup.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={loading || resendCooldown > 0}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : (
                    'Resend verification email'
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  Didn't receive the email? Check your spam folder or try a different email address.
                </p>
              </div>
            </div>
          )}

          {currentStep === 'profile' && (
            <form onSubmit={handleProfileSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Your timezone"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-detected: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setCurrentStep('account')}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity" 
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Continue"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {currentStep === 'semester' && (
            <form onSubmit={handleSemesterSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="semesterName">Semester/Term Name</Label>
                <Input
                  id="semesterName"
                  type="text"
                  placeholder="e.g., Fall 2025, Spring 2025"
                  value={semesterName}
                  onChange={(e) => setSemesterName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "MMM dd, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "MMM dd, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setCurrentStep('profile')}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity" 
                  disabled={loading}
                >
                  {loading ? "Setting up..." : "Complete Setup"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <button 
                onClick={() => navigate('/auth/signin')}
                className="text-primary hover:underline font-medium"
              >
                Sign in here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}