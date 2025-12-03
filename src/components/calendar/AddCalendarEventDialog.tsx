/**
 * AddCalendarEventDialog.tsx
 * 
 * Purpose: Modal dialog for creating new calendar events (Schedule blocks)
 * 
 * Backend Integration Required:
 * - POST /api/schedule-blocks - Create new event/schedule block
 *   Payload: { title, description, course_id, start_time, end_time, specific_date, location, notes }
 *   Response: { id, title, ... }
 * 
 * TODO: API -> Replace mock Supabase calls with real API endpoints
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, CalendarIcon, MapPin, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useCourses } from '@/hooks/useCourses';
import { useSchedule } from '@/hooks/useSchedule';
import { useToast } from '@/hooks/use-toast';

interface AddCalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  initialHour?: number;
  onEventCreated?: () => void;
}

export function AddCalendarEventDialog({
  open,
  onOpenChange,
  initialDate,
  initialHour,
  onEventCreated
}: AddCalendarEventDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    course_id: '',
    date: '',
    start_time: '',
    end_time: '',
    notes: '',
    location: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { courses } = useCourses();
  const { addScheduleBlock } = useSchedule();
  const { toast } = useToast();

  // Set initial values when dialog opens
  useEffect(() => {
    if (open && initialDate) {
      const dateStr = format(initialDate, 'yyyy-MM-dd');
      const startHour = initialHour !== undefined ? initialHour : 9;
      const endHour = startHour + 1;
      
      setFormData(prev => ({
        ...prev,
        date: dateStr,
        start_time: `${startHour.toString().padStart(2, '0')}:00`,
        end_time: `${endHour.toString().padStart(2, '0')}:00`,
      }));
    }
  }, [open, initialDate, initialHour]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        course_id: '',
        date: '',
        start_time: '',
        end_time: '',
        notes: '',
        location: '',
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive",
      });
      return;
    }

    if (!formData.date) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    if (!formData.start_time || !formData.end_time) {
      toast({
        title: "Error",
        description: "Please set start and end times",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create event/schedule block
      const result = await addScheduleBlock({
        title: formData.title,
        description: formData.notes || undefined,
        location: formData.location || undefined,
        course_id: formData.course_id && formData.course_id !== 'none' ? formData.course_id : undefined,
        start_time: formData.start_time,
        end_time: formData.end_time,
        specific_date: formData.date,
        is_recurring: false,
        is_active: true,
      });

      if (!result) {
        throw new Error("Failed to create event");
      }

      toast({
        title: "Event Created",
        description: `"${formData.title}" has been added to your calendar`,
      });

      onOpenChange(false);
      onEventCreated?.();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create event",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Add to Calendar
          </DialogTitle>
          <DialogDescription>
            Create a new event for your schedule
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Study Session, Team Meeting"
              required
              aria-required="true"
            />
          </div>

          {/* Course Selection */}
          <div className="space-y-2">
            <Label htmlFor="course">Course (Optional)</Label>
            <Select 
              value={formData.course_id} 
              onValueChange={(value) => setFormData({ ...formData, course_id: value })}
            >
              <SelectTrigger id="course">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No course</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    <div className="flex items-center gap-2">
                      <Badge 
                        style={{ backgroundColor: `hsl(var(--${course.color}))` }} 
                        className="w-3 h-3 rounded-full p-0" 
                      />
                      {course.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>
              Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left font-normal"
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date 
                    ? format(new Date(formData.date + 'T00:00:00'), 'PPP')
                    : "Pick a date"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border shadow-lg z-50" align="start" sideOffset={5}>
                <Calendar
                  mode="single"
                  selected={formData.date ? new Date(formData.date + 'T00:00:00') : undefined}
                  onSelect={(date) => setFormData({ 
                    ...formData, 
                    date: date ? format(date, 'yyyy-MM-dd') : '' 
                  })}
                  initialFocus
                  className="pointer-events-auto rounded-md border-0"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">
                Start Time <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="pl-10"
                  required
                  aria-required="true"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">
                End Time <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="pl-10"
                  required
                  aria-required="true"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Room 101, Library"
                className="pl-10"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-primary hover:opacity-90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Add Event'
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}



