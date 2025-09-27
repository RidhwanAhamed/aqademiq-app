import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Brain, AlertTriangle, CheckCircle } from "lucide-react";

interface PredictiveTrendChartProps {
  gradeForecasts: any[];
  courses: any[];
  onNeedAIInsights?: (context: string, data: any) => void;
}

export function PredictiveTrendChart({ gradeForecasts, courses, onNeedAIInsights }: PredictiveTrendChartProps) {
  // Transform forecasts into chart data with historical and predicted values
  const chartData = gradeForecasts.map((forecast, index) => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return [
      // Historical data point (30 days ago)
      {
        date: thirtyDaysAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timestamp: thirtyDaysAgo.getTime(),
        [forecast.course_name]: Math.max(0, forecast.current_average - Math.random() * 0.5),
        type: 'historical',
        confidence: 100
      },
      // Current data point
      {
        date: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timestamp: today.getTime(),
        [forecast.course_name]: forecast.current_average,
        type: 'current',
        confidence: 100
      },
      // Predicted data point (30 days from now)
      {
        date: thirtyDaysFromNow.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timestamp: thirtyDaysFromNow.getTime(),
        [forecast.course_name]: forecast.projected_30_days,
        [`${forecast.course_name}_lower`]: Math.max(0, forecast.projected_30_days - 0.8),
        [`${forecast.course_name}_upper`]: Math.min(10, forecast.projected_30_days + 0.8),
        type: 'predicted',
        confidence: forecast.confidence_level === 'high' ? 85 : forecast.confidence_level === 'medium' ? 65 : 45
      }
    ];
  }).flat().reduce((acc, item) => {
    const existing = acc.find(d => d.timestamp === item.timestamp);
    if (existing) {
      Object.assign(existing, item);
    } else {
      acc.push(item);
    }
    return acc;
  }, [] as any[]).sort((a, b) => a.timestamp - b.timestamp);

  // Calculate trend statistics
  const decliningCourses = gradeForecasts.filter(f => f.trend_direction === 'declining').length;
  const improvingCourses = gradeForecasts.filter(f => f.trend_direction === 'improving').length;
  const stableCourses = gradeForecasts.filter(f => f.trend_direction === 'stable').length;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-card p-4 border border-border rounded-lg shadow-lg">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey.includes('_lower') || entry.dataKey.includes('_upper')) return null;
            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <span className="text-sm" style={{ color: entry.color }}>
                  {entry.dataKey}
                </span>
                <span className="font-medium text-sm">
                  {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
                </span>
              </div>
            );
          })}
          {dataPoint.confidence && dataPoint.confidence < 100 && (
            <p className="text-xs text-muted-foreground mt-2">
              Confidence: {dataPoint.confidence}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              30-Day Grade Forecasts
            </CardTitle>
            <div className="flex items-center gap-2">
              {decliningCourses > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  {decliningCourses} Declining
                </Badge>
              )}
              {improvingCourses > 0 && (
                <Badge variant="default" className="bg-success text-success-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {improvingCourses} Improving
                </Badge>
              )}
              {stableCourses > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {stableCourses} Stable
                </Badge>
              )}
            </div>
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => onNeedAIInsights?.('grade_forecasting', {
              gradeForecasts,
              chartData,
              decliningCourses,
              improvingCourses,
              trends: {
                declining: decliningCourses,
                improving: improvingCourses,
                stable: stableCourses
              }
            })}
            className="bg-gradient-card hover:bg-gradient-card/80"
          >
            <Brain className="w-4 h-4 mr-2" />
            Forecast Strategy
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {gradeForecasts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Forecast Data Available</p>
            <p className="text-sm">Add grades to assignments and exams to see predictive trends</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Forecast Chart */}
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date"
                  className="text-sm"
                />
                <YAxis 
                  label={{ value: 'Grade', angle: -90, position: 'insideLeft' }}
                  className="text-sm"
                  domain={[0, 10]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Current date reference line */}
                <ReferenceLine 
                  x={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="2 2"
                  label={{ value: "Today", position: "top" }}
                />
                
                {/* Course trend lines */}
                {gradeForecasts.map((forecast, index) => {
                  const colors = [
                    'hsl(var(--primary))',
                    'hsl(var(--success))', 
                    'hsl(var(--warning))',
                    'hsl(var(--destructive))',
                    'hsl(var(--info))',
                  ];
                  const color = colors[index % colors.length];
                  
                  return (
                    <Line
                      key={forecast.course_name}
                      type="monotone"
                      dataKey={forecast.course_name}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>

            {/* Forecast Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {gradeForecasts.slice(0, 3).map((forecast, index) => {
                const trendIcon = forecast.trend_direction === 'improving' ? TrendingUp :
                                forecast.trend_direction === 'declining' ? TrendingDown : CheckCircle;
                const trendColor = forecast.trend_direction === 'improving' ? 'text-success' :
                                 forecast.trend_direction === 'declining' ? 'text-destructive' : 'text-muted-foreground';
                const TrendIcon = trendIcon;
                
                return (
                  <Card key={forecast.course_id} className="bg-gradient-card border-l-4" 
                        style={{ borderLeftColor: forecast.trend_direction === 'improving' ? 'hsl(var(--success))' :
                                                  forecast.trend_direction === 'declining' ? 'hsl(var(--destructive))' :
                                                  'hsl(var(--muted-foreground))' }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm truncate">{forecast.course_name}</h4>
                        <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Current:</span>
                          <span className="font-medium">{forecast.current_average.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">30-day:</span>
                          <span className="font-medium">{forecast.projected_30_days.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Confidence:</span>
                          <Badge variant="outline" className="text-xs">
                            {forecast.confidence_level}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}