import React from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { Clock, MapPin, Calendar, Edit3, Trash2, BookOpen, GraduationCap, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventDetailSheetProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => Promise<boolean>;
}

export function EventDetailSheet({
  event,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: EventDetailSheetProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (!event) return null;

  const getEventIcon = () => {
    switch (event.type) {
      case 'schedule':
        return <BookOpen className="h-5 w-5" />;
      case 'exam':
        return <GraduationCap className="h-5 w-5" />;
      case 'assignment':
        return <FileText className="h-5 w-5" />;
      case 'study_session':
        return <BookOpen className="h-5 w-5" />;
      default:
        return <Calendar className="h-5 w-5" />;
    }
  };

  const getEventTypeLabel = () => {
    switch (event.type) {
      case 'schedule':
        return 'Class';
      case 'exam':
        return 'Exam';
      case 'assignment':
        return 'Assignment Due';
      case 'study_session':
        return 'Study Session';
      default:
        return 'Event';
    }
  };

  const getDuration = () => {
    const durationMs = event.end.getTime() - event.start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} hr`;
    return `${hours} hr ${minutes} min`;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await onDelete(event);
    setIsDeleting(false);
    if (success) {
      setShowDeleteConfirm(false);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader className="space-y-4">
            <div className="flex items-start gap-3">
              <div 
                className={cn(
                  "p-3 rounded-lg",
                  "bg-gradient-to-br from-muted/50 to-muted"
                )}
                style={{ 
                  borderLeft: `4px solid hsl(var(--${event.color || 'primary'}))` 
                }}
              >
                {getEventIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg font-semibold truncate">
                  {event.title}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant="secondary" 
                    className="text-xs"
                    style={{ 
                      backgroundColor: `hsl(var(--${event.color || 'primary'})/0.1)`,
                      color: `hsl(var(--${event.color || 'primary'}))`
                    }}
                  >
                    {getEventTypeLabel()}
                  </Badge>
                  {event.course && (
                    <Badge variant="outline" className="text-xs">
                      {event.course.name}
                    </Badge>
                  )}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Date & Time */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(event.start, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                </span>
                <span className="text-muted-foreground">({getDuration()})</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onEdit(event);
                  onOpenChange(false);
                }}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{event.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
