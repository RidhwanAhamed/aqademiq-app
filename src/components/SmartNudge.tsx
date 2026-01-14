import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Sparkles, Clock, AlertTriangle, Zap, Calendar, List, Edit2, Check, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, setHours, setMinutes, isBefore, isAfter, addMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface SmartNudgeProps {
  className?: string;
  activeAssignmentId?: string;
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

  const showNudgeCard = !loading && hasNudges && filteredNudge;

  return (
    <>
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
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

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

// Extended type for overdue items with scheduling info
interface OverdueItem extends SmartNudgeType {
  estimated_minutes?: number;
  recommended_time?: Date;
  course_id?: string;
}

// Export standalone button component for use in other pages
export function OverdueTasksButton() {
  const { dismissedNudges, removeFromOverdueList } = useSmartNudges();
  const [open, setOpen] = useState(false);
  const [overdueAssignments, setOverdueAssignments] = useState<OverdueItem[]>([]);
  const [existingEvents, setExistingEvents] = useState<{ start: Date; end: Date }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinutes, setEditMinutes] = useState<number>(30);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch overdue assignments and existing calendar events
  useEffect(() => {
    const fetchData = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const now = new Date();
      const oneWeekAhead = addDays(now, 7);

      // Fetch overdue assignments
      const { data: overdue } = await supabase
        .from("assignments")
        .select("id, title, due_date, reschedule_count, completion_percentage, estimated_hours, course_id")
        .eq("user_id", session.session.user.id)
        .eq("is_completed", false)
        .lt("due_date", now.toISOString())
        .order("due_date", { ascending: true })
        .limit(10);

      // Fetch existing schedule blocks for conflict detection
      const { data: scheduleBlocks } = await supabase
        .from("schedule_blocks")
        .select("specific_date, start_time, end_time, day_of_week")
        .eq("user_id", session.session.user.id)
        .eq("is_active", true);

      // Build list of busy time slots
      const busySlots: { start: Date; end: Date }[] = [];
      if (scheduleBlocks) {
        for (const block of scheduleBlocks) {
          if (block.specific_date && block.start_time && block.end_time) {
            const [sh, sm] = block.start_time.split(":").map(Number);
            const [eh, em] = block.end_time.split(":").map(Number);
            const blockDate = new Date(block.specific_date);
            busySlots.push({
              start: setMinutes(setHours(blockDate, sh), sm),
              end: setMinutes(setHours(blockDate, eh), em),
            });
          }
        }
      }
      setExistingEvents(busySlots);

      if (overdue) {
        const overdueNudges: OverdueItem[] = overdue.map(a => {
          const dueDate = new Date(a.due_date);
          const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          const estimatedMinutes = (a.estimated_hours || 1) * 60;
          
          return {
            type: "overdue" as const,
            assignment_id: a.id,
            assignment_title: a.title,
            message: `is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
            action_label: "Work on This",
            action_type: "do_now" as const,
            priority: 0,
            estimated_minutes: estimatedMinutes,
            course_id: a.course_id,
          };
        });
        
        // Calculate recommended times for each assignment
        const withTimes = calculateRecommendedTimes(overdueNudges, busySlots);
        setOverdueAssignments(withTimes);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  // Find next available time slot avoiding conflicts
  const findNextAvailableSlot = useCallback((
    durationMinutes: number,
    busySlots: { start: Date; end: Date }[],
    afterTime?: Date
  ): Date => {
    const now = afterTime || new Date();
    let candidateStart = new Date(now);
    
    // Start from the next hour
    candidateStart.setMinutes(0, 0, 0);
    candidateStart.setHours(candidateStart.getHours() + 1);
    
    // Working hours: 8 AM to 9 PM
    const workStart = 8;
    const workEnd = 21;

    for (let attempts = 0; attempts < 100; attempts++) {
      const hour = candidateStart.getHours();
      
      // Skip non-working hours
      if (hour < workStart) {
        candidateStart.setHours(workStart, 0, 0, 0);
      } else if (hour >= workEnd) {
        // Move to next day
        candidateStart = addDays(candidateStart, 1);
        candidateStart.setHours(workStart, 0, 0, 0);
        continue;
      }

      const candidateEnd = addMinutes(candidateStart, durationMinutes);

      // Check for conflicts
      const hasConflict = busySlots.some(slot => {
        return (
          (candidateStart >= slot.start && candidateStart < slot.end) ||
          (candidateEnd > slot.start && candidateEnd <= slot.end) ||
          (candidateStart <= slot.start && candidateEnd >= slot.end)
        );
      });

      if (!hasConflict) {
        return candidateStart;
      }

      // Move to next 30-min slot
      candidateStart = addMinutes(candidateStart, 30);
    }

    // Fallback: tomorrow at 9 AM
    const fallback = addDays(new Date(), 1);
    fallback.setHours(9, 0, 0, 0);
    return fallback;
  }, []);

  // Calculate recommended times for all assignments
  const calculateRecommendedTimes = (
    items: OverdueItem[],
    busySlots: { start: Date; end: Date }[]
  ): OverdueItem[] => {
    let lastEndTime = new Date();
    const result: OverdueItem[] = [];
    const updatedBusySlots = [...busySlots];

    for (const item of items) {
      const duration = item.estimated_minutes || 60;
      const recommendedTime = findNextAvailableSlot(duration, updatedBusySlots, lastEndTime);
      
      // Add this slot to busy slots to avoid overlap with next assignment
      updatedBusySlots.push({
        start: recommendedTime,
        end: addMinutes(recommendedTime, duration),
      });
      
      lastEndTime = addMinutes(recommendedTime, duration + 15); // 15 min break
      
      result.push({
        ...item,
        recommended_time: recommendedTime,
      });
    }

    return result;
  };

  // Combine dismissed nudges with actual overdue assignments (deduped)
  const allOverdueItems = useMemo(() => {
    const combined = [...overdueAssignments];
    dismissedNudges.forEach(nudge => {
      if (!combined.some(n => n.assignment_id === nudge.assignment_id)) {
        combined.push({
          ...nudge,
          estimated_minutes: 60,
          recommended_time: findNextAvailableSlot(60, existingEvents),
        });
      }
    });
    return combined;
  }, [overdueAssignments, dismissedNudges, existingEvents, findNextAvailableSlot]);

  // Schedule task to calendar
  const handleSmartSchedule = async (item: OverdueItem, customMinutes?: number) => {
    setScheduling(item.assignment_id);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error("Not authenticated");

      const duration = customMinutes || item.estimated_minutes || 60;
      const startTime = item.recommended_time || findNextAvailableSlot(duration, existingEvents);
      const endTime = addMinutes(startTime, duration);

      const { error } = await supabase
        .from("schedule_blocks")
        .insert({
          user_id: session.session.user.id,
          title: `Work on: ${item.assignment_title}`,
          description: `Scheduled time to work on overdue assignment`,
          specific_date: format(startTime, "yyyy-MM-dd"),
          day_of_week: startTime.getDay(),
          start_time: format(startTime, "HH:mm:ss"),
          end_time: format(endTime, "HH:mm:ss"),
          course_id: item.course_id || null,
          is_recurring: false,
          is_active: true,
          source: "smart_scheduler",
        });

      if (error) throw error;

      toast({
        title: "Scheduled!",
        description: `"${item.assignment_title}" scheduled for ${format(startTime, "MMM d 'at' h:mm a")}`,
      });

      // Remove from list after scheduling
      setOverdueAssignments(prev => prev.filter(a => a.assignment_id !== item.assignment_id));
      removeFromOverdueList(item.assignment_id);
    } catch (err) {
      console.error("Error scheduling:", err);
      toast({
        title: "Error",
        description: "Failed to schedule task",
        variant: "destructive",
      });
    } finally {
      setScheduling(null);
      setEditingId(null);
    }
  };

  const handleUpdateEstimate = (item: OverdueItem) => {
    setOverdueAssignments(prev => prev.map(a => 
      a.assignment_id === item.assignment_id 
        ? { ...a, estimated_minutes: editMinutes }
        : a
    ));
    setEditingId(null);
  };

  if (allOverdueItems.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-24 right-4 z-40 gap-2 shadow-lg bg-background/95 backdrop-blur-sm border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <AlertTriangle className="h-4 w-4" />
          <span className="hidden sm:inline">Needs Attention</span>
          <Badge variant="destructive" className="ml-1">
            {allOverdueItems.length}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Tasks Needing Attention
          </SheetTitle>
          <SheetDescription>
            Smart scheduling finds conflict-free time slots for each task.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-200px)] mt-6">
          <div className="space-y-4 pr-4">
            {allOverdueItems.map((item, index) => (
              <div
                key={`${item.assignment_id}-${index}`}
                className="p-4 rounded-lg border bg-card space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                    item.type === "overdue" ? "bg-destructive/10" : "bg-amber-500/10"
                  )}>
                    {item.type === "overdue" ? (
                      <Clock className="h-4 w-4 text-destructive" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.assignment_title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.message}</p>
                  </div>
                </div>

                {/* Recommended Schedule Info */}
                {item.recommended_time && (
                  <div className="bg-primary/5 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-primary">Recommended Time</span>
                      <Badge variant="outline" className="text-xs">
                        No conflicts
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(item.recommended_time, "EEE, MMM d 'at' h:mm a")}
                      </span>
                    </div>
                    
                    {/* Editable duration */}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {editingId === item.assignment_id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="number"
                            value={editMinutes}
                            onChange={(e) => setEditMinutes(Number(e.target.value))}
                            className="h-7 w-20 text-sm"
                            min={15}
                            max={480}
                          />
                          <span className="text-xs text-muted-foreground">min</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleUpdateEstimate(item)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm">
                            {item.estimated_minutes || 60} min estimated
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => {
                              setEditMinutes(item.estimated_minutes || 60);
                              setEditingId(item.assignment_id);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => {
                      navigate(`/assignments`);
                      setOpen(false);
                    }}
                  >
                    <Sparkles className="h-3 w-3" />
                    Break Down
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleSmartSchedule(item)}
                    disabled={scheduling === item.assignment_id}
                  >
                    {scheduling === item.assignment_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                    Schedule This Time
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full gap-1 mt-1"
                    onClick={() => {
                      navigate(`/timer`);
                      setOpen(false);
                    }}
                  >
                    <Zap className="h-3 w-3" />
                    Start Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
