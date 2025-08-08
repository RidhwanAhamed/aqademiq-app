import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Sparkles, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCourses } from "@/hooks/useCourses";
import { useAssignments, type Assignment } from "@/hooks/useAssignments";
interface AddAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (assignment: Assignment) => void;
}


export function AddAssignmentDialog({ open, onOpenChange, onCreated }: AddAssignmentDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [course, setCourse] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [estimatedHours, setEstimatedHours] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);

  const { addAssignment } = useAssignments();
  const { courses } = useCourses();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate) return;
    setIsProcessing(true);
    try {
      const { data, error } = await addAssignment({
        title,
        description: description || undefined,
        course_id: course,
        due_date: dueDate.toISOString(),
        estimated_hours: Math.round(Number(estimatedHours) || 0),
      });
      if (error || !data) throw new Error(error || "Failed to create assignment");
      toast({
        title: "Assignment created",
        description: "We’ll plan it into tasks shortly.",
      });
      onCreated?.(data);
      onOpenChange(false);
      // Reset form
      setTitle("");
      setDescription("");
      setCourse("");
      setDueDate(undefined);
      setEstimatedHours(2);
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
      <DialogContent className="sm:max-w-[500px] bg-gradient-card">
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
            <Label htmlFor="course">Course</Label>
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

          <div className="bg-primary-muted p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-primary mb-1">AI Planning</h4>
                <p className="text-sm text-muted-foreground">
                  Our AI will automatically break this assignment into manageable tasks 
                  and suggest optimal study times based on your schedule.
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
              disabled={!title || !course || !dueDate || isProcessing}
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
                  Create Assignment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}