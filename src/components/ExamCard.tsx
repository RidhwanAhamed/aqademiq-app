import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Award, BookOpen, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { GradeDialog } from "@/components/GradeDialog";

interface ExamCardProps {
  exam: any;
  course?: any;
  onDelete?: (id: string) => void;
  onGradeUpdated?: () => void;
}

export function ExamCard({ exam, course, onDelete, onGradeUpdated }: ExamCardProps) {
  const [showGradeDialog, setShowGradeDialog] = useState(false);

  const isUpcoming = new Date(exam.exam_date) > new Date();
  const daysDiff = Math.ceil((new Date(exam.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const getUrgencyColor = () => {
    if (daysDiff <= 1) return "bg-red-500";
    if (daysDiff <= 3) return "bg-orange-500";
    if (daysDiff <= 7) return "bg-yellow-500";
    return course?.color || "bg-blue-500";
  };

  return (
    <>
      <Card className={cn(
        "bg-gradient-card transition-all duration-200 hover:shadow-lg",
        !isUpcoming && "opacity-75"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div 
                className={cn("w-3 h-3 rounded-full", getUrgencyColor())}
                style={{ backgroundColor: course?.color }}
              />
              <div>
                <CardTitle className="text-lg">{exam.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {course?.name || "Unknown Course"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={isUpcoming ? "default" : "secondary"}>
                {exam.exam_type || "Exam"}
              </Badge>
              {exam.grade_received && (
                <Badge variant="outline" className="text-success border-success">
                  {exam.grade_received}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{format(new Date(exam.exam_date), "EEEE, MMMM d, yyyy")}</span>
              <span className="text-muted-foreground">at</span>
              <span>{format(new Date(exam.exam_date), "h:mm a")}</span>
            </div>

            {exam.duration_minutes && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{exam.duration_minutes} minutes</span>
              </div>
            )}

            {exam.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{exam.location}</span>
              </div>
            )}

            {isUpcoming && (
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span>
                  {daysDiff === 0 ? "Today" : 
                   daysDiff === 1 ? "Tomorrow" : 
                   `${daysDiff} days away`}
                </span>
              </div>
            )}
          </div>

          {exam.notes && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">{exam.notes}</p>
            </div>
          )}

          {exam.study_hours_planned && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Study Hours Planned:</span>
              <span>{exam.study_hours_planned}h</span>
            </div>
          )}

          {exam.study_hours_completed && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Study Hours Completed:</span>
              <span className="text-success">{exam.study_hours_completed}h</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              {exam.grade_points && exam.grade_total ? 
                `Grade: ${exam.grade_points}/${exam.grade_total} (${((exam.grade_points / exam.grade_total) * 100).toFixed(1)}%)` :
                "No grade recorded"
              }
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGradeDialog(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Award className="w-4 h-4" />
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(exam.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <GradeDialog
        open={showGradeDialog}
        onOpenChange={setShowGradeDialog}
        item={exam}
        type="exam"
        onGradeUpdated={onGradeUpdated || (() => window.location.reload())}
      />
    </>
  );
}