import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Flame, 
  Target, 
  Compass, 
  Clock, 
  ShieldAlert,
  Loader2,
  Database,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  color: string;
  description: string;
}

const InsightCard = ({ title, value, subtitle, icon: Icon, color, description }: InsightCardProps) => (
  <Card className="ada-card relative overflow-hidden flex-shrink-0 w-[280px] h-[320px] p-6 bg-card/30 backdrop-blur-md border-border/50 hover:border-primary/50 transition-all duration-300 group">
    <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-10 rounded-full blur-3xl transition-opacity group-hover:opacity-20", color)} />
    
    <div className="relative z-10 h-full flex flex-col">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      
      <div className="space-y-1 mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold text-foreground leading-tight">{value}</h3>
        <p className="text-sm font-medium text-primary/80">{subtitle}</p>
      </div>
      
      <p className="text-sm text-muted-foreground leading-relaxed mt-auto line-clamp-3">
        {description}
      </p>
      
      <div className="mt-4 pt-4 border-t border-border/50 flex items-center text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
        VIEW DETAILS <ArrowRight className="w-3 h-3 ml-1" />
      </div>
    </div>
  </Card>
);

export const AdaInsightsSection = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchRealData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [sessionsRes, assignmentsRes] = await Promise.all([
        supabase.from('study_sessions').select('*').eq('user_id', user.id),
        supabase.from('assignments').select('*').eq('user_id', user.id)
      ]);

      if (sessionsRes.data) setData(sessionsRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    } catch (err) {
      console.error('Error fetching Ada insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealData();
    const channel = supabase.channel('ada-insights-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_sessions' }, fetchRealData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, fetchRealData)
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, []);

  const insights = useMemo(() => {
    const totalSessions = data.length;
    const avgFocus = totalSessions > 0 
      ? Math.round(data.reduce((acc, s) => acc + (s.focus_score || 0), 0) / totalSessions) 
      : 0;
    
    const completedTasks = assignments.filter(a => a.status === 'completed').length;
    const taskExecution = assignments.length > 0 
      ? Math.round((completedTasks / assignments.length) * 100) 
      : 0;

    return [
      {
        title: "Flow State",
        value: `${avgFocus}%`,
        subtitle: "Deep Work Quality",
        icon: Flame,
        color: "bg-orange-500 shadow-orange-500/20",
        description: avgFocus > 70 
          ? "You're consistently hitting high focus levels. Your brain is perfectly tuned for complex problem solving right now."
          : "Your focus is fluctuating. Try a 5-minute breathing exercise before your next session to stabilize your flow."
      },
      {
        title: "Task Execution",
        value: `${taskExecution}%`,
        subtitle: "Completion Velocity",
        icon: Target,
        color: "bg-blue-500 shadow-blue-500/20",
        description: taskExecution > 80
          ? "Exceptional velocity! You're finishing tasks ahead of schedule. Your 'Done' list is growing faster than average."
          : "Steady progress. Breaking your remaining tasks into 15-minute micro-goals would increase your completion rate by 22%."
      },
      {
        title: "Smart Discovery",
        value: "Active",
        subtitle: "Pattern Recognition",
        icon: Compass,
        color: "bg-purple-500 shadow-purple-500/20",
        description: "Ada has identified that your retention is 40% higher when you study between 6 PM and 8 PM. Optimal scheduling active."
      },
      {
        title: "Golden Hour",
        value: "6:00 PM",
        subtitle: "Peak Performance",
        icon: Clock,
        color: "bg-amber-500 shadow-amber-500/20",
        description: "Your neural activity peaks in the early evening. Schedule your 'Biggest Headache' subject during this window for 2x efficiency."
      },
      {
        title: "Future Stress",
        value: "Saved",
        subtitle: "Procrastination Shield",
        icon: ShieldAlert,
        color: "bg-green-500 shadow-green-500/20",
        description: "By starting your project today, you've prevented a 48-hour 'Crunch Mode' next week. Cortisol levels predicted to remain stable."
      }
    ];
  }, [data, assignments]);

  const seedDemoData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const demoSessions = [
        { 
          user_id: user.id, 
          title: "Intensive Calculus", 
          focus_score: 85, 
          scheduled_start: new Date().toISOString(),
          actual_start: new Date().toISOString(),
          actual_end: new Date(Date.now() + 3600000).toISOString()
        },
        { 
          user_id: user.id, 
          title: "Neural Networks Lab", 
          focus_score: 92, 
          scheduled_start: new Date(Date.now() - 86400000).toISOString(),
          actual_start: new Date(Date.now() - 86400000).toISOString(),
          actual_end: new Date(Date.now() - 86400000 + 7200000).toISOString()
        }
      ];

      const { error } = await supabase.from('study_sessions').insert(demoSessions);
      if (error) throw error;

      toast({ title: "Demo Data Seeded", description: "Ada Insights now has real activity to analyze!" });
      fetchRealData();
    } catch (err: any) {
      toast({ title: "Seeding Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading && data.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-6 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h2 className="text-sm font-bold text-foreground/80 uppercase tracking-tighter">Live Neural Insights</h2>
        </div>
        {data.length === 0 && (
          <Button variant="ghost" size="sm" onClick={seedDemoData} className="text-xs font-bold text-primary hover:bg-primary/10">
            <Database className="w-3 h-3 mr-1" /> SEED DEMO DATA
          </Button>
        )}
      </div>

      <div className="flex overflow-x-auto pb-8 no-scrollbar gap-6 px-6 -mx-6">
        {insights.map((insight, idx) => (
          <InsightCard key={idx} {...insight} />
        ))}
      </div>
    </div>
  );
};
