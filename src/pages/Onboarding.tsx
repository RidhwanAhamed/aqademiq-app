import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Brain, ArrowLeft, ArrowRight, User, School, CheckCircle, Loader2 } from 'lucide-react';

type OnboardingStep = 'account' | 'profile' | 'semester';

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('account');
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);
  const navigate = useNavigate();

  // Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Profile
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Semester
  const [semesterName, setSemesterName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Auth state listener for verifying email + redirect
  useEffect(() => {
    if (!emailSent) return;
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          toast({
            title: '🎉 Email verified successfully!',
            description: 'Continuing to profile setup...',
          });
          // Create profile after verification
          await createUserProfile(session.user);
          setTimeout(() => {
            setEmailSent(false);
            setCurrentStep('profile');
          }, 1500);
        }
      }
    );
    return () => authListener?.subscription?.unsubscribe();
  }, [emailSent]);

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

  async function createUserProfile(user: { id: string; email: string }) {
    if (!user) return; // Defensive, should not happen
    const { error } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, email: user.email });
    if (error) toast({ title: 'Profile error', description: error.message, variant: 'destructive' });
  }

  const handleAccountSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure your passwords match.", variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setLoading(false);
    if (error) {
      toast({ title: 'Account creation failed', description: error.message, variant: 'destructive' });
      return;
    }
    setEmailSent(true);
    toast({ title: '🎉 Account created!', description: 'Check your email to verify your account.' });
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setResendCooldown(60); // 60 sec cooldown
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Resend failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email sent!', description: 'Check your inbox for the verification link.' });
    }
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) { setLoading(false); toast({ title: "No user found", variant: "destructive" }); return; }
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, timezone })
      .eq('user_id', user.id);
    if (updateError) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ user_id: user.id, email: user.email, full_name: fullName, timezone });
      if (insertError) toast({ title: 'Profile error', description: insertError.message, variant: 'destructive' });
    }
    setLoading(false);
    setCompletedSteps(prev => [...prev, 'profile']);
    setCurrentStep('semester');
  };

  const handleSemesterSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast({ title: 'Please select dates', description: 'Both start and end dates are required.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) { setLoading(false); toast({ title: "No user found", variant: "destructive" }); return; }
    const { error } = await supabase
      .from('semesters')
      .insert({
        user_id: user.id,
        name: semesterName,
        start_date: startDate,
        end_date: endDate,
        is_active: true
      });
    setLoading(false);
    if (error) {
      toast({ title: 'Semester setup failed', description: error.message, variant: 'destructive' });
      return;
    }
    setCompletedSteps(prev => [...prev, 'semester']);
    toast({ title: "🎉 Welcome to Aqademiq!", description: "Your account has been set up successfully." });
    setTimeout(() => navigate('/dashboard'), 1500);
  };

  const currentConfig = stepConfig[currentStep];
  const IconComponent = currentConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-border/50 shadow-elevated">
        <CardHeader className="space-y-4 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <Progress value={currentConfig.progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Step {Object.keys(stepConfig).indexOf(currentStep) + 1} of {Object.keys(stepConfig).length}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              {completedSteps.includes(currentStep) ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <IconComponent className="h-5 w-5 text-primary" />
              )}
              <CardTitle className="text-xl font-semibold">{currentConfig.title}</CardTitle>
            </div>
            <CardDescription className="text-sm">{currentConfig.description}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === 'account' && !emailSent && (
            <form onSubmit={handleAccountSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}
          {currentStep === 'account' && emailSent && (
            <div className="space-y-6 text-center">
              <div className="space-y-4">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Check your email!</h3>
                  <p className="text-sm text-muted-foreground">We sent a verification link to <strong>{email}</strong></p>
                  <p className="text-xs text-muted-foreground">Click the link in your email to verify your account and continue setup.</p>
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Waiting for email verification...
                    </p>
                  </div>
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
                <p className="text-xs text-muted-foreground">Didn't receive the email? Check your spam folder or try a different email address.</p>
              </div>
            </div>
          )}
          {currentStep === 'profile' && (
            <form onSubmit={handleProfileSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" type="text" value={timezone} onChange={e => setTimezone(e.target.value)} />
                <p className="text-xs text-muted-foreground">Auto-detected: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
              </div>
              <div className="flex space-x-3">
                <Button type="button" variant="outline" onClick={() => setCurrentStep('account')} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
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
                <Input id="semesterName" type="text" value={semesterName} onChange={e => setSemesterName(e.target.value)} required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
              </div>
              <div className="flex space-x-3">
                <Button type="button" variant="outline" onClick={() => setCurrentStep('profile')} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
                  {loading ? "Setting up..." : "Complete Setup"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

