import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GradeData } from "@/hooks/useUserStats";

interface GradeChartProps {
  data: GradeData[];
}

export function GradeChart({ data }: GradeChartProps) {
  // Group grades by course and calculate averages
  const courseGrades = data.reduce((acc, grade) => {
    if (!acc[grade.course]) {
      acc[grade.course] = [];
    }
    acc[grade.course].push(grade.grade);
    return acc;
  }, {} as { [key: string]: number[] });

  const chartData = Object.entries(courseGrades).map(([course, grades]) => {
    const average = grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
    return {
      course: course.length > 12 ? course.substring(0, 12) + '...' : course,
      fullCourse: course,
      average: Math.round(average * 100) / 100,
      count: grades.length
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-3 border border-border rounded-lg shadow-lg">
          <p className="text-sm font-medium">{data.fullCourse}</p>
          <p className="text-sm text-primary">
            Average: {payload[0].value}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.count} grade{data.count !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <CardTitle>Grade Distribution by Course</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No grades recorded yet</p>
            <p className="text-sm">Add grades to assignments and exams to see your progress</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="course" 
                className="text-sm"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                label={{ value: 'Grade', angle: -90, position: 'insideLeft' }}
                className="text-sm"
                domain={[0, 10]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="average" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}