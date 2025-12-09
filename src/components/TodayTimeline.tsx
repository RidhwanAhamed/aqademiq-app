import { useState } from "react";
import { Clock, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSchedule } from "@/hooks/useSchedule";
import { useAssignments } from "@/hooks/useAssignments";
import { format, isBefore } from "date-fns";
import { getTodayDayOfWeek, isSameDayInTimezone, getUserTimezone } from "@/utils/timezone";
import { ScheduleDetailSheet } from "./ScheduleDetailSheet";

const statusStyles = {
  completed: "bg-success-muted text-success border-success/20",
  current: "bg-primary-muted text-primary border-primary/20 animate-pulse",
  upcoming: "bg-muted text-muted-foreground border-border",
  overdue: "bg-destructive/10 text-destructive border-destructive/20"
};

const courseColorMap = {
  math: "border-l-course-math",
  science: "border-l-course-science",
  english: "border-l-course-english", 
  history: "border-l-course-history",
  language: "border-l-course-language",
  art: "border-l-course-art"
};

interface ScheduleSession {
  id: string;
  title: string;
  course: string;
  time: string;
  duration: string;
  status: string;
  color: string;
  type: "class" | "assignment";
  location?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  specificDate?: string;
  dayOfWeek?: number;
  isRecurring?: boolean;
}

// Normalize title by removing emojis, special chars, and extra spaces
function normalizeTitle(title: string): string {
  return title
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function TodayTimeline() {
  const { scheduleBlocks, deleteScheduleBlock } = useSchedule();
  const { assignments } = useAssignments();
  const [selectedSession, setSelectedSession] = useState<ScheduleSession | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Get user's timezone for consistent date handling
  const userTimezone = getUserTimezone();
  const todayDayOfWeek = getTodayDayOfWeek(userTimezone);
  const now = new Date();
  
  // Get today's schedule blocks using correct filter logic
  const todayBlocks = scheduleBlocks.filter(block => {
    if (!block.is_active) return false;
    
    // For recurring events: match by day_of_week
    if (block.is_recurring && block.day_of_week === todayDayOfWeek) {
      return true;
    }
    
    // For specific date events: match by specific_date
    if (!block.is_recurring && block.specific_date) {
      return isSameDayInTimezone(new Date(block.specific_date), now, userTimezone);
    }
    
    // Fallback for legacy data: if is_recurring is null/undefined, use day_of_week
    if (block.is_recurring === null || block.is_recurring === undefined) {
      return block.day_of_week === todayDayOfWeek;
    }
    
    return false;
  });

  // Deduplicate by normalized title + start_time
  const deduplicatedBlocks = todayBlocks.reduce((acc, block) => {
    const normalizedTitle = normalizeTitle(block.title);
    const key = `${normalizedTitle}-${block.start_time}`;
    if (!acc.seen.has(key)) {
      acc.seen.add(key);
      acc.blocks.push(block);
    }
    return acc;
  }, { seen: new Set<string>(), blocks: [] as typeof todayBlocks }).blocks;

  // Get assignments due today using timezone-aware comparison
  const todayAssignments = assignments.filter(assignment => 
    isSameDayInTimezone(new Date(assignment.due_date), now, userTimezone) && !assignment.is_completed
  );

  // Combine schedule blocks and assignments into sessions
  const todaySessions: ScheduleSession[] = [
    ...deduplicatedBlocks.map(block => ({
      id: block.id,
      title: block.title,
      course: "Course",
      time: format(new Date(`2000-01-01T${block.start_time}`), 'h:mm a'),
      duration: `${Math.round((new Date(`2000-01-01T${block.end_time}`).getTime() - new Date(`2000-01-01T${block.start_time}`).getTime()) / (1000 * 60 * 60) * 10) / 10} hours`,
      status: "upcoming",
      color: "primary",
      type: "class" as const,
      location: block.location || undefined,
      description: block.description || undefined,
      startTime: block.start_time,
      endTime: block.end_time,
      specificDate: block.specific_date || undefined,
      dayOfWeek: block.day_of_week ?? undefined,
      isRecurring: block.is_recurring ?? true
    })),
    ...todayAssignments.map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      course: "Assignment",
      time: format(new Date(assignment.due_date), 'h:mm a'),
      duration: `${assignment.estimated_hours || 1} hours`,
      status: isBefore(new Date(assignment.due_date), new Date()) ? "overdue" : "upcoming",
      color: "warning",
      type: "assignment" as const,
      description: assignment.description || assignment.notes || undefined
    }))
  ].sort((a, b) => {
    const timeA = new Date(`2000-01-01 ${a.time}`).getTime();
    const timeB = new Date(`2000-01-01 ${b.time}`).getTime();
    return timeA - timeB;
  });

  // Calculate total hours by merging overlapping intervals
  const calculateTotalHours = () => {
    if (todaySessions.length === 0) return 0;
    
    // Convert sessions to intervals [start_minutes, end_minutes]
    const intervals = todaySessions
      .filter(s => s.startTime && s.endTime)
      .map(s => {
        const [startH, startM] = s.startTime!.split(':').map(Number);
        const [endH, endM] = s.endTime!.split(':').map(Number);
        return [startH * 60 + startM, endH * 60 + endM];
      })
      .sort((a, b) => a[0] - b[0]);

    if (intervals.length === 0) {
      // Fallback: sum durations for assignments without start/end times
      return todaySessions.reduce((total, session) => {
        const hours = parseFloat(session.duration.split(' ')[0]);
        return total + hours;
      }, 0);
    }

    // Merge overlapping intervals
    const merged: number[][] = [];
    for (const interval of intervals) {
      if (merged.length === 0 || merged[merged.length - 1][1] < interval[0]) {
        merged.push(interval);
      } else {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], interval[1]);
      }
    }

    // Sum merged intervals
    const totalMinutes = merged.reduce((sum, [start, end]) => sum + (end - start), 0);
    return totalMinutes / 60;
  };

  const handleSessionClick = (session: ScheduleSession) => {
    setSelectedSession(session);
    setSheetOpen(true);
  };

  const handleDelete = async (session: ScheduleSession) => {
    if (session.type === "class") {
      await deleteScheduleBlock(session.id);
      setSheetOpen(false);
    }
  };

  if (todaySessions.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No study sessions scheduled for today</p>
        <p className="text-sm text-muted-foreground mt-1">Add an assignment to get started!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {todaySessions.map((session) => {
          const colorClass = courseColorMap[session.color as keyof typeof courseColorMap] || "border-l-primary";
          const statusClass = statusStyles[session.status as keyof typeof statusStyles] || statusStyles.upcoming;
          
          return (
            <div 
              key={session.id}
              onClick={() => handleSessionClick(session)}
              className={`flex items-center gap-4 p-4 rounded-lg border-l-4 ${colorClass} bg-card hover:shadow-card transition-all duration-200 cursor-pointer active:scale-[0.98]`}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">{session.time}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{session.title}</h4>
                  <p className="text-xs text-muted-foreground">{session.course}</p>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">{session.duration}</span>
                  <Badge className={`text-xs ${statusClass}`}>
                    {session.status}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
        
        {todaySessions.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total time planned</span>
              <span className="font-semibold text-primary">
                {calculateTotalHours().toFixed(1)} hours
              </span>
            </div>
          </div>
        )}
      </div>

      <ScheduleDetailSheet
        session={selectedSession}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDelete={selectedSession?.type === "class" ? handleDelete : undefined}
      />
    </>
  );
}
