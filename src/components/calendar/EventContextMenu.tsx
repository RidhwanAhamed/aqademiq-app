import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { 
  Edit3, 
  Trash2, 
  Copy, 
  Clock, 
  MapPin, 
  Calendar,
  BookOpen,
  GraduationCap,
  FileText
} from 'lucide-react';

interface EventContextMenuProps {
  event: CalendarEvent;
  children: React.ReactNode;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onDuplicate: (event: CalendarEvent) => void;
  onReschedule: (event: CalendarEvent) => void;
}

export function EventContextMenu({
  event,
  children,
  onEdit,
  onDelete,
  onDuplicate,
  onReschedule
}: EventContextMenuProps) {
  const getEventIcon = () => {
    switch (event.type) {
      case 'schedule':
        return <BookOpen className="h-4 w-4" />;
      case 'exam':
        return <GraduationCap className="h-4 w-4" />;
      case 'assignment':
        return <FileText className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventTypeLabel = () => {
    switch (event.type) {
      case 'schedule':
        return 'Class';
      case 'exam':
        return 'Exam';
      case 'assignment':
        return 'Assignment';
      default:
        return 'Event';
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <div className="px-2 py-1.5 text-sm font-medium text-foreground flex items-center gap-2">
          {getEventIcon()}
          {getEventTypeLabel()}: {event.title}
        </div>
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={() => onEdit(event)} className="cursor-pointer">
          <Edit3 className="h-4 w-4 mr-2" />
          Edit Details
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => onReschedule(event)} className="cursor-pointer">
          <Clock className="h-4 w-4 mr-2" />
          Reschedule
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => onDuplicate(event)} className="cursor-pointer">
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </ContextMenuItem>
        
        {event.location && (
          <ContextMenuItem disabled className="cursor-default">
            <MapPin className="h-4 w-4 mr-2" />
            {event.location}
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        <ContextMenuItem 
          onClick={() => onDelete(event)} 
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}