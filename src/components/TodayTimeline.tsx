import { Clock, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const mockSessions = [
  {
    id: "1",
    title: "Physics Lab Report",
    course: "Physics",
    time: "9:00 AM",
    duration: "2 hours",
    status: "completed",
    color: "science"
  },
  {
    id: "2", 
    title: "Calculus Problem Set",
    course: "Calculus II",
    time: "2:00 PM",
    duration: "1.5 hours",
    status: "current",
    color: "math"
  },
  {
    id: "3",
    title: "Essay Writing",
    course: "English Lit",
    time: "4:00 PM", 
    duration: "2 hours",
    status: "upcoming",
    color: "english"
  },
  {
    id: "4",
    title: "Review Notes",
    course: "History",
    time: "7:00 PM",
    duration: "1 hour", 
    status: "upcoming",
    color: "history"
  }
];

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
  if (mockSessions.length === 0) {
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
      {mockSessions.map((session, index) => {
        const colorClass = courseColorMap[session.color as keyof typeof courseColorMap] || "border-l-primary";
        const statusClass = statusStyles[session.status as keyof typeof statusStyles];
        
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
      
      <div className="mt-6 pt-4 border-t">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Total study time planned</span>
          <span className="font-semibold text-primary">6.5 hours</span>
        </div>
      </div>
    </div>
  );
}