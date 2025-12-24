import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { format, isToday, isTomorrow, isYesterday, startOfDay, endOfDay } from 'date-fns';
import { 
  Clock, 
  MapPin, 
  BookOpen, 
  GraduationCap, 
  FileText,
  ChevronRight
} from 'lucide-react';

interface AgendaViewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  dateRange?: { start: Date; end: Date };
}

export function AgendaView({ events, onEventClick, dateRange }: AgendaViewProps) {
  // Group events by date
  const groupedEvents = events.reduce((groups, event) => {
    const dateKey = format(startOfDay(event.start), 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
    return groups;
  }, {} as Record<string, CalendarEvent[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedEvents).sort();

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'schedule':
        return <BookOpen className="h-4 w-4" />;
      case 'exam':
        return <GraduationCap className="h-4 w-4" />;
      case 'assignment':
        return <FileText className="h-4 w-4" />;
      case 'study_session':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d');
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'schedule':
        return 'blue';
      case 'exam':
        return 'red';
      case 'assignment':
        return 'orange';
      case 'study_session':
        return 'purple';
      default:
        return 'gray';
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Agenda</h2>
          <Badge variant="outline">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {sortedDates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No events scheduled</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(dateStr => {
              const dayEvents = groupedEvents[dateStr].sort((a, b) => 
                a.start.getTime() - b.start.getTime()
              );
              
              return (
                <div key={dateStr} className="space-y-3">
                  <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2">
                    <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
                      {getDateLabel(dateStr)}
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    {dayEvents.map(event => (
                      <Button
                        key={event.id}
                        variant="ghost"
                        className="w-full justify-start h-auto p-4 text-left"
                        onClick={() => onEventClick(event)}
                      >
                        <div className="flex items-start gap-3 w-full">
                          <div className="flex-shrink-0 mt-1">
                            <div 
                              className="p-2 rounded-full text-white"
                              style={{ backgroundColor: `hsl(var(--${getEventTypeColor(event.type)}))` }}
                            >
                              {getEventIcon(event.type)}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-foreground truncate">
                                {event.title}
                              </h4>
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                            
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                              </div>
                              
                              {event.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </div>
                              )}
                              
                              {event.course && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs"
                                  style={{ 
                                    borderColor: `hsl(var(--${event.color}))`,
                                    color: `hsl(var(--${event.color}))`
                                  }}
                                >
                                  {event.course.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}