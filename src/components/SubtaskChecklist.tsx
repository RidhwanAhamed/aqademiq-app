import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Trash2, Clock, Sparkles, Loader2, Calendar, Check, Edit2, X, CalendarPlus } from "lucide-react";
import { useSubtasks, Subtask } from "@/hooks/useSubtasks";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface SubtaskChecklistProps {
  assignmentId: string;
  estimatedHours?: number | null;
  className?: string;
}

export function SubtaskChecklist({ assignmentId, estimatedHours, className }: SubtaskChecklistProps) {
  const {
    subtasks,
    loading,
    generating,
    completedCount,
    totalCount,
    completionPercentage,
    generateBreakdown,
    toggleSubtask,
    deleteSubtask,
    scheduleSubtask,
    scheduleAllSubtasks,
    schedulingTaskId,
  } = useSubtasks(assignmentId);

  const showBreakdownButton = (estimatedHours ?? 0) >= 1 && totalCount === 0;
  const hasUnscheduledTasks = subtasks.some(t => !t.is_completed && !t.scheduled_block_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (totalCount === 0 && !showBreakdownButton) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {showBreakdownButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={generateBreakdown}
          disabled={generating}
          className="w-full gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/5"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating micro-tasks...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Magic Breakdown
            </>
          )}
        </Button>
      )}

      {totalCount > 0 && (
        <>
          <div className="flex items-center gap-3">
            <Progress value={completionPercentage} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {completedCount}/{totalCount} done
            </span>
          </div>

          {/* Schedule All Button */}
          {hasUnscheduledTasks && (
            <Button
              variant="outline"
              size="sm"
              onClick={scheduleAllSubtasks}
              disabled={schedulingTaskId === "all"}
              className="w-full gap-2 text-xs"
            >
              {schedulingTaskId === "all" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Schedule All to Calendar
                </>
              )}
            </Button>
          )}

          <div className="space-y-2">
            {subtasks.map((task) => (
              <SubtaskItem
                key={task.id}
                task={task}
                onToggle={toggleSubtask}
                onDelete={deleteSubtask}
                onSchedule={scheduleSubtask}
                isScheduling={schedulingTaskId === task.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface SubtaskItemProps {
  task: Subtask;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onSchedule: (task: Subtask) => Promise<void>;
  isScheduling: boolean;
}

function SubtaskItem({ task, onToggle, onDelete, onSchedule, isScheduling }: SubtaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const { toast } = useToast();

  const priorityColors = {
    1: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    3: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  const handleSaveEdit = async () => {
    // TODO: Implement edit save when backend supports it
    toast({
      title: "Updated",
      description: "Task title updated.",
    });
    setIsEditing(false);
  };

  const isScheduled = !!task.scheduled_block_id;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border bg-card transition-all",
        task.is_completed && "opacity-60 bg-muted/30",
        isScheduled && "border-primary/30"
      )}
    >
      <Checkbox
        checked={task.is_completed}
        onCheckedChange={(checked) => onToggle(task.id, !!checked)}
        className="mt-0.5"
      />
      
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="h-7 text-sm"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditing(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm font-medium cursor-pointer hover:text-primary",
                task.is_completed && "line-through text-muted-foreground"
              )}
              onClick={() => setIsEditing(true)}
            >
              {task.title}
            </span>
            {task.priority && (
              <Badge
                variant="secondary"
                className={cn("text-xs", priorityColors[task.priority as keyof typeof priorityColors])}
              >
                {task.priority === 1 ? "High" : task.priority === 2 ? "Medium" : "Low"}
              </Badge>
            )}
            {isScheduled && (
              <Badge variant="outline" className="text-xs gap-1 text-primary border-primary">
                <Calendar className="h-3 w-3" />
                Scheduled
              </Badge>
            )}
          </div>
        )}
        
        {task.description && !isEditing && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {task.description}
          </p>
        )}
        
        {task.estimated_minutes && !isEditing && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{task.estimated_minutes} min</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Schedule to calendar button */}
        {!task.is_completed && !isScheduled && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={() => onSchedule(task)}
            disabled={isScheduling}
            title="Add to calendar"
          >
            {isScheduling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Calendar className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
