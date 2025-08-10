import { useState } from "react";
import { Assignment } from "@/hooks/useAssignments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Edit2, Save, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCourses } from "@/hooks/useCourses";
import { AIInsightButton } from "@/components/AIInsightButton";

interface AssignmentRowProps {
  assignment: Assignment;
  onUpdate: (id: string, updates: Partial<Assignment>) => Promise<boolean>;
  onToggleComplete: (id: string, completed: boolean) => Promise<boolean>;
}

export function AssignmentRow({ assignment, onUpdate, onToggleComplete }: AssignmentRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description || "");
  const [courseId, setCourseId] = useState(assignment.course_id);
  const [dueDate, setDueDate] = useState<Date>(new Date(assignment.due_date));
  const [estimatedHours, setEstimatedHours] = useState(assignment.estimated_hours || 1);
  const [saving, setSaving] = useState(false);

  const { courses } = useCourses();
  const course = courses.find(c => c.id === assignment.course_id);

  const handleSave = async () => {
    setSaving(true);
    const success = await onUpdate(assignment.id, {
      title,
      description: description || null,
      course_id: courseId,
      due_date: dueDate.toISOString(),
      estimated_hours: estimatedHours,
    });
    if (success) {
      setIsEditing(false);
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setTitle(assignment.title);
    setDescription(assignment.description || "");
    setCourseId(assignment.course_id);
    setDueDate(new Date(assignment.due_date));
    setEstimatedHours(assignment.estimated_hours || 1);
    setIsEditing(false);
  };

  const handleToggle = async (checked: boolean) => {
    await onToggleComplete(assignment.id, checked);
  };

  if (isEditing) {
    return (
      <div className="p-4 border border-border rounded-lg bg-card">
        <div className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Assignment title"
            className="font-medium"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dueDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => date && setDueDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                min="0.5"
                step="0.5"
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">hrs</span>
            </div>
          </div>

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!title || saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center justify-between p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors",
      assignment.is_completed && "opacity-60"
    )}>
      <div className="flex items-center gap-3 flex-1">
        <Checkbox
          checked={assignment.is_completed || false}
          onCheckedChange={handleToggle}
          className="mt-0.5"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              "font-medium",
              assignment.is_completed && "line-through text-muted-foreground"
            )}>
              {assignment.title}
            </h3>
            {assignment.is_completed && (
              <Badge variant="outline" className="text-success border-success">
                Completed
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Due {format(new Date(assignment.due_date), "MMM d, yyyy")}</span>
            <span>•</span>
            <span>{course?.name || "Unknown Course"}</span>
            {assignment.estimated_hours && (
              <>
                <span>•</span>
                <span>{assignment.estimated_hours}h estimated</span>
              </>
            )}
          </div>
          
          {assignment.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {assignment.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <AIInsightButton
          type="assignment"
          title={assignment.title}
          dueDate={assignment.due_date}
          estimatedHours={assignment.estimated_hours}
          description={assignment.description || undefined}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="ml-2"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}