import React, { useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarIcon, Grid3x3, List, Loader2, AlertTriangle, Clock, MapPin, ArrowLeft, Check } from 'lucide-react';
import { useRealtimeCalendar, CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { useConflictDetection } from '@/hooks/useConflictDetection';
import { EnhancedWeekView } from './EnhancedWeekView';
import { EnhancedMonthView } from './EnhancedMonthView';
import { EnhancedAgendaView } from './EnhancedAgendaView';
import { MobileWeekView } from './MobileWeekView';
import { MobileMonthView } from './MobileMonthView';
import { EventDetailSheet } from './EventDetailSheet';
import { EditEventDialog } from './EditEventDialog';
import { useEnhancedDragDrop } from '@/hooks/useEnhancedDragDrop';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import * as CalendarService from '@/services/calendarEventService';

interface NativeCalendarViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function NativeCalendarView({ selectedDate, onDateChange }: NativeCalendarViewProps) {
  const AUTO_RESOLVE_START_HOUR = 8;
  const AUTO_RESOLVE_END_HOUR = 22;
  const AUTO_RESOLVE_BUFFER_MIN = 15;
  const isMobile = useIsMobile();
  // Default to agenda on mobile for best readability
  const [activeView, setActiveView] = useState<'week' | 'month' | 'agenda'>('week');
  const [contextMenu, setContextMenu] = useState<{ 
    event: CalendarEvent; 
    x: number; 
    y: number; 
  } | null>(null);
  const [showConflictPanel, setShowConflictPanel] = useState(false);
  const [rescheduleEvent, setRescheduleEvent] = useState<CalendarEvent | null>(null);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isAutoResolving, setIsAutoResolving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  const { 
    events, 
    loading, 
    updateScheduleBlock, 
    updateExam, 
    updateAssignment,
    updateStudySession,
    deleteScheduleBlock,
    deleteExam,
    deleteAssignment,
    deleteStudySession,
    refetch 
  } = useRealtimeCalendar();

  const { 
    conflicts, 
    detectConflicts 
  } = useConflictDetection();

  // Handle event updates using the CalendarService
  const handleEventUpdate = useCallback(async (
    event: CalendarEvent,
    updates: Partial<CalendarEvent>,
    options?: { suppressToast?: boolean }
  ): Promise<boolean> => {
    const parsed = CalendarService.parseEventId(event.id);
    
    if (!parsed) {
      if (!options?.suppressToast) {
        toast({ title: "Error", description: "Invalid event ID", variant: "destructive" });
      }
      return false;
    }

    console.log('[NativeCalendarView] Updating event:', { eventId: event.id, type: parsed.type, updates });

    let result: CalendarService.EventUpdateResult;

    switch (parsed.type) {
      case 'schedule':
        result = await CalendarService.updateScheduleBlock(parsed.id, {
          start_time: updates.start ? format(updates.start, 'HH:mm:ss') : undefined,
          end_time: updates.end ? format(updates.end, 'HH:mm:ss') : undefined,
          day_of_week: updates.start ? updates.start.getDay() : undefined,
          title: updates.title,
          location: updates.location,
        });
        break;
      case 'exam':
        result = await CalendarService.updateExam(parsed.id, {
          exam_date: updates.start?.toISOString(),
          title: updates.title,
          location: updates.location,
        });
        break;
      case 'assignment':
        result = await CalendarService.updateAssignment(parsed.id, {
          due_date: updates.end?.toISOString(),
          title: updates.title,
        });
        break;
      case 'study_session':
        result = await CalendarService.updateStudySession(parsed.id, {
          scheduled_start: updates.start?.toISOString(),
          scheduled_end: updates.end?.toISOString(),
          title: updates.title,
        });
        break;
      default:
        result = { success: false, error: 'Unknown event type' };
    }

    if (result.success) {
      if (!options?.suppressToast) {
        toast({ title: "Event Updated", description: `${updates.title || event.title} updated successfully.` });
      }
      refetch();
    } else {
      if (!options?.suppressToast) {
        toast({ title: "Update Failed", description: result.error || "Failed to update event", variant: "destructive" });
      }
    }
    return result.success;
  }, [refetch, toast]);

  // Enhanced drag and drop functionality
  const {
    dragState,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    undoLastMove,
    canUndo
  } = useEnhancedDragDrop({
    events,
    onEventUpdate: handleEventUpdate,
    selectedDate,
    containerRef
  });

  // Detect conflicts whenever events change
  React.useEffect(() => {
    detectConflicts(events);
  }, [events, detectConflicts]);

  // Global mouse event handlers for drag and drop
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging) {
        handleDragMove(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      if (dragState.isDragging) {
        handleDragEnd();
      }
    };

    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging, handleDragMove, handleDragEnd]);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowDetailSheet(true);
  }, []);

  const handleTimeSlotClick = useCallback((date: Date, hour: number) => {
    console.log('Time slot clicked:', date, hour);
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    console.log('Day clicked:', date);
  }, []);

  const handleEventContextMenu = useCallback((event: CalendarEvent, x: number, y: number) => {
    setContextMenu({ event, x, y });
  }, []);

  const handleEventEdit = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEditDialog(true);
    setContextMenu(null);
  }, []);

  const handleEventDelete = useCallback(async (event: CalendarEvent): Promise<boolean> => {
    console.log('[NativeCalendarView] Deleting event:', event.id);
    
    const result = await CalendarService.deleteEvent(event.id);
    
    if (result.success) {
      refetch();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete event",
        variant: "destructive"
      });
    }

    setContextMenu(null);
    return result.success;
  }, [refetch, toast]);

  const handleEventDuplicate = useCallback((event: CalendarEvent) => {
    toast({
      title: "Duplicate Event",
      description: `Duplicated ${event.title}`,
    });
    setContextMenu(null);
  }, [toast]);

  const handleEventReschedule = useCallback((event: CalendarEvent) => {
    setRescheduleEvent(event);
    setNewStartTime(format(event.start, 'HH:mm'));
    setNewEndTime(format(event.end, 'HH:mm'));
    setShowConflictPanel(true);
    setContextMenu(null);
  }, []);

  const handleAutoResolveConflicts = useCallback(async () => {
    if (conflicts.length === 0 || isAutoResolving) return;

    setIsAutoResolving(true);

    try {
      const eventById = new Map(events.map((event) => [event.id, event]));
      const processed = new Set<string>();
      const updates: Array<{ event: CalendarEvent; start: Date; end: Date }> = [];

      const isFixedEvent = (event: CalendarEvent): boolean =>
        event.type === 'schedule' || event.type === 'exam';

      const addMinutes = (date: Date, minutes: number): Date =>
        new Date(date.getTime() + minutes * 60 * 1000);

      const clampIntoStudyWindow = (date: Date): Date => {
        const adjusted = new Date(date);
        const hour = adjusted.getHours();

        if (hour < AUTO_RESOLVE_START_HOUR) {
          adjusted.setHours(AUTO_RESOLVE_START_HOUR, 0, 0, 0);
          return adjusted;
        }

        if (hour >= AUTO_RESOLVE_END_HOUR) {
          adjusted.setDate(adjusted.getDate() + 1);
          adjusted.setHours(AUTO_RESOLVE_START_HOUR, 0, 0, 0);
        }

        return adjusted;
      };

      const nextValidSlot = (startFrom: Date, durationMs: number): { start: Date; end: Date } => {
        let slotStart = clampIntoStudyWindow(startFrom);
        let slotEnd = new Date(slotStart.getTime() + durationMs);

        while (slotEnd.getHours() > AUTO_RESOLVE_END_HOUR || (slotEnd.getHours() === AUTO_RESOLVE_END_HOUR && slotEnd.getMinutes() > 0)) {
          slotStart.setDate(slotStart.getDate() + 1);
          slotStart.setHours(AUTO_RESOLVE_START_HOUR, 0, 0, 0);
          slotEnd = new Date(slotStart.getTime() + durationMs);
        }

        return { start: slotStart, end: slotEnd };
      };

      // Build connected conflict groups so each overlapping chain is resolved together.
      for (const conflict of conflicts) {
        if (processed.has(conflict.eventId)) continue;

        const queue = [conflict.eventId];
        const groupIds = new Set<string>();

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (groupIds.has(current)) continue;
          groupIds.add(current);

          const linked = conflicts.find((c) => c.eventId === current);
          if (linked) {
            linked.conflictingEventIds.forEach((id) => {
              if (!groupIds.has(id)) queue.push(id);
            });
          }

          conflicts.forEach((c) => {
            if (c.conflictingEventIds.includes(current) && !groupIds.has(c.eventId)) {
              queue.push(c.eventId);
            }
          });
        }

        groupIds.forEach((id) => processed.add(id));

        const groupEvents = [...groupIds]
          .map((id) => eventById.get(id))
          .filter((event): event is CalendarEvent => Boolean(event));

        if (groupEvents.length <= 1) continue;

        const fixedEvents = groupEvents.filter(isFixedEvent).sort((a, b) => a.start.getTime() - b.start.getTime());
        const movableEvents = groupEvents
          .filter((event) => !isFixedEvent(event))
          .sort((a, b) => a.start.getTime() - b.start.getTime());

        if (movableEvents.length === 0) continue;

        let cursor = fixedEvents.length > 0
          ? new Date(Math.max(...fixedEvents.map((event) => event.end.getTime())))
          : new Date(Math.min(...groupEvents.map((event) => event.start.getTime())));

        cursor = addMinutes(cursor, AUTO_RESOLVE_BUFFER_MIN);

        for (const event of movableEvents) {
          const durationMs = Math.max(event.end.getTime() - event.start.getTime(), 30 * 60 * 1000);
          const slot = nextValidSlot(cursor, durationMs);
          updates.push({ event, start: slot.start, end: slot.end });
          cursor = addMinutes(slot.end, AUTO_RESOLVE_BUFFER_MIN);
        }
      }

      if (updates.length === 0) {
        toast({
          title: "No movable conflicts",
          description: "All detected conflicts involve fixed events only.",
        });
        return;
      }

      let successCount = 0;

      for (const update of updates) {
        const didUpdate = await handleEventUpdate(update.event, {
          start: update.start,
          end: update.end,
        }, { suppressToast: true });

        if (didUpdate) successCount += 1;
      }

      if (successCount === 0) {
        toast({
          title: "Auto resolve failed",
          description: "No events were updated. Please try again or reschedule manually.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: successCount === updates.length ? "Conflicts auto-resolved" : "Conflicts partially resolved",
        description: `Rescheduled ${successCount}/${updates.length} event${updates.length > 1 ? 's' : ''}.`,
        variant: successCount === updates.length ? "default" : "destructive",
      });
      setShowConflictPanel(false);
      setRescheduleEvent(null);
      setNewStartTime('');
      setNewEndTime('');
      refetch();
    } catch (error) {
      console.error('[NativeCalendarView] Auto resolve conflicts failed:', error);
      toast({
        title: "Auto resolve failed",
        description: "We couldn't auto-reschedule all conflicts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAutoResolving(false);
    }
  }, [conflicts, events, handleEventUpdate, isAutoResolving, refetch, toast]);

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-border gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h2 className="text-base sm:text-lg font-semibold">Academic Calendar</h2>
            {conflicts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConflictPanel(true)}
                className="text-[10px] sm:text-xs text-destructive bg-destructive/10 hover:bg-destructive/20 px-1.5 sm:px-2 py-0.5 sm:py-1 h-auto rounded-md"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
          
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="week" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
                <Grid3x3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Week</span>
              </TabsTrigger>
              <TabsTrigger value="month" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
                <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Month</span>
              </TabsTrigger>
              <TabsTrigger value="agenda" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
                <List className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Agenda</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 p-2 sm:p-4">
          <Tabs value={activeView} className="w-full h-full">
            <TabsContent value="week" className="mt-0 h-full">
              {isMobile ? (
                <MobileWeekView
                  selectedDate={selectedDate}
                  onDateChange={onDateChange}
                  events={events}
                  onEventClick={handleEventClick}
                  onEventUpdate={handleEventUpdate}
                  onTimeSlotClick={handleTimeSlotClick}
                  conflicts={conflictIds}
                />
              ) : (
                <EnhancedWeekView
                  selectedDate={selectedDate}
                  onDateChange={onDateChange}
                  events={events}
                  onEventClick={handleEventClick}
                  onEventUpdate={handleEventUpdate}
                  onTimeSlotClick={handleTimeSlotClick}
                  conflicts={conflictIds}
                  onEventEdit={handleEventEdit}
                  onEventDelete={handleEventDelete}
                  onEventDuplicate={handleEventDuplicate}
                  onEventReschedule={handleEventReschedule}
                />
              )}
            </TabsContent>
            
            <TabsContent value="month" className="mt-0 h-full">
              {isMobile ? (
                <MobileMonthView
                  selectedDate={selectedDate}
                  onDateChange={onDateChange}
                  events={events}
                  onEventClick={handleEventClick}
                  onDayClick={handleDayClick}
                  conflicts={conflictIds}
                />
              ) : (
                <EnhancedMonthView
                  selectedDate={selectedDate}
                  onDateChange={onDateChange}
                  events={events}
                  onEventClick={handleEventClick}
                  onDayClick={handleDayClick}
                  conflicts={conflictIds}
                  onEventEdit={handleEventEdit}
                  onEventDelete={handleEventDelete}
                  onEventDuplicate={handleEventDuplicate}
                  onEventReschedule={handleEventReschedule}
                />
              )}
            </TabsContent>
            
            <TabsContent value="agenda" className="mt-0 h-full">
              <EnhancedAgendaView
                selectedDate={selectedDate}
                onDateChange={onDateChange}
                events={events}
                onEventClick={handleEventClick}
                conflicts={conflictIds}
                onOpenConflictPanel={() => setShowConflictPanel(true)}
                onEventEdit={handleEventEdit}
                onEventDelete={handleEventDelete}
                onEventDuplicate={handleEventDuplicate}
                onEventReschedule={handleEventReschedule}
              />
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      {/* Conflict Resolution Sheet */}
      <Sheet open={showConflictPanel} onOpenChange={(open) => {
        setShowConflictPanel(open);
        if (!open) {
          setRescheduleEvent(null);
          setNewStartTime('');
          setNewEndTime('');
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            {rescheduleEvent ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-fit -ml-2 mb-2"
                  onClick={() => {
                    setRescheduleEvent(null);
                    setNewStartTime('');
                    setNewEndTime('');
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to conflicts
                </Button>
                <SheetTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Reschedule Event
                </SheetTitle>
                <SheetDescription>
                  Set a new time for "{rescheduleEvent.title}"
                </SheetDescription>
              </>
            ) : (
              <>
                <SheetTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Schedule Conflicts
                </SheetTitle>
                <SheetDescription>
                  {conflicts.length} conflicting event{conflicts.length > 1 ? 's' : ''} detected
                </SheetDescription>
                {conflicts.length > 0 && (
                  <Button
                    className="mt-3 w-full"
                    onClick={handleAutoResolveConflicts}
                    disabled={isAutoResolving}
                  >
                    {isAutoResolving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Auto-resolving conflicts...
                      </>
                    ) : (
                      'Auto Resolve All Conflicts'
                    )}
                  </Button>
                )}
              </>
            )}
          </SheetHeader>
          
          {rescheduleEvent ? (
            /* Reschedule Form */
            <div className="mt-6 space-y-6">
              {/* Current Time Display */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Current Time</p>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(rescheduleEvent.start, 'MMM d, yyyy')} • {format(rescheduleEvent.start, 'HH:mm')} - {format(rescheduleEvent.end, 'HH:mm')}
                  </span>
                </div>
              </div>
              
              {/* New Time Input */}
              <div className="space-y-4">
                <p className="text-sm font-medium">New Time</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time" className="text-xs text-muted-foreground">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="h-12 sm:h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time" className="text-xs text-muted-foreground">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className="h-12 sm:h-10"
                    />
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  className="flex-1"
                  disabled={!newStartTime || !newEndTime}
                  onClick={async () => {
                    if (!newStartTime || !newEndTime) return;
                    
                    // Create new Date objects with updated times
                    const [startHour, startMin] = newStartTime.split(':').map(Number);
                    const [endHour, endMin] = newEndTime.split(':').map(Number);
                    
                    const newStart = new Date(rescheduleEvent.start);
                    newStart.setHours(startHour, startMin, 0, 0);
                    
                    const newEnd = new Date(rescheduleEvent.end);
                    newEnd.setHours(endHour, endMin, 0, 0);
                    
                    await handleEventUpdate(rescheduleEvent, {
                      start: newStart,
                      end: newEnd
                    });
                    
                    setRescheduleEvent(null);
                    setNewStartTime('');
                    setNewEndTime('');
                    setShowConflictPanel(false);
                  }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Save New Time
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRescheduleEvent(null);
                    setNewStartTime('');
                    setNewEndTime('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* Conflict List */
            <div className="mt-6 space-y-4">
              {conflicts.map((conflict) => {
                const conflictingEvents = events.filter(e => 
                  e.id === conflict.eventId || conflict.conflictingEventIds.includes(e.id)
                );
                
                return (
                  <Card key={conflict.eventId} className="p-4 border-destructive/30">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full flex-shrink-0 ${
                        conflict.severity === 'major' 
                          ? 'bg-destructive/20 text-destructive' 
                          : 'bg-warning/20 text-warning'
                      }`}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <p className="text-sm font-medium">{conflict.message}</p>
                        
                        {/* Event Selection */}
                        <RadioGroup 
                          className="space-y-2"
                          onValueChange={(eventId) => {
                            const selected = conflictingEvents.find(e => e.id === eventId);
                            if (selected) {
                              setRescheduleEvent(selected);
                              setNewStartTime(format(selected.start, 'HH:mm'));
                              setNewEndTime(format(selected.end, 'HH:mm'));
                            }
                          }}
                        >
                          {conflictingEvents.map((evt) => (
                            <div 
                              key={evt.id} 
                              className="flex items-start gap-3 text-xs bg-muted/50 p-3 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                            >
                              <RadioGroupItem value={evt.id} id={evt.id} className="mt-0.5" />
                              <label htmlFor={evt.id} className="flex-1 cursor-pointer">
                                <p className="font-medium text-foreground">{evt.title}</p>
                                <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {format(evt.start, 'hh:mm a')} - {format(evt.end, 'hh:mm a')}
                                  </span>
                                </div>
                                {evt.location && (
                                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    <span>{evt.location}</span>
                                  </div>
                                )}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-xs h-8 text-muted-foreground"
                            onClick={() => {
                              toast({
                                title: "Conflict Ignored",
                                description: "You can manually resolve this later.",
                              });
                            }}
                          >
                            Ignore All
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
              
              {conflicts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No conflicts detected</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Event Detail Sheet */}
      <EventDetailSheet
        event={selectedEvent}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        onEdit={handleEventEdit}
        onDelete={handleEventDelete}
      />

      {/* Edit Event Dialog */}
      <EditEventDialog
        event={selectedEvent}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleEventUpdate}
      />
    </>
  );
}
