import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PersonalInfoStep } from './steps/PersonalInfoStep';
import { AcademicSetupStep } from './steps/AcademicSetupStep';
import { PreferencesStep } from './steps/PreferencesStep';
import { SuccessStep } from './steps/SuccessStep';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const ONBOARDING_STEPS = [
  { id: 'personal', title: 'Personal Information', description: 'Tell us about yourself' },
  { id: 'academic', title: 'Academic Setup', description: 'Configure your semester' },
  { id: 'preferences', title: 'Goals & Preferences', description: 'Customize your experience' },
  { id: 'success', title: 'All Set!', description: 'Welcome to Aqademiq' },
];

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [stepData, setStepData] = useState({
    personal: {},
    academic: {},
    preferences: {},
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Auto-save progress to localStorage
  useEffect(() => {
    localStorage.setItem('onboarding_progress', JSON.stringify({
      currentStep,
      stepData,
    }));
  }, [currentStep, stepData]);

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem('onboarding_progress');
    if (saved) {
      try {
        const { currentStep: savedStep, stepData: savedData } = JSON.parse(saved);
        if (savedStep && savedStep < ONBOARDING_STEPS.length - 1) {
          setCurrentStep(savedStep);
          setStepData(savedData || {});
        }
      } catch (error) {
        console.error('Failed to load onboarding progress:', error);
      }
    }
  }, []);

  const updateStepData = (stepId: string, data: any) => {
    setStepData(prev => ({
      ...prev,
      [stepId]: data,
    }));
  };

  const nextStep = async () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          full_name: (stepData.personal as any).fullName,
          timezone: (stepData.personal as any).timezone,
        });

      if (profileError) throw profileError;

      // Create semester if academic data exists
      if ((stepData.academic as any).semesterName) {
        const { error: semesterError } = await supabase
          .from('semesters')
          .insert({
            user_id: user?.id,
            name: (stepData.academic as any).semesterName,
            start_date: (stepData.academic as any).startDate,
            end_date: (stepData.academic as any).endDate,
            is_active: true,
          });

        if (semesterError) throw semesterError;
      }

      // Clear onboarding progress
      localStorage.removeItem('onboarding_progress');
      
      toast({
        title: "Welcome to Aqademiq!",
        description: "Your account has been set up successfully.",
      });

      // Navigate to dashboard
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
          <PersonalInfoStep
            data={stepData.personal}
            onUpdate={(data) => updateStepData('personal', data)}
            onNext={nextStep}
          />
        );
      case 1:
        return (
          <AcademicSetupStep
            data={stepData.academic}
            onUpdate={(data) => updateStepData('academic', data)}
            onNext={nextStep}
            onPrevious={prevStep}
          />
        );
      case 2:
        return (
          <PreferencesStep
            data={stepData.preferences}
            onUpdate={(data) => updateStepData('preferences', data)}
            onNext={nextStep}
            onPrevious={prevStep}
          />
        );
      case 3:
        return (
          <SuccessStep
            onComplete={completeOnboarding}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  const progressPercentage = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

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
              <motion.h1
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-2xl font-bold"
              >
                {ONBOARDING_STEPS[currentStep].title}
              </motion.h1>
              <motion.p
                key={`desc-${currentStep}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="text-muted-foreground"
              >
                {ONBOARDING_STEPS[currentStep].description}
              </motion.p>
            </div>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}