import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StudyTimeData } from "@/hooks/useUserStats";

interface StudyTimeChartProps {
  data: StudyTimeData[];
}

export function StudyTimeChart({ data }: StudyTimeChartProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 border border-border rounded-lg shadow-lg">
          <p className="text-sm font-medium">{formatDate(label)}</p>
          <p className="text-sm text-primary">
            Hours: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Study Time Trends
          <span className="text-sm font-normal text-muted-foreground">
            (Last 30 days)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No study sessions recorded yet</p>
            <p className="text-sm">Start a study session to see your progress</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                className="text-sm"
              />
              <YAxis 
                label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                className="text-sm"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="hours" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}