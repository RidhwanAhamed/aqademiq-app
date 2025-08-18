import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  NodeResizer,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { useRealtimeCalendar, CalendarEvent } from '@/hooks/useRealtimeCalendar';

interface CalendarEventNodeData {
  event: CalendarEvent;
  onUpdate: (updates: Partial<CalendarEvent>) => void;
  onResize: (width: number, height: number) => void;
}

// Custom Event Node Component
function CalendarEventNode({ data }: { data: CalendarEventNodeData }) {
  const { event, onUpdate } = data;
  
  const handleTitleChange = (newTitle: string) => {
    onUpdate({ title: newTitle });
  };

  return (
    <div className="relative">
      <NodeResizer 
        minWidth={120} 
        minHeight={30}
        handleStyle={{
          background: 'hsl(var(--primary))',
          width: '6px',
          height: '6px',
          border: 'none',
        }}
      />
      <div 
        className="rounded-md px-2 py-1 text-xs text-white shadow-md cursor-move border border-white/20"
        style={{ 
          backgroundColor: `hsl(var(--${event.color}))`,
          minWidth: '120px',
          minHeight: '30px'
        }}
      >
        <div className="font-medium truncate">
          {event.title}
        </div>
        {event.location && (
          <div className="text-white/80 truncate text-[10px]">
            {event.location}
          </div>
        )}
        <div className="text-white/60 text-[10px]">
          {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
        </div>
      </div>
    </div>
  );
}

// Time Grid Node Component
function TimeGridNode({ data }: { data: { hour: number; isHour?: boolean } }) {
  const { hour, isHour } = data;
  
  return (
    <div className={`border-r border-border/20 ${isHour ? 'border-t border-border/40' : ''}`}>
      {isHour && (
        <div className="text-xs text-muted-foreground p-1 min-w-[50px]">
          {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
        </div>
      )}
    </div>
  );
}

// Day Header Node Component  
function DayHeaderNode({ data }: { data: { date: Date; isToday: boolean } }) {
  const { date, isToday } = data;
  
  return (
    <div className={`text-center p-2 border-b border-border ${
      isToday ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
    }`}>
      <div className="text-sm">{format(date, 'EEE')}</div>
      <div className={`text-lg ${isToday ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
        {format(date, 'd')}
      </div>
    </div>
  );
}

const nodeTypes = {
  calendarEvent: CalendarEventNode,
  timeGrid: TimeGridNode,
  dayHeader: DayHeaderNode,
};

interface ReactFlowCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function ReactFlowCalendar({ selectedDate, onDateChange }: ReactFlowCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(selectedDate, { weekStartsOn: 1 }));
  const { 
    events, 
    loading, 
    updateScheduleBlock, 
    updateExam, 
    updateAssignment,
    applyOptimisticUpdate,
    clearOptimisticUpdate 
  } = useRealtimeCalendar();

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  }, [currentWeek]);

  // Generate time slots (6 AM to 11 PM)
  const timeSlots = useMemo(() => {
    return Array.from({ length: 17 }, (_, i) => i + 6);
  }, []);

  // Convert events to React Flow nodes
  const [nodes, setNodes, onNodesChange] = useNodesState(
    useMemo(() => {
      const nodes: Node[] = [];
      const SLOT_HEIGHT = 60;
      const SLOT_WIDTH = 140;
      const HEADER_HEIGHT = 80;
      const TIME_COLUMN_WIDTH = 60;

      // Day header nodes
      weekDays.forEach((day, dayIndex) => {
        nodes.push({
          id: `day-header-${dayIndex}`,
          type: 'dayHeader',
          position: { 
            x: TIME_COLUMN_WIDTH + (dayIndex * SLOT_WIDTH), 
            y: 0 
          },
          data: { 
            date: day, 
            isToday: isSameDay(day, new Date()) 
          },
          draggable: false,
          selectable: false,
        });
      });

      // Time grid nodes
      timeSlots.forEach((hour, hourIndex) => {
        // Time label
        nodes.push({
          id: `time-${hour}`,
          type: 'timeGrid',
          position: { x: 0, y: HEADER_HEIGHT + (hourIndex * SLOT_HEIGHT) },
          data: { hour, isHour: true },
          draggable: false,
          selectable: false,
        });

        // Grid cells for each day
        weekDays.forEach((day, dayIndex) => {
          nodes.push({
            id: `grid-${dayIndex}-${hour}`,
            type: 'timeGrid',
            position: { 
              x: TIME_COLUMN_WIDTH + (dayIndex * SLOT_WIDTH), 
              y: HEADER_HEIGHT + (hourIndex * SLOT_HEIGHT) 
            },
            data: { hour },
            draggable: false,
            selectable: false,
          });
        });
      });

      // Event nodes
      events.forEach((event) => {
        const eventDay = weekDays.findIndex(day => isSameDay(day, event.start));
        if (eventDay === -1) return; // Event not in current week

        const startHour = event.start.getHours();
        const startMinute = event.start.getMinutes();
        const endHour = event.end.getHours();
        const endMinute = event.end.getMinutes();

        const startSlot = startHour - 6 + (startMinute / 60);
        const duration = (endHour - startHour) + ((endMinute - startMinute) / 60);

        const x = TIME_COLUMN_WIDTH + (eventDay * SLOT_WIDTH) + 2;
        const y = HEADER_HEIGHT + (startSlot * SLOT_HEIGHT) + 2;
        const height = Math.max(duration * SLOT_HEIGHT - 4, 30);

        nodes.push({
          id: event.id,
          type: 'calendarEvent',
          position: { x, y },
          data: {
            event,
            onUpdate: (updates: Partial<CalendarEvent>) => {
              applyOptimisticUpdate(event.id, updates);
              handleEventUpdate(event, updates);
            },
            onResize: (width: number, height: number) => {
              handleEventResize(event, height);
            }
          },
          style: {
            width: SLOT_WIDTH - 4,
            height,
          },
          draggable: true,
        });
      });

      return nodes;
    }, [weekDays, timeSlots, events, applyOptimisticUpdate])
  );

  const [edges] = useEdgesState([]);

  // Handle event updates
  const handleEventUpdate = useCallback(async (event: CalendarEvent, updates: Partial<CalendarEvent>) => {
    try {
      const [type, id] = event.id.split('-');
      
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
      
      clearOptimisticUpdate(event.id);
    } catch (error) {
      console.error('Error updating event:', error);
      clearOptimisticUpdate(event.id);
    }
  }, [updateScheduleBlock, updateExam, updateAssignment, clearOptimisticUpdate]);

  // Handle event resizing
  const handleEventResize = useCallback((event: CalendarEvent, newHeight: number) => {
    const SLOT_HEIGHT = 60;
    const newDuration = newHeight / SLOT_HEIGHT;
    const newEnd = new Date(event.start.getTime() + (newDuration * 60 * 60 * 1000));
    
    handleEventUpdate(event, { end: newEnd });
  }, [handleEventUpdate]);

  // Handle node drag end
  const handleNodeDragStop = useCallback((event: any, node: Node) => {
    if (!node.id.includes('schedule-') && !node.id.includes('exam-') && !node.id.includes('assignment-')) return;
    
    const SLOT_HEIGHT = 60;
    const SLOT_WIDTH = 140;
    const HEADER_HEIGHT = 80;
    const TIME_COLUMN_WIDTH = 60;

    const dayIndex = Math.floor((node.position.x - TIME_COLUMN_WIDTH) / SLOT_WIDTH);
    const hourSlot = (node.position.y - HEADER_HEIGHT) / SLOT_HEIGHT;
    const hour = Math.floor(hourSlot) + 6;
    const minute = Math.round((hourSlot % 1) * 60);

    if (dayIndex >= 0 && dayIndex < 7 && hour >= 6 && hour <= 22) {
      const newDate = addDays(currentWeek, dayIndex);
      const newStart = new Date(newDate);
      newStart.setHours(hour, minute, 0, 0);

      const calendarEvent = events.find(e => e.id === node.id);
      if (calendarEvent) {
        const duration = calendarEvent.end.getTime() - calendarEvent.start.getTime();
        const newEnd = new Date(newStart.getTime() + duration);
        
        handleEventUpdate(calendarEvent, { start: newStart, end: newEnd });
      }
    }
  }, [currentWeek, events, handleEventUpdate]);

  // Navigation
  const handlePrevWeek = () => setCurrentWeek(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeek(prev => addWeeks(prev, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentWeek(startOfWeek(today, { weekStartsOn: 1 }));
    onDateChange(today);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[800px]">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {format(currentWeek, 'MMMM yyyy')}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* React Flow Calendar */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          fitView={false}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.5}
          maxZoom={2}
          snapToGrid
          snapGrid={[20, 20]}
        >
          <Background gap={20} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </Card>
  );
}