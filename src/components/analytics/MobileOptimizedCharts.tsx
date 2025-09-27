import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  MoreVertical,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileOptimizedChartsProps {
  gradeForecasts: any[];
  performanceMetrics: any[];
  studyAnalytics: any[];
  courses: any[];
  onNeedAIInsights?: (context: string, data: any) => void;
}

export function MobileOptimizedCharts({
  gradeForecasts,
  performanceMetrics,
  studyAnalytics,
  courses,
  onNeedAIInsights
}: MobileOptimizedChartsProps) {
  const [selectedChart, setSelectedChart] = useState<'grades' | 'performance' | 'study'>('grades');
  const [fullScreenChart, setFullScreenChart] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Mobile-optimized data preparation
  const gradeData = gradeForecasts.slice(0, 6).map(forecast => ({
    course: forecast.course_name.length > 12 ? forecast.course_name.substring(0, 12) + '...' : forecast.course_name,
    current: forecast.current_average,
    projected: forecast.projected_30_days,
    trend: forecast.trend_direction
  }));

  const performanceData = performanceMetrics
    .filter(m => m.metric_type === 'overall_grade')
    .slice(-8)
    .map(metric => ({
      date: new Date(metric.calculation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: metric.metric_value,
      target: 8.0
    }));

  const studyData = studyAnalytics
    .slice(-7)
    .map(session => ({
      day: new Date(session.session_date).toLocaleDateString('en-US', { weekday: 'short' }),
      minutes: session.effective_study_minutes || 0,
      productivity: session.productivity_score || 0
    }));

  // Touch handlers for mobile swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) { // Minimum swipe distance
      if (diff > 0) {
        // Swipe left - next chart
        navigateChart('next');
      } else {
        // Swipe right - previous chart
        navigateChart('prev');
      }
    }
    
    setTouchStart(null);
  };

  const navigateChart = (direction: 'next' | 'prev') => {
    const charts = ['grades', 'performance', 'study'] as const;
    const currentIndex = charts.indexOf(selectedChart);
    
    if (direction === 'next') {
      setSelectedChart(charts[(currentIndex + 1) % charts.length]);
    } else {
      setSelectedChart(charts[(currentIndex - 1 + charts.length) % charts.length]);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 border border-border rounded-lg shadow-lg text-xs">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-2">
              <span style={{ color: entry.color }}>{entry.dataKey}:</span>
              <span className="font-medium">{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const chartConfigs = {
    grades: {
      title: "Grade Trends",
      icon: TrendingUp,
      data: gradeData,
      chart: (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={gradeData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="course" 
              className="text-xs"
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 11 }}
              domain={[0, 10]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="current" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            <Bar dataKey="projected" fill="hsl(var(--primary-foreground))" opacity={0.6} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
      insights: `${gradeData.filter(d => d.trend === 'improving').length} improving, ${gradeData.filter(d => d.trend === 'declining').length} declining`
    },
    performance: {
      title: "Performance Over Time",
      icon: TrendingUp,
      data: performanceData,
      chart: (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fontSize: 11 }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 11 }}
              domain={[0, 10]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="hsl(var(--destructive))"
              strokeDasharray="2 2"
            />
          </AreaChart>
        </ResponsiveContainer>
      ),
      insights: `Current: ${performanceData[performanceData.length - 1]?.value.toFixed(1) || 'N/A'}/10`
    },
    study: {
      title: "Study Patterns",
      icon: RotateCcw,
      data: studyData,
      chart: (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={studyData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="day" 
              className="text-xs"
              tick={{ fontSize: 11 }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="minutes"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ),
      insights: `Avg: ${Math.round(studyData.reduce((sum, d) => sum + d.minutes, 0) / studyData.length)}min/day`
    }
  };

  const currentConfig = chartConfigs[selectedChart];

  return (
    <Card className="bg-gradient-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Analytics Overview</CardTitle>
            <Badge variant="outline" className="text-xs">
              Mobile Optimized
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNeedAIInsights?.('mobile_insights', {
                selectedChart,
                data: currentConfig.data
              })}
              className="h-8 px-2"
            >
              <Brain className="w-4 h-4 mr-1" />
              AI
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle>{currentConfig.title}</SheetTitle>
                  <SheetDescription>
                    Detailed view with full interactivity
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <ResponsiveContainer width="100%" height={400}>
                    {currentConfig.chart}
                  </ResponsiveContainer>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Chart Navigation */}
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigateChart('prev')}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            {(['grades', 'performance', 'study'] as const).map((chart, index) => (
              <button
                key={chart}
                className={`w-2 h-2 rounded-full transition-colors ${
                  selectedChart === chart ? 'bg-primary' : 'bg-muted'
                }`}
                onClick={() => setSelectedChart(chart)}
              />
            ))}
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigateChart('next')}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent 
        className="pb-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="space-y-4">
          {/* Chart Display */}
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <currentConfig.icon className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">{currentConfig.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {currentConfig.insights}
              </span>
            </div>
            
            {currentConfig.chart}
          </div>

          {/* Quick Actions - Mobile Friendly */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNeedAIInsights?.(`${selectedChart}_analysis`, currentConfig.data)}
              className="text-xs h-8"
            >
              <Brain className="w-3 h-3 mr-1" />
              Analyze
            </Button>
            <Button
              size="sm" 
              variant="outline"
              onClick={() => onNeedAIInsights?.(`${selectedChart}_improve`, currentConfig.data)}
              className="text-xs h-8"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Improve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNeedAIInsights?.(`${selectedChart}_predict`, currentConfig.data)}
              className="text-xs h-8"
            >
              <TrendingDown className="w-3 h-3 mr-1" />
              Predict
            </Button>
          </div>

          {/* Swipe Instruction */}
          <p className="text-center text-xs text-muted-foreground pt-2">
            ← Swipe to navigate between charts →
          </p>
        </div>
      </CardContent>
    </Card>
  );
}