import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useExams } from '@/hooks/useExams';
import { useCourses } from '@/hooks/useCourses';
import { useToast } from '@/hooks/use-toast';

const examSchema = z.object({
  title: z.string()
    .min(1, "Exam title is required")
    .max(200, "Title too long")
    .regex(/^[a-zA-Z0-9\s\-_&.()#:]+$/, "Title contains invalid characters"),
  course_id: z.string().min(1, "Please select a course"),
  exam_date: z.date(),
  location: z.string()
    .max(100, "Location too long")
    .optional()
    .refine(val => !val || /^[a-zA-Z0-9\s\-_&.()#]+$/.test(val), "Location contains invalid characters"),
  exam_type: z.string(),
  duration_minutes: z.number().min(5).max(480),
  notes: z.string().max(500, "Notes too long").optional(),
});

interface AddExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCourse?: string;
}

export function AddExamDialog({ open, onOpenChange, preselectedCourse }: AddExamDialogProps) {
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState(preselectedCourse || '');
  const [examDate, setExamDate] = useState<Date>();
  const [examTime, setExamTime] = useState('');
  const [duration, setDuration] = useState('120');
  const [location, setLocation] = useState('');
  const [examType, setExamType] = useState('midterm');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addExam } = useExams();
  const { courses } = useCourses();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseId || !examDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine date and time
      const [hours, minutes] = examTime ? examTime.split(':').map(Number) : [9, 0];
      const examDateTime = new Date(examDate);
      examDateTime.setHours(hours, minutes, 0, 0);

      const examData = {
        title: title.trim(),
        course_id: courseId,
        exam_date: examDateTime.toISOString(),
        duration_minutes: parseInt(duration),
        location: location.trim(),
        exam_type: examType,
        notes: notes.trim(),
        study_hours_planned: 10,
        study_hours_completed: 0,
        grade_points: null,
        grade_received: null
      };

      await addExam(examData);
      
      toast({
        title: "Success",
        description: "Exam added successfully!"
      });

      // Reset form
      setTitle('');
      setCourseId(preselectedCourse || '');
      setExamDate(undefined);
      setExamTime('');
      setDuration('120');
      setLocation('');
      setExamType('midterm');
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding exam:', error);
      toast({
        title: "Error",
        description: "Failed to add exam. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Add New Exam
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Exam Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Midterm Exam"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course">Course *</Label>
              <Select value={courseId} onValueChange={setCourseId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Exam Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !examDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {examDate ? format(examDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={examDate}
                    onSelect={setExamDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Exam Time</Label>
              <Input
                id="time"
                type="time"
                value={examTime}
                onChange={(e) => setExamTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="5"
                max="480"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="examType">Exam Type</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="midterm">Midterm</SelectItem>
                  <SelectItem value="final">Final Exam</SelectItem>
                  <SelectItem value="practical">Practical</SelectItem>
                  <SelectItem value="oral">Oral Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Room 101, Main Building"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about the exam..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Exam'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}