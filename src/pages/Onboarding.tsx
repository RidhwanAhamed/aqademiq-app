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

// Import your profile creation helper if exists
// import { createUserProfile } from '@/lib/user';

type OnboardingStep = 'account' | 'profile' | 'semester';

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('account');
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { allowNavigation } = useRouteProtection();

  // Account state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Profile state
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  // Semester state
  const [semesterName, setSemesterName] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  // Email verification state
  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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

          // Create profile AFTER verification
          try {
            // Replace this with your actual profile creation method
            await createUserProfile(session.user); 
          } catch (err: any) {
            toast({
              title: 'Profile creation failed',
              description: err.message || 'Unexpected error',
              variant: 'destructive',
            });
          }

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

  // ACCOUNT SETUP HANDLER
  const handleAccountSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password);
    if (error) {
      let description = error.message;
      if (error.message.includes('already') || error.message.includes('User already registered')) {
        description = 'An account with this email already exists.';
        toast({ title: 'Account exists', description, variant: 'destructive' });
        toast({ title: 'Ready to sign in?', description: "Use the 'Sign in here' link below to access your account." });
      } else {
        toast({ title: 'Account creation failed', description, variant: 'destructive' });
      }
      setLoading(false);
      return;
    }
    setEmailSent(true);
    setLoading(false);
    toast({
      title: '🎉 Account created successfully!',
      description: 'Check your email to verify your account and continue.',
    });
  };

  // RESEND VERIFICATION EMAIL
  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setResendCooldown(60);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) {
      toast({ title: 'Resend failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email sent!', description: 'Check your inbox for the verification link.' });
    }
    setLoading(false);
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

  // PROFILE SETUP HANDLER
  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user found');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: fullName, timezone })
        .eq('user_id', userData.user.id);
      if (updateError) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: userData.user.id,
            email: userData.user.email,
            full_name: fullName,
            timezone
          });
        if (insertError) throw insertError;
      }
      setCompletedSteps((prev) => [...prev, 'profile']);
      setCurrentStep('semester');
    } catch (error: any) {
      toast({ title: 'Profile setup failed', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  // SEMESTER SETUP HANDLER
  const handleSemesterSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast({ title: 'Please select dates', description: 'Both start and end dates are required.', variant: 'destructive' });
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
      setCompletedSteps((prev) => [...prev, 'semester']);
      toast({ title: '🎉 Welcome to Aqademiq!', description: "Your account has been set up successfully. Let's get started!" });
      setTimeout(() => navigate('/'), 1500);
    } catch (error: any) {
      toast({ title: 'Semester setup failed', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const currentConfig = stepConfig[currentStep];
  const IconComponent = currentConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-4">
      {/* ... (rest of your UI JSX unchanged) ... */}
      {/* Just paste your existing JSX here without change from your original */}
    </div>
  );
}

// NOTE: Implement this function somewhere or import it
async function createUserProfile(user: { id: string; email: string }) {
  const { error } = await supabase
    .from('profiles')
    .insert({ user_id: user.id, email: user.email });
  if (error) throw error;
}
