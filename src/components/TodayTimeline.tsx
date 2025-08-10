import { Clock, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSchedule } from "@/hooks/useSchedule";
import { useAssignments } from "@/hooks/useAssignments";
import { format, isToday, isBefore, addHours } from "date-fns";


const statusStyles = {
  completed: "bg-success-muted text-success border-success/20",
  current: "bg-primary-muted text-primary border-primary/20 animate-pulse",
  upcoming: "bg-muted text-muted-foreground border-border"
};

const courseColorMap = {
  math: "border-l-course-math",
  science: "border-l-course-science",
  english: "border-l-course-english", 
  history: "border-l-course-history",
  language: "border-l-course-language",
  art: "border-l-course-art"
};

export function TodayTimeline() {
  const { scheduleBlocks } = useSchedule();
  const { assignments } = useAssignments();
  
  // Get today's schedule blocks
  const todayBlocks = scheduleBlocks.filter(block => {
    // Simple check for today - in real app would use the schedule function
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    return block.day_of_week === today && block.is_active;
  });

  // Get assignments due today
  const todayAssignments = assignments.filter(assignment => 
    isToday(new Date(assignment.due_date)) && !assignment.is_completed
  );

  // Combine schedule blocks and assignments into sessions
  const todaySessions = [
    ...todayBlocks.map(block => ({
      id: block.id,
      title: block.title,
      course: "Course", // You might want to join with courses table
      time: format(new Date(`2000-01-01T${block.start_time}`), 'h:mm a'),
      duration: `${Math.round((new Date(`2000-01-01T${block.end_time}`).getTime() - new Date(`2000-01-01T${block.start_time}`).getTime()) / (1000 * 60 * 60) * 10) / 10} hours`,
      status: "upcoming",
      color: "primary",
      type: "class"
    })),
    ...todayAssignments.map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      course: "Assignment",
      time: format(new Date(assignment.due_date), 'h:mm a'),
      duration: `${assignment.estimated_hours || 1} hours`,
      status: isBefore(new Date(assignment.due_date), new Date()) ? "overdue" : "upcoming",
      color: "warning",
      type: "assignment"
    }))
  ].sort((a, b) => {
    const timeA = new Date(`2000-01-01 ${a.time}`).getTime();
    const timeB = new Date(`2000-01-01 ${b.time}`).getTime();
    return timeA - timeB;
  });

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
    <div className="space-y-4">
      {todaySessions.map((session, index) => {
        const colorClass = courseColorMap[session.color as keyof typeof courseColorMap] || "border-l-primary";
        const statusClass = statusStyles[session.status as keyof typeof statusStyles] || statusStyles.upcoming;
        
        return (
          <div 
            key={session.id}
            className={`flex items-center gap-4 p-4 rounded-lg border-l-4 ${colorClass} bg-card hover:shadow-card transition-all duration-200`}
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
              {todaySessions.reduce((total, session) => {
                const hours = parseFloat(session.duration.split(' ')[0]);
                return total + hours;
              }, 0).toFixed(1)} hours
            </span>
          </div>
        </div>
      )}
    </div>
  );
}