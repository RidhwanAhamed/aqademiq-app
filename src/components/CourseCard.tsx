import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock } from "lucide-react";

interface Course {
  id: string;
  name: string;
  color: string;
  progress: number;
  tasks: number;
}

interface CourseCardProps {
  course: Course;
}

const courseColorMap = {
  math: "bg-course-math",
  science: "bg-course-science", 
  english: "bg-course-english",
  history: "bg-course-history",
  language: "bg-course-language",
  art: "bg-course-art",
};

export function CourseCard({ course }: CourseCardProps) {
  const colorClass = courseColorMap[course.color as keyof typeof courseColorMap] || "bg-primary";

  return (
    <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${colorClass}`} />
            <div>
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                {course.name}
              </h3>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="w-3 h-3" />
                  {course.tasks} tasks
                </div>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {course.progress}%
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{course.progress}%</span>
          </div>
          <Progress 
            value={course.progress} 
            className="h-2 bg-muted"
          />
        </div>
      </CardContent>
    </Card>
  );
}