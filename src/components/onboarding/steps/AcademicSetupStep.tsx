import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { GraduationCap, Calendar as CalendarIcon, ChevronLeft } from 'lucide-react';

const academicSetupSchema = z.object({
  semesterName: z.string().min(1, 'Please enter a semester name'),
  startDate: z.date({ required_error: 'Please select a start date' }),
  endDate: z.date({ required_error: 'Please select an end date' }),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type AcademicSetupData = z.infer<typeof academicSetupSchema>;

interface AcademicSetupStepProps {
  data: Partial<AcademicSetupData>;
  onUpdate: (data: AcademicSetupData) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function AcademicSetupStep({ data, onUpdate, onNext, onPrevious }: AcademicSetupStepProps) {
  const form = useForm<AcademicSetupData>({
    resolver: zodResolver(academicSetupSchema),
    defaultValues: {
      semesterName: data.semesterName || '',
      startDate: data.startDate,
      endDate: data.endDate,
    },
  });

  const onSubmit = (formData: AcademicSetupData) => {
    onUpdate(formData);
    onNext();
  };

  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2 mb-8">
        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <GraduationCap className="h-8 w-8 text-primary" />
        </div>
        <p className="text-muted-foreground">
          Set up your current academic term to get personalized scheduling and deadlines.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="semesterName" className="text-sm font-medium">
            Semester/Term Name
          </Label>
          <Input
            id="semesterName"
            placeholder="e.g., Fall 2024, Spring Semester, etc."
            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            {...form.register('semesterName')}
          />
          {form.formState.errors.semesterName && (
            <p className="text-sm text-destructive">{form.formState.errors.semesterName.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Start Date</Label>
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
                  {startDate ? format(startDate, "PPP") : "Select start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => form.setValue('startDate', date!)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.startDate && (
              <p className="text-sm text-destructive">{form.formState.errors.startDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">End Date</Label>
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
                  {endDate ? format(endDate, "PPP") : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => form.setValue('endDate', date!)}
                  disabled={(date) => startDate ? date <= startDate : false}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.endDate && (
              <p className="text-sm text-destructive">{form.formState.errors.endDate.message}</p>
            )}
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 border border-dashed">
          <p className="text-sm text-muted-foreground">
            <strong>Quick setup:</strong> You can add courses, assignments, and exams after completing 
            the initial setup. We'll help you import your schedule later.
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
            Continue
          </Button>
        </div>
      </form>
    </motion.div>
  );
}