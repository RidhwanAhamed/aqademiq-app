import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Clock, MapPin } from 'lucide-react';

const personalInfoSchema = z.object({
  fullName: z.string().min(2, 'Please enter your full name'),
  timezone: z.string().min(1, 'Please select your timezone'),
});

type PersonalInfoData = z.infer<typeof personalInfoSchema>;

interface PersonalInfoStepProps {
  data: Partial<PersonalInfoData>;
  onUpdate: (data: PersonalInfoData) => void;
  onNext: () => void;
}

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

export function PersonalInfoStep({ data, onUpdate, onNext }: PersonalInfoStepProps) {
  const [detectedTimezone, setDetectedTimezone] = useState<string>('');

  const form = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: data.fullName || '',
      timezone: data.timezone || '',
    },
  });

  // Auto-detect timezone
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setDetectedTimezone(timezone);
    
    if (!data.timezone) {
      form.setValue('timezone', timezone);
    }
  }, [data.timezone, form]);

  const onSubmit = (formData: PersonalInfoData) => {
    onUpdate(formData);
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2 mb-8">
        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <User className="h-8 w-8 text-primary" />
        </div>
        <p className="text-muted-foreground">
          Let's start by getting to know you better. This helps us personalize your academic experience.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium">
            Full Name
          </Label>
          <Input
            id="fullName"
            placeholder="Enter your full name"
            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            {...form.register('fullName')}
          />
          {form.formState.errors.fullName && (
            <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone" className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timezone
          </Label>
          <Select
            value={form.watch('timezone')}
            onValueChange={(value) => form.setValue('timezone', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your timezone" />
            </SelectTrigger>
            <SelectContent>
              {detectedTimezone && (
                <SelectItem value={detectedTimezone} className="border-b">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span>{detectedTimezone} (Detected)</span>
                  </div>
                </SelectItem>
              )}
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.timezone && (
            <p className="text-sm text-destructive">{form.formState.errors.timezone.message}</p>
          )}
        </div>

        <div className="bg-muted/50 rounded-lg p-4 border border-dashed">
          <p className="text-sm text-muted-foreground">
            <strong>Why we need this:</strong> Your timezone helps us schedule reminders and notifications 
            at the right times for you.
          </p>
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-200 shadow-lg"
        >
          Continue
        </Button>
      </form>
    </motion.div>
  );
}