import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Bell, BookOpen, Clock, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const preferencesSchema = z.object({
  studyGoalHours: z.number().min(1).max(50),
  enableReminders: z.boolean(),
  enableStudyInsights: z.boolean(),
  preferredStudyTime: z.enum(['morning', 'afternoon', 'evening', 'night']),
});

type PreferencesData = z.infer<typeof preferencesSchema>;

interface PreferencesStepProps {
  data: Partial<PreferencesData>;
  onUpdate: (data: PreferencesData) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const STUDY_TIME_OPTIONS = [
  { value: 'morning', label: 'Morning (6AM - 12PM)', icon: '🌅' },
  { value: 'afternoon', label: 'Afternoon (12PM - 6PM)', icon: '☀️' },
  { value: 'evening', label: 'Evening (6PM - 10PM)', icon: '🌆' },
  { value: 'night', label: 'Night (10PM - 2AM)', icon: '🌙' },
];

export function PreferencesStep({ data, onUpdate, onNext, onPrevious }: PreferencesStepProps) {
  const form = useForm<PreferencesData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      studyGoalHours: data.studyGoalHours || 20,
      enableReminders: data.enableReminders ?? true,
      enableStudyInsights: data.enableStudyInsights ?? true,
      preferredStudyTime: data.preferredStudyTime || 'evening',
    },
  });

  const onSubmit = (formData: PreferencesData) => {
    onUpdate(formData);
    onNext();
  };

  const studyGoalHours = form.watch('studyGoalHours');
  const enableReminders = form.watch('enableReminders');
  const enableStudyInsights = form.watch('enableStudyInsights');
  const preferredStudyTime = form.watch('preferredStudyTime');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2 mb-8">
        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Target className="h-8 w-8 text-primary" />
        </div>
        <p className="text-muted-foreground">
          Customize Aqademiq to match your learning style and academic goals.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Weekly Study Goal */}
        <div className="space-y-4">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Weekly Study Goal: {studyGoalHours} hours
          </Label>
          <div className="px-4">
            <Slider
              value={[studyGoalHours]}
              onValueChange={(value) => form.setValue('studyGoalHours', value[0])}
              max={50}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>1hr/week</span>
              <span>25hrs/week</span>
              <span>50hrs/week</span>
            </div>
          </div>
        </div>

        {/* Preferred Study Time */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">
            When do you prefer to study?
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STUDY_TIME_OPTIONS.map((option) => (
              <Card
                key={option.value}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md",
                  preferredStudyTime === option.value
                    ? "ring-2 ring-primary border-primary bg-primary/5"
                    : "hover:border-primary/50"
                )}
                onClick={() => form.setValue('preferredStudyTime', option.value as any)}
              >
                <CardContent className="p-4 flex items-center space-x-3">
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{option.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Feature Preferences */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">
            Features & Notifications
          </Label>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 rounded-lg border">
              <Checkbox
                id="reminders"
                checked={enableReminders}
                onCheckedChange={(checked) => form.setValue('enableReminders', !!checked)}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <Label htmlFor="reminders" className="font-medium">
                    Smart Reminders
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get timely notifications for assignments, exams, and study sessions
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 rounded-lg border">
              <Checkbox
                id="insights"
                checked={enableStudyInsights}
                onCheckedChange={(checked) => form.setValue('enableStudyInsights', !!checked)}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <Label htmlFor="insights" className="font-medium">
                    Study Insights
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive AI-powered insights and recommendations for better study habits
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 border border-dashed">
          <p className="text-sm text-muted-foreground">
            <strong>Don't worry!</strong> You can change all these preferences later in your settings.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            className="flex-1"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-gradient-primary hover:opacity-90 transition-all duration-200 shadow-lg"
          >
            Complete Setup
          </Button>
        </div>
      </form>
    </motion.div>
  );
}