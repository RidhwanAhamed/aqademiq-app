import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/config/supabaseClient";
import { useEffect, useState } from "react";

interface GPAData {
  currentGPA: number | null;
  targetGPA: number;
  progress: number;
  trend: 'up' | 'down' | 'stable';
  coursesWithGrades: number;
  totalCourses: number;
}

export function GPACard() {
  const { user } = useAuth();
  const [gpaData, setGpaData] = useState<GPAData>({
    currentGPA: null,
    targetGPA: 8.0,
    progress: 0,
    trend: 'stable',
    coursesWithGrades: 0,
    totalCourses: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchGPAData();
    }
  }, [user]);

  const fetchGPAData = async () => {
    if (!user) return;

    try {
      // Get current GPA using the database function
      const { data: gpaResult, error: gpaError } = await supabase
        .rpc('calculate_user_gpa', { p_user_id: user.id });

      if (gpaError) throw gpaError;

      // Get course statistics
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, current_gpa, target_grade')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (coursesError) throw coursesError;

      const totalCourses = courses?.length || 0;
      const coursesWithGrades = courses?.filter(c => c.current_gpa !== null).length || 0;
      
      // Calculate average target GPA
      const targetGrades = courses?.map(c => c.target_grade).filter(Boolean) || [];
      const avgTarget = targetGrades.length > 0 
        ? targetGrades.reduce((sum, grade) => {
            const numGrade = gradeToNumber(grade);
            return sum + numGrade;
          }, 0) / targetGrades.length
        : 8.0;

      const currentGPA = gpaResult;
      const progress = currentGPA ? (currentGPA / avgTarget) * 100 : 0;

      setGpaData({
        currentGPA,
        targetGPA: avgTarget,
        progress: Math.min(progress, 100),
        trend: 'stable',
        coursesWithGrades,
        totalCourses
      });

    } catch (error) {
      console.error('Error fetching GPA data:', error);
    } finally {
      setLoading(false);
    }
  };

  const gradeToNumber = (grade: string): number => {
    const gradeMap: { [key: string]: number } = {
      'A+': 10, 'A': 9, 'A-': 8.5,
      'B+': 8, 'B': 7, 'B-': 6.5,
      'C+': 6, 'C': 5, 'C-': 4.5,
      'D+': 4, 'D': 3, 'F': 0
    };
    return gradeMap[grade] || 8.0;
  };

  const getGPAColor = (gpa: number) => {
    if (gpa >= 8.5) return "text-green-600";
    if (gpa >= 7.0) return "text-blue-600";
    if (gpa >= 6.0) return "text-yellow-600";
    return "text-red-600";
  };

  const getGPALabel = (gpa: number) => {
    if (gpa >= 9.0) return "Excellent";
    if (gpa >= 8.0) return "Very Good";
    if (gpa >= 7.0) return "Good";
    if (gpa >= 6.0) return "Satisfactory";
    return "Needs Improvement";
  };

  const TrendIcon = () => {
    switch (gpaData.trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Current GPA
          </div>
          <TrendIcon />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`text-3xl font-bold ${gpaData.currentGPA ? getGPAColor(gpaData.currentGPA) : 'text-muted-foreground'}`}>
            {gpaData.currentGPA ? gpaData.currentGPA.toFixed(2) : '--'}
          </div>
          <div className="text-sm text-muted-foreground">
            {gpaData.currentGPA ? getGPALabel(gpaData.currentGPA) : 'No grades yet'}
          </div>
        </div>

        {gpaData.currentGPA && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to target ({gpaData.targetGPA.toFixed(1)})</span>
                <span>{gpaData.progress.toFixed(0)}%</span>
              </div>
              <Progress 
                value={gpaData.progress} 
                className="h-2" 
              />
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                Courses with grades: {gpaData.coursesWithGrades}/{gpaData.totalCourses}
              </span>
              <Badge variant={gpaData.currentGPA >= gpaData.targetGPA ? "default" : "secondary"}>
                {gpaData.currentGPA >= gpaData.targetGPA ? "On Track" : "Below Target"}
              </Badge>
            </div>
          </>
        )}

        {!gpaData.currentGPA && (
          <div className="text-center text-sm text-muted-foreground">
            Add grades to assignments and exams to track your GPA
          </div>
        )}
      </CardContent>
    </Card>
  );
}