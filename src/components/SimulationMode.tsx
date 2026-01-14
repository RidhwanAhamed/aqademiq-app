import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, Clock, Calendar, RefreshCw } from "lucide-react";
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
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!simulation || !simulationData) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No pending tasks to simulate</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusColors = {
    green: "from-green-500 to-emerald-500",
    yellow: "from-amber-500 to-yellow-500",
    red: "from-red-500 to-rose-500",
  };

  const statusBg = {
    green: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
    yellow: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    red: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Workload Capacity
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={fetchWorkloadData}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Capacity Bar */}
        <div className="relative">
          <div className="h-8 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full bg-gradient-to-r",
                statusColors[simulation.status]
              )}
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100, (simulation.totalTaskHours / (simulation.availableFreeHours || 1)) * 100)}%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-white drop-shadow-md">
              {simulation.totalTaskHours.toFixed(1)}h / {simulation.availableFreeHours.toFixed(1)}h
            </span>
          </div>
        </div>

        {/* Status Indicator */}
        <div className={cn("rounded-lg border p-3", statusBg[simulation.status])}>
          <div className="flex items-start gap-3">
            {simulation.status === "red" ? (
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            ) : simulation.status === "yellow" ? (
              <TrendingDown className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            ) : (
              <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-medium">{simulation.warningMessage}</p>
              {simulation.status !== "green" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Daily study needed: {simulation.dailyRequiredHours.toFixed(1)} hours
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Delay Simulator */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Simulate Delay</span>
            <Badge variant="outline">
              {delayDays === 0 ? "No delay" : `+${delayDays} day${delayDays > 1 ? "s" : ""}`}
            </Badge>
          </div>
          
          <Slider
            value={[delayDays]}
            onValueChange={([value]) => setDelayDays(value)}
            max={7}
            step={1}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Today</span>
            <span>+7 days</span>
          </div>
        </div>

        {/* Task Summary */}
        {simulationData.assignments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Upcoming Tasks ({simulationData.assignments.length})
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {simulationData.assignments.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 mr-2">{a.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {a.hours}h
                  </Badge>
                </div>
              ))}
              {simulationData.assignments.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  +{simulationData.assignments.length - 5} more tasks
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for dashboard
export function PanicButton({ onClick }: { onClick?: () => void }) {
  const { simulation, fetchWorkloadData } = useWorkloadSimulation();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!hasLoaded) {
      fetchWorkloadData();
      setHasLoaded(true);
    }
  }, [fetchWorkloadData, hasLoaded]);

  const statusColors = {
    green: "bg-green-500",
    yellow: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="gap-2"
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          simulation ? statusColors[simulation.status] : "bg-muted"
        )}
      />
      Capacity Check
    </Button>
  );
}
