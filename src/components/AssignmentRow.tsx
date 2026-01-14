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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarIcon, Edit2, Save, X, Clock, Repeat, Award, ChevronDown, ChevronUp, Wand2, ListTodo } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCourses } from "@/hooks/useCourses";
import { AIInsightButton } from "@/components/AIInsightButton";
import { GradeDialog } from "@/components/GradeDialog";
import { SubtaskChecklist } from "@/components/SubtaskChecklist";
import { useSubtasks } from "@/hooks/useSubtasks";

interface AssignmentRowProps {
  assignment: Assignment;
  onUpdate: (id: string, updates: Partial<Assignment>) => Promise<boolean>;
  onToggleComplete: (id: string, completed: boolean) => Promise<boolean>;
}

export function AssignmentRow({ assignment, onUpdate, onToggleComplete }: AssignmentRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description || "");
  const [courseId, setCourseId] = useState(assignment.course_id);
  const [dueDate, setDueDate] = useState<Date>(new Date(assignment.due_date));
  const [estimatedHours, setEstimatedHours] = useState(assignment.estimated_hours || 1);
  const [saving, setSaving] = useState(false);

  const { courses } = useCourses();
  const { totalCount, generating, generateBreakdown } = useSubtasks(assignment.id);
  const course = courses.find(c => c.id === assignment.course_id);
  const showBreakdownOption = (assignment.estimated_hours ?? 0) >= 1 && !assignment.is_completed;
  const hasSubtasks = totalCount > 0;

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

  const handleMagicBreakdown = async () => {
    await generateBreakdown();
    setShowSubtasks(true);
  };

  if (isEditing) {
    return (
      <div className="p-4 border border-border rounded-lg bg-card">
        <div className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Assignment title"
            className="font-medium h-12 sm:h-10"
          />
          
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="h-12 sm:h-10">
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
                <Button variant="outline" className="justify-start text-left font-normal h-12 sm:h-10">
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
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                min="0.5"
                step="0.5"
                className="flex-1 h-12 sm:h-10"
              />
              <span className="text-sm text-muted-foreground">hrs</span>
            </div>
          </div>

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="min-h-[80px]"
          />

          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving} className="h-11 sm:h-9">
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!title || saving} className="h-11 sm:h-9">
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Collapsible open={showSubtasks} onOpenChange={setShowSubtasks}>
        <div className={cn(
          "flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/50 transition-colors active:bg-muted/70",
          assignment.is_completed && "opacity-60"
        )}>
          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
            {/* Larger touch target for checkbox */}
            <div className="flex items-center justify-center w-11 h-11 sm:w-6 sm:h-6 -ml-2 sm:ml-0">
              <Checkbox
                checked={assignment.is_completed || false}
                onCheckedChange={handleToggle}
                className="w-5 h-5 sm:w-4 sm:h-4"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className={cn(
                  "font-medium text-sm sm:text-base",
                  assignment.is_completed && "line-through text-muted-foreground"
                )}>
                  {assignment.title}
                </h3>
                {assignment.is_completed && (
                  <Badge variant="outline" className="text-success border-success text-xs">
                    Completed
                  </Badge>
                )}
                {(assignment.is_recurring || assignment.parent_assignment_id) && (
                  <Badge variant="outline" className="text-primary border-primary text-xs">
                    <Repeat className="w-3 h-3 mr-1" />
                    {assignment.is_recurring ? "Recurring" : "Instance"}
                  </Badge>
                )}
                {/* Subtask count badge */}
                {hasSubtasks && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <ListTodo className="w-3 h-3" />
                    {totalCount} subtasks
                  </Badge>
                )}
              </div>
              
              {/* Mobile: stack vertically, Desktop: inline */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <span>Due {format(new Date(assignment.due_date), "MMM d")}</span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate">{course?.name || "Unknown Course"}</span>
                {assignment.estimated_hours && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span>{assignment.estimated_hours}h est.</span>
                  </>
                )}
                {assignment.grade_received && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-success font-medium">Grade: {assignment.grade_received}</span>
                  </>
                )}
              </div>
              
              {assignment.description && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                  {assignment.description}
                </p>
              )}
            </div>
          </div>

          {/* Actions - row on mobile, always visible */}
          <div className="flex items-center gap-1 mt-3 sm:mt-0 ml-9 sm:ml-0">
            {/* Magic Breakdown Button - visible for assignments with 1+ hours, not completed */}
            {showBreakdownOption && !hasSubtasks && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMagicBreakdown}
                disabled={generating}
                className="text-primary hover:text-primary/80 h-10 w-10 sm:h-9 sm:w-9 p-0"
                title="Break down into micro-tasks"
              >
                <Wand2 className={cn("w-4 h-4", generating && "animate-pulse")} />
              </Button>
            )}
            {/* Toggle subtasks button when they exist */}
            {hasSubtasks && (
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-10 w-10 sm:h-9 sm:w-9 p-0"
                  title={showSubtasks ? "Hide subtasks" : "Show subtasks"}
                >
                  {showSubtasks ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
            {!assignment.is_completed && (
              <AIInsightButton
                type="assignment"
                title={assignment.title}
                dueDate={assignment.due_date}
                estimatedHours={assignment.estimated_hours}
                description={assignment.description || undefined}
                isCompleted={assignment.is_completed}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGradeDialog(true)}
              className="text-blue-600 hover:text-blue-700 h-10 w-10 sm:h-9 sm:w-9 p-0"
            >
              <Award className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-10 w-10 sm:h-9 sm:w-9 p-0"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Subtasks collapsible section */}
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 ml-9 sm:ml-10">
            <SubtaskChecklist 
              assignmentId={assignment.id} 
              estimatedHours={assignment.estimated_hours}
              className="border-l-2 border-primary/20 pl-4"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <GradeDialog
        open={showGradeDialog}
        onOpenChange={setShowGradeDialog}
        item={assignment}
        type="assignment"
        onGradeUpdated={() => window.location.reload()}
      />
    </>
  );
}
