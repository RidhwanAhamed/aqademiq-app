import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, BookOpen, Calendar, Timer, FileText, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ScheduleSession {
  id: string;
  title: string;
  course: string;
  time: string;
  duration: string;
  status: string;
  type: "class" | "assignment";
  location?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  specificDate?: string;
  dayOfWeek?: number;
  isRecurring?: boolean;
}

interface ScheduleDetailSheetProps {
  session: ScheduleSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (session: ScheduleSession) => void;
  onDelete?: (session: ScheduleSession) => void;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ScheduleDetailSheet({ 
  session, 
  open, 
  onOpenChange,
  onEdit,
  onDelete 
}: ScheduleDetailSheetProps) {
  if (!session) return null;

  const getDateDisplay = () => {
    if (session.specificDate) {
      return format(new Date(session.specificDate), "EEEE, MMMM d, yyyy");
    }
    if (session.dayOfWeek !== undefined) {
      return `Every ${dayNames[session.dayOfWeek]}`;
    }
    return "Today";
  };

  const getTypeColor = () => {
    switch (session.type) {
      case "class":
        return "bg-primary/10 text-primary border-primary/20";
      case "assignment":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-semibold truncate">
                {session.title}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">{session.course}</p>
            </div>
            <Badge className={`${getTypeColor()} capitalize shrink-0`}>
              {session.type}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {/* Date */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Calendar className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">{getDateDisplay()}</p>
              {session.isRecurring && (
                <p className="text-xs text-muted-foreground">Recurring weekly</p>
              )}
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Clock className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">{session.time}</p>
              {session.startTime && session.endTime && (
                <p className="text-xs text-muted-foreground">
                  {session.startTime} - {session.endTime}
                </p>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Timer className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Duration</p>
              <p className="text-xs text-muted-foreground">{session.duration}</p>
            </div>
          </div>

          {/* Location */}
          {session.location && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-xs text-muted-foreground">{session.location}</p>
              </div>
            </div>
          )}

          {/* Description/Notes */}
          {session.description && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Notes</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {session.description}
                </p>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <BookOpen className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Status</p>
              <Badge variant="outline" className="mt-1 capitalize">
                {session.status}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          {(onEdit || onDelete) && (
            <div className="flex gap-3 pt-4 border-t">
              {onEdit && (
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => onEdit(session)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => onDelete(session)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
