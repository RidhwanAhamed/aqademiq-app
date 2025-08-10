import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  BookOpen, 
  Brain, 
  FileText, 
  RotateCcw, 
  Clock, 
  Calendar,
  Target,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { useRevisionTasks } from "@/hooks/useRevisionTasks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const taskTypeIcons = {
  revision: BookOpen,
  practice: Brain,
  summary: FileText,
  review: RotateCcw,
};

const taskTypeColors = {
  revision: "text-blue-500",
  practice: "text-purple-500", 
  summary: "text-green-500",
  review: "text-orange-500",
};

export function RevisionTasksPanel() {
  const { revisionTasks, loading, toggleComplete, generateTasksForExam } = useRevisionTasks();
  const { toast } = useToast();
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    const { error } = await toggleComplete(taskId, completed);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  const handleGenerateTasks = async (examId: string) => {
    setGeneratingFor(examId);
    try {
      const { error } = await generateTasksForExam(examId);
      if (error) throw new Error(error);
      
      toast({
        title: "Revision tasks generated",
        description: "New revision tasks have been created for this exam.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to generate revision tasks",
        variant: "destructive",
      });
    } finally {
      setGeneratingFor(null);
    }
  };

  const upcomingTasks = revisionTasks.filter(task => !task.is_completed);
  const completedTasks = revisionTasks.filter(task => task.is_completed);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revision Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading revision tasks...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Revision Tasks
        </CardTitle>
        <CardDescription>
          Automated revision tasks generated from your exam schedule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {upcomingTasks.length === 0 && completedTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No revision tasks yet</p>
            <p className="text-sm">Link assignments to exams to automatically generate revision tasks</p>
          </div>
        ) : (
          <>
            {/* Upcoming Tasks */}
            {upcomingTasks.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Upcoming Tasks ({upcomingTasks.length})
                </h4>
                {upcomingTasks.map((task) => {
                  const IconComponent = taskTypeIcons[task.task_type];
                  const iconColor = taskTypeColors[task.task_type];
                  
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={task.is_completed}
                        onCheckedChange={(checked) => 
                          handleToggleComplete(task.id, checked as boolean)
                        }
                        className="mt-1"
                      />
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <IconComponent className={cn("w-4 h-4", iconColor)} />
                          <h5 className="font-medium">{task.title}</h5>
                          <Badge variant="outline" className="text-xs">
                            {task.task_type}
                          </Badge>
                        </div>
                        
                        {task.description && (
                          <p className="text-sm text-muted-foreground">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Due {format(new Date(task.due_date), "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.estimated_hours}h estimated
                          </div>
                          {task.exams && (
                            <div className="flex items-center gap-1">
                              <span>For: {task.exams.title}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Completed ({completedTasks.length})
                </h4>
                {completedTasks.slice(0, 5).map((task) => {
                  const IconComponent = taskTypeIcons[task.task_type];
                  
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 border rounded-lg opacity-60"
                    >
                      <Checkbox
                        checked={task.is_completed}
                        onCheckedChange={(checked) => 
                          handleToggleComplete(task.id, checked as boolean)
                        }
                        className="mt-1"
                      />
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 text-muted-foreground" />
                          <h5 className="font-medium line-through">{task.title}</h5>
                          <Badge variant="outline" className="text-xs">
                            Completed
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Completed {format(new Date(task.due_date), "MMM d")}
                          </div>
                          {task.exams && (
                            <span>For: {task.exams.title}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {completedTasks.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    And {completedTasks.length - 5} more completed tasks...
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}