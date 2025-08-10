import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Clock, MapPin, Repeat, RotateCcw, Info } from 'lucide-react';
import { useRotationTemplates } from '@/hooks/useRotationTemplates';
import { useCourses } from '@/hooks/useCourses';
import { useSchedule } from '@/hooks/useSchedule';
import { useToast } from '@/hooks/use-toast';

interface AddClassDialogProps {
  children?: React.ReactNode;
}

export function AddClassDialog({ children }: AddClassDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    course_id: '',
    start_time: '',
    end_time: '',
    day_of_week: '',
    specific_date: '',
    is_recurring: true,
    rotation_type: 'weekly',
    rotation_weeks: '',
    semester_week_start: 1,
    rotation_group: '',
  });

  const { templates, loading: templatesLoading } = useRotationTemplates();

  const { courses } = useCourses();
  const { addScheduleBlock } = useSchedule();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.start_time || !formData.end_time) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.is_recurring && !formData.day_of_week) {
      toast({
        title: "Error",
        description: "Please select a day of the week for recurring classes",
        variant: "destructive",
      });
      return;
    }

    if (!formData.is_recurring && !formData.specific_date) {
      toast({
        title: "Error",
        description: "Please select a date for one-time classes",
        variant: "destructive",
      });
      return;
    }

    let rotationWeeks: number[] | null = null;
    if (formData.rotation_type === 'custom' && formData.rotation_weeks) {
      rotationWeeks = formData.rotation_weeks
        .split(',')
        .map(w => parseInt(w.trim()))
        .filter(w => !isNaN(w) && w > 0);
    }

    const result = await addScheduleBlock({
      title: formData.title,
      description: formData.description || undefined,
      location: formData.location || undefined,
      course_id: formData.course_id || undefined,
      start_time: formData.start_time,
      end_time: formData.end_time,
      day_of_week: formData.is_recurring ? parseInt(formData.day_of_week) : undefined,
      specific_date: !formData.is_recurring ? formData.specific_date : undefined,
      is_recurring: formData.is_recurring,
      rotation_type: formData.rotation_type as any,
      rotation_weeks: rotationWeeks,
      semester_week_start: formData.semester_week_start,
      rotation_group: formData.rotation_group || undefined,
      is_active: true,
    });

    if (result) {
      toast({
        title: "Success",
        description: "Class added successfully",
      });
      setOpen(false);
      setFormData({
        title: '',
        description: '',
        location: '',
        course_id: '',
        start_time: '',
        end_time: '',
        day_of_week: '',
        specific_date: '',
        is_recurring: true,
        rotation_type: 'weekly',
        rotation_weeks: '',
        semester_week_start: 1,
        rotation_group: '',
      });
    }
  };

  const daysOfWeek = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '0', label: 'Sunday' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-gradient-primary hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Add Class
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Class</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Class Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Mathematics Lecture"
              required
            />
          </div>

          <div>
            <Label htmlFor="course">Course (Optional)</Label>
            <Select value={formData.course_id} onValueChange={(value) => setFormData({ ...formData, course_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No course</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    <div className="flex items-center gap-2">
                      <Badge style={{ backgroundColor: `hsl(var(--${course.color}))` }} className="w-3 h-3 rounded-full p-0" />
                      {course.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Start Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="end_time">End Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Room 101, Building A"
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="recurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
            />
            <Label htmlFor="recurring" className="flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              Recurring Class
            </Label>
          </div>

          {formData.is_recurring ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="day_of_week">Day of Week *</Label>
                <Select value={formData.day_of_week} onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="week_type">Week Type (Optional)</Label>
                <Select value={formData.week_type} onValueChange={(value) => setFormData({ ...formData, week_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select week type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Every week</SelectItem>
                    <SelectItem value="A">Week A</SelectItem>
                    <SelectItem value="B">Week B</SelectItem>
                    <SelectItem value="odd">Odd weeks</SelectItem>
                    <SelectItem value="even">Even weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="specific_date">Date *</Label>
              <Input
                id="specific_date"
                type="date"
                value={formData.specific_date}
                onChange={(e) => setFormData({ ...formData, specific_date: e.target.value })}
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional notes about this class..."
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Add Class
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}