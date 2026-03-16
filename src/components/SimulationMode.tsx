import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  RefreshCw,
  Zap,
  Brain,
  CheckCircle2,
  Skull
} from "lucide-react";
import { useWorkloadSimulation } from "@/hooks/useWorkloadSimulation";
import { cn } from "@/lib/utils";

interface SimulationModeProps {
  className?: string;
}

export function SimulationMode({ className }: SimulationModeProps) {
  const { loading, delayDays, setDelayDays, simulation, simulationData, fetchWorkloadData } = useWorkloadSimulation();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!hasLoaded) {
      fetchWorkloadData();
      setHasLoaded(true);
    }
  }, [fetchWorkloadData, hasLoaded]);

  if (loading && !simulation) {
    return (
      <Card className={cn("animate-pulse h-full", className)}>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!simulation || !simulationData) {
    return (
      <Card className={cn("h-full bg-gradient-to-br from-card to-muted/20", className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Future Self Simulator
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-[200px]">
          <CoffeeBreakState />
        </CardContent>
      </Card>
    );
  }

  // Calculate "Panic Level" based on daily required hours
  // Assuming > 6 hours/day is panic mode
  const dailyHours = simulation.dailyRequiredHours;
  const panicLevel = Math.min(100, (dailyHours / 8) * 100);

  const getStressLevel = (hours: number) => {
    if (hours < 2) return { label: "Chill Mode", color: "text-emerald-500", icon: CheckCircle2 };
    if (hours < 4) return { label: "Balanced", color: "text-blue-500", icon: Brain };
    if (hours < 6) return { label: "Heavy Grind", color: "text-orange-500", icon: Zap };
    return { label: "Burnout Risk", color: "text-rose-600", icon: Skull };
  };

  const stressInfo = getStressLevel(dailyHours);
  const StressIcon = stressInfo.icon;

  return (
    <Card className={cn("overflow-hidden bg-gradient-to-br from-card to-muted/10 border-border/50 h-full flex flex-col", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Procrastination Simulator
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-50 hover:opacity-100"
            onClick={fetchWorkloadData}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 flex-1 flex flex-col justify-between">

        {/* Interactive Slider Section */}
        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">If I wait...</span>
            <Badge variant={delayDays === 0 ? "outline" : "secondary"} className="text-sm font-bold px-3">
              {delayDays === 0 ? "I Start Now" : `${delayDays} Days`}
            </Badge>
          </div>

          <div className="relative pt-2 pb-1">
            <Slider
              defaultValue={[0]}
              value={[delayDays]}
              onValueChange={([value]) => setDelayDays(value)}
              max={7}
              step={1}
              className="cursor-pointer"
            />
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
              <span>Today</span>
              <span>Next Week</span>
            </div>
          </div>
        </div>

        {/* Impact Visualization */}
        <div className="bg-background/50 border border-border/50 rounded-xl p-4 relative overflow-hidden group">
          <div className={`absolute top-0 left-0 w-1 h-full ${stressInfo.color.replace('text-', 'bg-')}`} />

          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Daily Workload</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-3xl font-black ${stressInfo.color}`}>
                  {dailyHours.toFixed(1)}h
                </span>
                <span className="text-sm text-muted-foreground">/ day</span>
              </div>
            </div>
            <div className={`flex flex-col items-end ${stressInfo.color}`}>
              <StressIcon className="w-8 h-8 mb-1 opacity-80" />
              <span className="text-xs font-bold uppercase">{stressInfo.label}</span>
            </div>
          </div>

          {/* Contextual Impact Message */}
          <div className="mt-3 pt-3 border-t border-border/30">
            <AnimatePresence mode="wait">
              <motion.div
                key={delayDays}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm font-medium leading-relaxed"
              >
                {delayDays === 0 ? (
                  <span className="text-emerald-500 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    You're saving your future self from stress. Great choice!
                  </span>
                ) : (
                  <span className={dailyHours > 4 ? "text-rose-500" : "text-orange-500"}>
                    Waiting {delayDays} days adds <span className="font-bold underline">{(delayDays * 0.5).toFixed(1)}h</span> to every future day's load.
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Stress Meter Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Stress Meter</span>
            <span>{Math.round(panicLevel)}%</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                panicLevel < 30 ? "bg-emerald-500" :
                  panicLevel < 60 ? "bg-blue-500" :
                    panicLevel < 80 ? "bg-orange-500" : "bg-rose-600"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${panicLevel}%` }}
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

function CoffeeBreakState() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
        <Clock className="w-6 h-6" />
      </div>
      <div>
        <p className="font-semibold">All Caught Up!</p>
        <p className="text-sm text-muted-foreground">No pending tasks to simulate.</p>
      </div>
    </div>
  )
}
