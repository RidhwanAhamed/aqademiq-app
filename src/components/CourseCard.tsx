import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, BookOpen, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Course } from "@/hooks/useCourses";
import { CourseDetails } from "@/components/CourseDetails";
import { useState } from "react";

const colorVariants = {
  blue: "bg-blue-500",
  red: "bg-red-500", 
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  indigo: "bg-indigo-500",
  teal: "bg-teal-500",
};

interface CourseCardProps {
  course: Course;
  onEdit?: (course: Course) => void;
  onDelete?: (courseId: string) => void;
  onClick?: () => void;
  onNeedAIInsights?: (context: string, data: any) => void;
}

export function CourseCard({ course, onEdit, onDelete, onClick, onNeedAIInsights }: CourseCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const colorClass = colorVariants[course.color as keyof typeof colorVariants] || colorVariants.blue;

  return (
    <>
      <Card 
        className="bg-gradient-card shadow-card hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => onClick ? onClick() : setShowDetails(true)}
      >
        <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center`}>
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{course.name}</h3>
              {course.code && (
                <p className="text-sm text-muted-foreground">{course.code}</p>
              )}
            </div>
          </div>
          
          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}>
                  View Details
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(course); }}>
                    Edit Course
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDelete(course.id); }}
                    className="text-destructive"
                  >
                    Delete Course
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm font-medium">{course.progress_percentage}%</span>
          </div>
          <Progress value={course.progress_percentage} className="h-2" />
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Credits: {course.credits}</span>
            <div className="flex items-center gap-2">
              {course.target_grade && (
                <Badge variant="outline">Target: {course.target_grade}</Badge>
              )}
              {onNeedAIInsights && (course.progress_percentage < 50 || (course.current_gpa && course.current_gpa < 2.5)) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNeedAIInsights('course_improvement', {
                      course,
                      isLowPerformance: course.current_gpa && course.current_gpa < 2.5,
                      isLowProgress: course.progress_percentage < 50,
                      currentGpa: course.current_gpa,
                      progress: course.progress_percentage
                    });
                  }}
                  className="text-xs h-6 px-2"
                >
                  <Brain className="w-3 h-3 mr-1" />
                  Help
                </Button>
              )}
            </div>
          </div>
          
          {course.instructor && (
            <p className="text-xs text-muted-foreground">{course.instructor}</p>
          )}
        </div>
      </CardContent>
    </Card>

    <CourseDetails
      course={course}
      open={showDetails}
      onOpenChange={setShowDetails}
      onEdit={onEdit ? () => onEdit(course) : undefined}
    />
  </>
  );
}