import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Clock, AlertTriangle, Zap, Calendar, List } from "lucide-react";
import { useSmartNudges, SmartNudge as SmartNudgeType } from "@/hooks/useSmartNudges";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SmartNudgeProps {
  className?: string;
  activeAssignmentId?: string; // ID of assignment currently being studied
}

export function SmartNudge({ className, activeAssignmentId }: SmartNudgeProps) {
  const { 
    currentNudge, 
    dismissNudge, 
    snoozeNudge, 
    hasNudges, 
    loading,
    dismissedNudges,
    addToOverdueList,
    removeFromOverdueList
  } = useSmartNudges();
  const [showOverdueSheet, setShowOverdueSheet] = useState(false);
  const navigate = useNavigate();

  // Don't show nudge if it's for the assignment currently being studied
  const filteredNudge = currentNudge && activeAssignmentId !== currentNudge.assignment_id 
    ? currentNudge 
    : null;

  const handleAction = async () => {
    if (!filteredNudge) return;
    
    switch (filteredNudge.action_type) {
      case "breakdown":
        dismissNudge(filteredNudge.assignment_id, "breakdown_started");
        navigate(`/assignments`);
        break;
      case "do_now":
        dismissNudge(filteredNudge.assignment_id, "started_now");
        navigate(`/timer`);
        break;
      case "reschedule":
        dismissNudge(filteredNudge.assignment_id, "rescheduling");
        navigate(`/assignments`);
        break;
    }
  };

  const handleDismissToOverdue = () => {
    if (!filteredNudge) return;
    addToOverdueList(filteredNudge);
    dismissNudge(filteredNudge.assignment_id, "moved_to_overdue");
  };

  // Show nudge card only if there's an active nudge
  const showNudgeCard = !loading && hasNudges && filteredNudge;

  return (
    <>
      {/* Active Nudge Card */}
      <AnimatePresence>
        {showNudgeCard && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className={className}
          >
            <NudgeCard
              nudge={filteredNudge}
              onDismiss={handleDismissToOverdue}
              onSnooze={() => snoozeNudge(filteredNudge.assignment_id, 60)}
              onAction={handleAction}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overdue Tasks Button - Always visible when there are dismissed nudges */}
      {dismissedNudges.length > 0 && (
        <OverdueTasksPanel 
          open={showOverdueSheet}
          onOpenChange={setShowOverdueSheet}
          overdueNudges={dismissedNudges}
          onRemoveNudge={removeFromOverdueList}
        />
      )}
    </>
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
            "{nudge.assignment_title}" {nudge.message}
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

// Overdue Tasks Panel Component
interface OverdueTasksPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overdueNudges: SmartNudgeType[];
  onRemoveNudge: (assignmentId: string) => void;
}

function OverdueTasksPanel({ open, onOpenChange, overdueNudges, onRemoveNudge }: OverdueTasksPanelProps) {
  const navigate = useNavigate();

  const handleBreakdown = (nudge: SmartNudgeType) => {
    onRemoveNudge(nudge.assignment_id);
    navigate(`/assignments`);
    onOpenChange(false);
  };

  const handleSchedule = (nudge: SmartNudgeType) => {
    onRemoveNudge(nudge.assignment_id);
    navigate(`/calendar`);
    onOpenChange(false);
  };

  const handleStartNow = (nudge: SmartNudgeType) => {
    onRemoveNudge(nudge.assignment_id);
    navigate(`/timer`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-24 right-4 z-40 gap-2 shadow-lg bg-background/95 backdrop-blur-sm border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <AlertTriangle className="h-4 w-4" />
          <span className="hidden sm:inline">Overdue Tasks</span>
          <Badge variant="destructive" className="ml-1">
            {overdueNudges.length}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Overdue & Pending Tasks
          </SheetTitle>
          <SheetDescription>
            Tasks that need your attention. Choose an action for each.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-200px)] mt-6">
          <div className="space-y-4 pr-4">
            {overdueNudges.map((nudge, index) => (
              <div
                key={`${nudge.assignment_id}-${index}`}
                className="p-4 rounded-lg border bg-card space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    nudge.type === "overdue" ? "bg-destructive/10" : "bg-amber-500/10"
                  )}>
                    {nudge.type === "overdue" ? (
                      <Clock className="h-4 w-4 text-destructive" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{nudge.assignment_title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{nudge.message}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onRemoveNudge(nudge.assignment_id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => handleBreakdown(nudge)}
                  >
                    <Sparkles className="h-3 w-3" />
                    Break Down
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => handleSchedule(nudge)}
                  >
                    <Calendar className="h-3 w-3" />
                    Schedule
                  </Button>
                  <Button
                    size="sm"
                    className="w-full gap-1 mt-1"
                    onClick={() => handleStartNow(nudge)}
                  >
                    <Zap className="h-3 w-3" />
                    Start Now
                  </Button>
                </div>
              </div>
            ))}
            
            {overdueNudges.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <List className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No overdue tasks</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Export standalone button component for use in other pages
export function OverdueTasksButton() {
  const { dismissedNudges, removeFromOverdueList } = useSmartNudges();
  const [open, setOpen] = useState(false);

  if (dismissedNudges.length === 0) return null;

  return (
    <OverdueTasksPanel
      open={open}
      onOpenChange={setOpen}
      overdueNudges={dismissedNudges}
      onRemoveNudge={removeFromOverdueList}
    />
  );
}
