import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Grid3x3, List, Loader2 } from 'lucide-react';
import { useRealtimeCalendar, CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { useConflictDetection } from '@/hooks/useConflictDetection';
import { EnhancedWeekView } from './EnhancedWeekView';
import { EnhancedMonthView } from './EnhancedMonthView';
import { EnhancedAgendaView } from './EnhancedAgendaView';
import { EventContextMenu } from './EventContextMenu';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface NativeCalendarViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function NativeCalendarView({ selectedDate, onDateChange }: NativeCalendarViewProps) {
  const [activeView, setActiveView] = useState<'week' | 'month' | 'agenda'>('week');
  const [contextMenu, setContextMenu] = useState<{ 
    event: CalendarEvent; 
    x: number; 
    y: number; 
  } | null>(null);

  const { toast } = useToast();

  const { 
    events, 
    loading, 
    updateScheduleBlock, 
    updateExam, 
    updateAssignment,
    refetch 
  } = useRealtimeCalendar();

  const { 
    conflicts, 
    detectConflicts 
  } = useConflictDetection();

  // Detect conflicts whenever events change
  React.useEffect(() => {
    detectConflicts(events);
  }, [events, detectConflicts]);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    // For now, just show a toast. Could open edit dialog in the future
    toast({
      title: event.title,
      description: `${format(event.start, 'MMM d, HH:mm')} - ${format(event.end, 'HH:mm')}`,
    });
  }, [toast]);

  const handleEventUpdate = useCallback(async (event: CalendarEvent, updates: Partial<CalendarEvent>) => {
    try {
      const [type, id] = event.id.split('-');
      
      if (!type || !id) {
        throw new Error('Invalid event ID format');
      }
      
      switch (type) {
        case 'schedule':
          if (updates.start || updates.end) {
            const start_time = updates.start ? format(updates.start, 'HH:mm:ss') : undefined;
            const end_time = updates.end ? format(updates.end, 'HH:mm:ss') : undefined;
            const day_of_week = updates.start ? updates.start.getDay() : undefined;
            
            await updateScheduleBlock(id, {
              start_time,
              end_time,
              day_of_week,
              title: updates.title,
              location: updates.location
            });
          }
          break;
          
        case 'exam':
          if (updates.start) {
            await updateExam(id, {
              exam_date: updates.start.toISOString(),
              title: updates.title,
              location: updates.location
            });
          }
          break;
          
        case 'assignment':
          if (updates.end) {
            await updateAssignment(id, {
              due_date: updates.end.toISOString(),
              title: updates.title
            });
          }
          break;
      }
      
      toast({
        title: "Event Updated",
        description: `${event.title} has been updated successfully.`,
      });
      
      refetch();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update event",
        variant: "destructive"
      });
    }
  }, [updateScheduleBlock, updateExam, updateAssignment, refetch, toast]);

  const handleTimeSlotClick = useCallback((date: Date, hour: number) => {
    // This could open a quick event creation dialog
    console.log('Time slot clicked:', date, hour);
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    // This could open a day agenda or quick event creation
    console.log('Day clicked:', date);
  }, []);

  const handleEventContextMenu = useCallback((event: CalendarEvent, x: number, y: number) => {
    setContextMenu({ event, x, y });
  }, []);

  const handleEventEdit = useCallback((event: CalendarEvent) => {
    toast({
      title: "Edit Event",
      description: `Editing ${event.title}`,
    });
    setContextMenu(null);
  }, [toast]);

  const handleEventDelete = useCallback((event: CalendarEvent) => {
    toast({
      title: "Delete Event", 
      description: `Deleted ${event.title}`,
      variant: "destructive"
    });
    setContextMenu(null);
  }, [toast]);

  const handleEventDuplicate = useCallback((event: CalendarEvent) => {
    toast({
      title: "Duplicate Event",
      description: `Duplicated ${event.title}`,
    });
    setContextMenu(null);
  }, [toast]);

  const handleEventReschedule = useCallback((event: CalendarEvent) => {
    toast({
      title: "Reschedule Event",
      description: `Rescheduling ${event.title}`,
    });
    setContextMenu(null);
  }, [toast]);

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center space-y-4">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-48 mx-auto"></div>
              <div className="h-3 bg-muted rounded animate-pulse w-32 mx-auto"></div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const conflictIds = conflicts.map(c => c.eventId);

  return (
    <>
      <Card className="flex flex-col">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Academic Calendar</h2>
            {conflicts.length > 0 && (
              <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-md">
                {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
          
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="week" className="flex items-center gap-1">
                <Grid3x3 className="h-3 w-3" />
                <span className="hidden sm:inline">Week</span>
              </TabsTrigger>
              <TabsTrigger value="month" className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                <span className="hidden sm:inline">Month</span>
              </TabsTrigger>
              <TabsTrigger value="agenda" className="flex items-center gap-1">
                <List className="h-3 w-3" />
                <span className="hidden sm:inline">Agenda</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 p-4">
          <Tabs value={activeView} className="w-full h-full">
            <TabsContent value="week" className="mt-0 h-full">
              <EnhancedWeekView
                selectedDate={selectedDate}
                onDateChange={onDateChange}
                events={events}
                onEventClick={handleEventClick}
                onEventUpdate={handleEventUpdate}
                onTimeSlotClick={handleTimeSlotClick}
                conflicts={conflictIds}
              />
            </TabsContent>
            
            <TabsContent value="month" className="mt-0 h-full">
              <EnhancedMonthView
                selectedDate={selectedDate}
                onDateChange={onDateChange}
                events={events}
                onEventClick={handleEventClick}
                onDayClick={handleDayClick}
                conflicts={conflictIds}
              />
            </TabsContent>
            
            <TabsContent value="agenda" className="mt-0 h-full">
              <EnhancedAgendaView
                selectedDate={selectedDate}
                onDateChange={onDateChange}
                events={events}
                onEventClick={handleEventClick}
                conflicts={conflictIds}
              />
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      {/* Context Menu - Implementation would go here */}
    </>
  );
}