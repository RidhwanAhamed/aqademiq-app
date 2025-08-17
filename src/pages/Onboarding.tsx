import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Brain, ChevronLeft, ChevronRight, Sparkles, CalendarIcon, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const personalInfoSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  timezone: z.string().min(1, 'Please select your timezone'),
});

const academicSetupSchema = z.object({
  semesterName: z.string().min(1, 'Semester name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

const preferencesSchema = z.object({
  studyGoals: z.string().optional(),
  weeklyStudyHours: z.string().optional(),
});

type PersonalInfoData = z.infer<typeof personalInfoSchema>;
type AcademicSetupData = z.infer<typeof academicSetupSchema>;
type PreferencesData = z.infer<typeof preferencesSchema>;

const ONBOARDING_STEPS = [
  { id: 'personal', title: 'Personal Information', description: 'Tell us about yourself' },
  { id: 'academic', title: 'Academic Setup', description: 'Configure your semester' },
  { id: 'preferences', title: 'Goals & Preferences', description: 'Customize your experience' },
  { id: 'success', title: 'All Set!', description: 'Welcome to Aqademiq' },
];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney', 'Pacific/Auckland'
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Check if user just verified email - auto-advance to step 1 (personal info)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailVerified = urlParams.get('email_verified');
    
    if (emailVerified === 'true' || (user?.email_confirmed_at && currentStep === 0)) {
      // User just verified email, advance to personal info step
      setCurrentStep(1);
      localStorage.setItem('onboarding_current_step', '1');
      toast({
        title: "Email verified!",
        description: "Let's continue setting up your account.",
      });
    }
  }, [user, currentStep, toast]);

  // Load saved progress
  useEffect(() => {
    const savedStep = localStorage.getItem('onboarding_current_step');
    if (savedStep && !isNaN(parseInt(savedStep))) {
      setCurrentStep(parseInt(savedStep));
    }
  }, []);

  // Save progress
  useEffect(() => {
    localStorage.setItem('onboarding_current_step', currentStep.toString());
  }, [currentStep]);

  const personalForm = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    },
  });

  const academicForm = useForm<AcademicSetupData>({
    resolver: zodResolver(academicSetupSchema),
    defaultValues: {
      semesterName: '',
      startDate: '',
      endDate: '',
    },
  });

  const preferencesForm = useForm<PreferencesData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      studyGoals: '',
      weeklyStudyHours: '10',
    },
  });

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const onPersonalInfoSubmit = async (data: PersonalInfoData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          full_name: data.fullName,
          timezone: data.timezone,
        });

      if (error) throw error;
      nextStep();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error saving profile",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onAcademicSetupSubmit = async (data: AcademicSetupData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('semesters')
        .insert({
          user_id: user?.id,
          name: data.semesterName,
          start_date: data.startDate,
          end_date: data.endDate,
          is_active: true,
        });

      if (error) throw error;
      nextStep();
    } catch (error) {
      console.error('Error saving semester:', error);
      toast({
        title: "Error saving semester",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onPreferencesSubmit = async (data: PreferencesData) => {
    setIsLoading(true);
    try {
      // Update user stats with preferences
      const { error } = await supabase
        .from('user_stats')
        .upsert({
          user_id: user?.id,
          weekly_study_goal: parseInt(data.weeklyStudyHours || '10'),
          study_goals: data.studyGoals,
        });

      if (error) throw error;
      nextStep();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error saving preferences",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      // Mark onboarding as complete
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user?.id);

      if (error) throw error;

      // Clear saved progress
      localStorage.removeItem('onboarding_current_step');
      
      toast({
        title: "Welcome to Aqademiq!",
        description: "Your account has been set up successfully.",
      });

      // Navigate to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Onboarding completion error:', error);
      toast({
        title: "Setup incomplete",
        description: "There was an issue completing your setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 text-center"
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Account Created!</h3>
                <p className="text-sm text-muted-foreground">
                  Check your email to verify your account and continue.
                </p>
              </div>
            </div>
            <Button onClick={() => navigate('/auth')} variant="outline">
              ← Back to Sign In
            </Button>
          </motion.div>
        );

      case 1:
        return (
          <motion.form
            onSubmit={personalForm.handleSubmit(onPersonalInfoSubmit)}
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                {...personalForm.register('fullName')}
                disabled={isLoading}
              />
              {personalForm.formState.errors.fullName && (
                <p className="text-sm text-destructive">{personalForm.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select 
                value={personalForm.watch('timezone')} 
                onValueChange={(value) => personalForm.setValue('timezone', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {personalForm.formState.errors.timezone && (
                <p className="text-sm text-destructive">{personalForm.formState.errors.timezone.message}</p>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronRight className="mr-2 h-4 w-4" />
                )}
                Continue
              </Button>
            </div>
          </motion.form>
        );

      case 2:
        return (
          <motion.form
            onSubmit={academicForm.handleSubmit(onAcademicSetupSubmit)}
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="space-y-2">
              <Label htmlFor="semesterName">Semester/Term Name</Label>
              <Input
                id="semesterName"
                placeholder="e.g., Fall 2024, Spring Term"
                {...academicForm.register('semesterName')}
                disabled={isLoading}
              />
              {academicForm.formState.errors.semesterName && (
                <p className="text-sm text-destructive">{academicForm.formState.errors.semesterName.message}</p>
              )}
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
                      disabled={isLoading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        if (date) {
                          academicForm.setValue('startDate', format(date, 'yyyy-MM-dd'));
                        }
                      }}
                      initialFocus
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
                      disabled={isLoading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        if (date) {
                          academicForm.setValue('endDate', format(date, 'yyyy-MM-dd'));
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronRight className="mr-2 h-4 w-4" />
                )}
                Continue
              </Button>
            </div>
          </motion.form>
        );

      case 3:
        return (
          <motion.form
            onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)}
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="space-y-2">
              <Label htmlFor="studyGoals">Study Goals (Optional)</Label>
              <Input
                id="studyGoals"
                placeholder="e.g., Improve GPA, Master calculus"
                {...preferencesForm.register('studyGoals')}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weeklyStudyHours">Weekly Study Hours Goal</Label>
              <Select 
                value={preferencesForm.watch('weeklyStudyHours')} 
                onValueChange={(value) => preferencesForm.setValue('weeklyStudyHours', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select hours per week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 hours/week</SelectItem>
                  <SelectItem value="10">10 hours/week</SelectItem>
                  <SelectItem value="15">15 hours/week</SelectItem>
                  <SelectItem value="20">20 hours/week</SelectItem>
                  <SelectItem value="25">25+ hours/week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronRight className="mr-2 h-4 w-4" />
                )}
                Complete Setup
              </Button>
            </div>
          </motion.form>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center"
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-600">Welcome to Aqademiq!</h3>
                <p className="text-muted-foreground">
                  Your account is all set up. Let's start your academic journey!
                </p>
              </div>
            </div>

            <Button onClick={completeOnboarding} className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Go to Dashboard'
              )}
            </Button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  const progressPercentage = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  if (!user) {
    return null; // Will redirect via useEffect
  }

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
        className="w-full max-w-2xl relative z-10"
      >
        <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
          <CardHeader className="space-y-6 pb-6">
            {/* Logo and branding */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Aqademiq Setup
              </h1>
            </div>

            {/* Progress indicator */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Step {currentStep + 1} of {ONBOARDING_STEPS.length}
                  </span>
                </div>
                <span className="text-sm font-medium text-primary">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Step title and description */}
            <div className="text-center space-y-2">
              <motion.h2
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-xl font-bold"
              >
                {ONBOARDING_STEPS[currentStep]?.title}
              </motion.h2>
              <motion.p
                key={`desc-${currentStep}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="text-muted-foreground"
              >
                {ONBOARDING_STEPS[currentStep]?.description}
              </motion.p>
            </div>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}