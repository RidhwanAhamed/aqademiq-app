import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Clock, AlertTriangle, Zap } from "lucide-react";
import { useSmartNudges, SmartNudge as SmartNudgeType } from "@/hooks/useSmartNudges";
import { useSubtasks } from "@/hooks/useSubtasks";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SmartNudgeProps {
  className?: string;
}

export function SmartNudge({ className }: SmartNudgeProps) {
  const { currentNudge, dismissNudge, snoozeNudge } = useSmartNudges();
  const navigate = useNavigate();

  if (!currentNudge) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className={cn(
          "fixed bottom-20 right-4 z-50 max-w-sm",
          "md:bottom-6 md:right-6",
          className
        )}
      >
        <NudgeCard
          nudge={currentNudge}
          onDismiss={() => dismissNudge(currentNudge.assignment_id, "dismissed")}
          onSnooze={() => snoozeNudge(currentNudge.assignment_id, 60)}
          onAction={() => {
            if (currentNudge.action_type === "breakdown") {
              // Trigger breakdown - handled by parent
              dismissNudge(currentNudge.assignment_id, "breakdown");
            } else if (currentNudge.action_type === "do_now") {
              navigate("/timer", { state: { assignmentId: currentNudge.assignment_id } });
              dismissNudge(currentNudge.assignment_id, "started");
            }
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

interface NudgeCardProps {
  nudge: SmartNudgeType;
  onDismiss: () => void;
  onSnooze: () => void;
  onAction: () => void;
}

function NudgeCard({ nudge, onDismiss, onSnooze, onAction }: NudgeCardProps) {
  const getIcon = () => {
    switch (nudge.type) {
      case "skip_warning":
        return <Sparkles className="h-5 w-5 text-amber-500" />;
      case "deadline_urgent":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "overdue":
        return <Clock className="h-5 w-5 text-red-500" />;
      case "breakdown_suggest":
        return <Zap className="h-5 w-5 text-primary" />;
      default:
        return <Sparkles className="h-5 w-5 text-primary" />;
    }
  };

  const getBackground = () => {
    switch (nudge.type) {
      case "deadline_urgent":
      case "overdue":
        return "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/50 dark:to-orange-950/50 border-red-200 dark:border-red-800";
      case "skip_warning":
        return "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50 border-amber-200 dark:border-amber-800";
      default:
        return "bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border-primary/20";
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 shadow-lg backdrop-blur-sm",
        getBackground()
      )}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Ada avatar and header */}
      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm border">
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground leading-relaxed">
            {nudge.message}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <Button
          size="sm"
          onClick={onAction}
          className="flex-1 gap-2"
        >
          {nudge.action_type === "breakdown" && <Sparkles className="h-4 w-4" />}
          {nudge.action_type === "do_now" && <Zap className="h-4 w-4" />}
          {nudge.action_label}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSnooze}
          className="text-muted-foreground"
        >
          Later
        </Button>
      </div>
    </div>
  );
}

// Breakdown action handler component
interface NudgeBreakdownHandlerProps {
  assignmentId: string;
  onComplete: () => void;
}

export function NudgeBreakdownHandler({ assignmentId, onComplete }: NudgeBreakdownHandlerProps) {
  const { generateBreakdown, generating } = useSubtasks(assignmentId);

  useEffect(() => {
    const runBreakdown = async () => {
      const result = await generateBreakdown();
      if (result.success) {
        onComplete();
      }
    };
    runBreakdown();
  }, [generateBreakdown, onComplete]);

  return null;
}
