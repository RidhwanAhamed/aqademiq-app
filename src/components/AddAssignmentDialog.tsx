import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Sparkles, Clock, Repeat, Loader2, BookOpen, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCourses } from "@/hooks/useCourses";
import { useAssignments, type Assignment } from "@/hooks/useAssignments";
import { useExams } from "@/hooks/useExams";
import { Checkbox } from "@/components/ui/checkbox";
import { useInputValidation } from "@/hooks/useInputValidation";

const assignmentSchema = z.object({
  title: z.string()
    .min(1, "Assignment title is required")
    .max(200, "Title too long")
    .regex(/^[a-zA-Z0-9\s\-_&.()#:]+$/, "Title contains invalid characters"),
  description: z.string()
    .max(1000, "Description too long")
    .optional(),
  course_id: z.string().min(1, "Please select a course"),
  due_date: z.date(),
  estimated_hours: z.number().min(0.5).max(50),
});

interface AddAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (assignment: Assignment) => void;
  preselectedCourse?: string;
}

export function AddAssignmentDialog({ open, onOpenChange, onCreated, preselectedCourse }: AddAssignmentDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [course, setCourse] = useState(preselectedCourse || "");
  const [dueDate, setDueDate] = useState<Date>();
  const [estimatedHours, setEstimatedHours] = useState(2);
  
  // Recurring assignment fields
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState("weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date>();
  const [linkedExam, setLinkedExam] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);

  const { addAssignment } = useAssignments();
  const { courses, loading: coursesLoading } = useCourses();
  const { exams, loading: examsLoading } = useExams();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate || (isRecurring && !recurrenceEndDate)) return;
    setIsProcessing(true);
    try {
      const assignmentData = {
        title,
        description: description || undefined,
        course_id: course,
        due_date: dueDate.toISOString(),
        estimated_hours: Math.round(Number(estimatedHours) || 0),
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrencePattern : undefined,
        recurrence_interval: isRecurring ? recurrenceInterval : undefined,
        recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate.toISOString().split('T')[0] : undefined,
        exam_id: linkedExam || undefined,
      };

      const { data, error } = await addAssignment(assignmentData);
      if (error || !data) throw new Error(error || "Failed to create assignment");
      
      toast({
        title: isRecurring ? "Recurring assignment created" : "Assignment created",
        description: isRecurring 
          ? "Future instances will be generated automatically based on your schedule."
          : "We'll plan it into tasks shortly.",
      });
      
      onCreated?.(data);
      onOpenChange(false);
      
      // Reset form
      setTitle("");
      setDescription("");
      setCourse(preselectedCourse || "");
      setDueDate(undefined);
      setEstimatedHours(2);
      setIsRecurring(false);
      setRecurrencePattern("weekly");
      setRecurrenceInterval(1);
      setRecurrenceEndDate(undefined);
      setLinkedExam("");
    } catch (err: any) {
      toast({
        title: "Could not create assignment",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Add New Assignment
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Assignment Title</Label>
            <Input
              id="title"
              placeholder="e.g., Write essay on climate change"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course">Course *</Label>
            {coursesLoading ? (
              <div className="flex items-center gap-2 h-10 px-3 py-2 border rounded-md">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-muted-foreground">Loading courses...</span>
              </div>
            ) : courses.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 h-10 px-3 py-2 border rounded-md bg-muted/50">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">No courses available</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-amber-800 font-medium">Create a course first</p>
                      <p className="text-xs text-amber-700 mt-1">You need to create at least one course before adding assignments.</p>
                      <Button 
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 text-amber-700 border-amber-300 hover:bg-amber-100"
                        onClick={() => {
                          onOpenChange(false);
                          // Note: This would typically trigger opening the AddCourseDialog
                          toast({
                            title: "Create a course",
                            description: "Please go to Courses page to create your first course.",
                          });
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Go to Courses
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Select value={course} onValueChange={setCourse} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((courseItem) => (
                    <SelectItem key={courseItem.id} value={courseItem.id}>
                      {courseItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Additional details about the assignment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Estimated Hours</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="hours"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Recurring Assignment Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <Label htmlFor="recurring" className="flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                Make this a recurring assignment
              </Label>
            </div>

            {isRecurring && (
              <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Repeat every</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                        className="w-20"
                      />
                      <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Day(s)</SelectItem>
                          <SelectItem value="weekly">Week(s)</SelectItem>
                          <SelectItem value="biweekly">Bi-week(s)</SelectItem>
                          <SelectItem value="monthly">Month(s)</SelectItem>
                          <SelectItem value="yearly">Year(s)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Until</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !recurrenceEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {recurrenceEndDate ? format(recurrenceEndDate, "PPP") : "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={recurrenceEndDate}
                          onSelect={setRecurrenceEndDate}
                          disabled={(date) => dueDate ? date <= dueDate : false}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Exam Linking Section */}
          <div className="space-y-2">
            <Label htmlFor="linkedExam">Link to Exam (Optional)</Label>
            {examsLoading ? (
              <div className="flex items-center gap-2 h-10 px-3 py-2 border rounded-md">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-muted-foreground">Loading exams...</span>
              </div>
            ) : exams.length === 0 ? (
              <div className="flex items-center gap-2 h-10 px-3 py-2 border rounded-md bg-muted/50">
                <span className="text-muted-foreground">No exams available (optional)</span>
              </div>
            ) : (
              <Select value={linkedExam} onValueChange={setLinkedExam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an exam to link this assignment" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.title} - {format(new Date(exam.exam_date), "PPP")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {linkedExam && (
              <p className="text-xs text-muted-foreground">
                Linking to an exam will automatically generate revision tasks before the exam date.
              </p>
            )}
          </div>

          <div className="bg-primary-muted p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-primary mb-1">AI Planning</h4>
                <p className="text-sm text-muted-foreground">
                  {isRecurring 
                    ? "Our AI will automatically generate future instances and break each into manageable tasks based on your schedule."
                    : "Our AI will automatically break this assignment into manageable tasks and suggest optimal study times based on your schedule."
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!title || !course || !dueDate || (isRecurring && !recurrenceEndDate) || isProcessing || courses.length === 0}
              className="bg-gradient-primary hover:opacity-90"
            >
              {isProcessing ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Processing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isRecurring ? "Create Recurring Assignment" : "Create Assignment"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}