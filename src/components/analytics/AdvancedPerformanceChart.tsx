import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Target, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PerformanceMetric {
  id: string;
  course_id: string;
  metric_type: string;
  metric_value: number;
  time_period: string;
  calculation_date: string;
  metadata: any;
}

interface AdvancedPerformanceChartProps {
  metrics: PerformanceMetric[];
  courses: Array<{ id: string; name: string; color: string }>;
}

export function AdvancedPerformanceChart({ metrics, courses }: AdvancedPerformanceChartProps) {
  // Transform metrics for chart display
  const chartData = metrics
    .filter(m => m.metric_type === 'grade_trend')
    .map(metric => {
      const course = courses.find(c => c.id === metric.course_id);
      return {
        date: metric.calculation_date,
        value: metric.metric_value,
        course: course?.name || 'Unknown',
        color: course?.color || 'blue'
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const studyEfficiencyData = metrics
    .filter(m => m.metric_type === 'study_efficiency')
    .map(metric => {
      const course = courses.find(c => c.id === metric.course_id);
      return {
        course: course?.name || 'Unknown',
        efficiency: metric.metric_value,
        color: course?.color || 'blue'
      };
    });

  const deadlineAdherenceData = metrics
    .filter(m => m.metric_type === 'deadline_adherence')
    .map(metric => {
      const course = courses.find(c => c.id === metric.course_id);
      return {
        course: course?.name || 'Unknown',
        adherence: metric.metric_value,
        color: course?.color || 'blue'
      };
    });

  const getPerformanceIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-success" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Target className="w-4 h-4 text-muted-foreground" />;
  };

  const getPerformanceBadge = (value: number) => {
    if (value > 75) return <Badge variant="default" className="bg-success text-success-foreground">Excellent</Badge>;
    if (value > 50) return <Badge variant="secondary">Good</Badge>;
    if (value > 25) return <Badge variant="outline">Fair</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  return (
    <div className="grid gap-6">
      {/* Grade Trends Chart */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Grade Trends Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.1)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Study Efficiency */}
        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Study Efficiency by Course
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studyEfficiencyData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `hsl(var(--${item.color}))` }}
                    />
                    <span className="font-medium">{item.course}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPerformanceIcon(item.efficiency)}
                    <span className="text-sm font-mono">
                      {item.efficiency.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Deadline Adherence */}
        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Deadline Adherence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deadlineAdherenceData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `hsl(var(--${item.color}))` }}
                    />
                    <span className="font-medium">{item.course}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPerformanceBadge(item.adherence)}
                    <span className="text-sm font-mono">
                      {item.adherence.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}