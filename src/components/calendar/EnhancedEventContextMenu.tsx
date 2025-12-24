import React, { useState, useEffect } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuShortcut
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
  FileText,
  Share2,
  Bell,
  BellOff,
  MoveRight,
  Info,
  Palette
} from 'lucide-react';
import { formatInUserTimezone } from '@/utils/timezone';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EnhancedEventContextMenuProps {
  event: CalendarEvent;
  children: React.ReactNode;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onDuplicate: (event: CalendarEvent) => void;
  onReschedule: (event: CalendarEvent) => void;
  onShare?: (event: CalendarEvent) => void;
  onToggleReminder?: (event: CalendarEvent) => void;
  onColorChange?: (event: CalendarEvent, color: string) => void;
  isReminderEnabled?: boolean;
  position?: { x: number; y: number };
}

const EVENT_COLORS = [
  { name: 'Blue', value: 'primary', color: 'hsl(var(--primary))' },
  { name: 'Green', value: 'success', color: 'hsl(var(--success))' },
  { name: 'Orange', value: 'warning', color: 'hsl(var(--warning))' },
  { name: 'Red', value: 'destructive', color: 'hsl(var(--destructive))' },
  { name: 'Purple', value: 'accent', color: 'hsl(var(--accent))' },
  { name: 'Gray', value: 'muted', color: 'hsl(var(--muted-foreground))' },
];

export function EnhancedEventContextMenu({
  event,
  children,
  onEdit,
  onDelete,
  onDuplicate,
  onReschedule,
  onShare,
  onToggleReminder,
  onColorChange,
  isReminderEnabled = false,
  position
}: EnhancedEventContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getEventIcon = () => {
    switch (event.type) {
      case 'schedule':
        return <BookOpen className="h-4 w-4" />;
      case 'exam':
        return <GraduationCap className="h-4 w-4" />;
      case 'assignment':
        return <FileText className="h-4 w-4" />;
      case 'study_session':
        return <BookOpen className="h-4 w-4" />;
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
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  const handleCopyEventInfo = () => {
    const eventInfo = `${event.title}
Date: ${formatInUserTimezone(event.start, 'EEEE, MMMM d, yyyy')}
Time: ${formatInUserTimezone(event.start, 'h:mm a')} - ${formatInUserTimezone(event.end, 'h:mm a')}
Duration: ${getDuration()}
${event.location ? `Location: ${event.location}` : ''}
Type: ${getEventTypeLabel()}`;

    navigator.clipboard.writeText(eventInfo).then(() => {
      // Could show a toast notification here
    });
    setIsOpen(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'e' || e.key === 'E') {
        onEdit(event);
        setIsOpen(false);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        onDelete(event);
        setIsOpen(false);
      } else if (e.key === 'd' || e.key === 'D') {
        onDuplicate(event);
        setIsOpen(false);
      } else if (e.key === 'r' || e.key === 'R') {
        onReschedule(event);
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, event, onEdit, onDelete, onDuplicate, onReschedule]);

  return (
    <ContextMenu onOpenChange={setIsOpen}>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent 
        className="w-80" 
        style={position ? { 
          position: 'fixed', 
          left: position.x, 
          top: position.y 
        } : undefined}
      >
        {/* Event Header */}
        <div className="px-2 py-3 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted/50">
              {getEventIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {event.title}
                </h3>
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  style={{ backgroundColor: `hsl(var(--${event.color || 'primary'})/0.1)` }}
                >
                  {getEventTypeLabel()}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatInUserTimezone(event.start, 'EEEE, MMM d')}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatInUserTimezone(event.start, 'h:mm a')} - {formatInUserTimezone(event.end, 'h:mm a')}
                  </span>
                  <span className="text-muted-foreground/70">({getDuration()})</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="py-1">
          <ContextMenuItem onClick={() => onEdit(event)} className="cursor-pointer">
            <Edit3 className="h-4 w-4 mr-2" />
            Edit Details
            <ContextMenuShortcut>E</ContextMenuShortcut>
          </ContextMenuItem>
          
          <ContextMenuItem onClick={() => onReschedule(event)} className="cursor-pointer">
            <MoveRight className="h-4 w-4 mr-2" />
            Reschedule
            <ContextMenuShortcut>R</ContextMenuShortcut>
          </ContextMenuItem>
          
          <ContextMenuItem onClick={() => onDuplicate(event)} className="cursor-pointer">
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
            <ContextMenuShortcut>D</ContextMenuShortcut>
          </ContextMenuItem>
        </div>

        <ContextMenuSeparator />

        {/* Secondary Actions */}
        <div className="py-1">
          {onShare && (
            <ContextMenuItem onClick={() => onShare(event)} className="cursor-pointer">
              <Share2 className="h-4 w-4 mr-2" />
              Share Event
            </ContextMenuItem>
          )}
          
          <ContextMenuItem onClick={handleCopyEventInfo} className="cursor-pointer">
            <Info className="h-4 w-4 mr-2" />
            Copy Info
          </ContextMenuItem>

          {onToggleReminder && (
            <ContextMenuItem 
              onClick={() => onToggleReminder(event)} 
              className="cursor-pointer"
            >
              {isReminderEnabled ? (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Disable Reminder
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Reminder
                </>
              )}
            </ContextMenuItem>
          )}

          {onColorChange && (
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Palette className="h-4 w-4 mr-2" />
                Change Color
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {EVENT_COLORS.map((color) => (
                  <ContextMenuItem
                    key={color.value}
                    onClick={() => onColorChange(event, color.value)}
                    className="cursor-pointer"
                  >
                    <div 
                      className="w-4 h-4 rounded-full mr-2 border border-border"
                      style={{ backgroundColor: color.color }}
                    />
                    {color.name}
                    {event.color === color.value && (
                      <span className="ml-auto text-xs text-muted-foreground">✓</span>
                    )}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}
        </div>

        <ContextMenuSeparator />
        
        {/* Destructive Action */}
        <div className="py-1">
          <ContextMenuItem 
            onClick={() => onDelete(event)} 
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
            <ContextMenuShortcut>Del</ContextMenuShortcut>
          </ContextMenuItem>
        </div>
      </ContextMenuContent>
    </ContextMenu>
  );
}