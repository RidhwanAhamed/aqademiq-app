import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, Users, GraduationCap, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarView } from '@/components/calendar/CalendarView';
import { EnhancedCalendarView } from '@/components/calendar/EnhancedCalendarView';
import { NativeCalendarView } from '@/components/calendar/NativeCalendarView';
import { AddClassDialog } from '@/components/calendar/AddClassDialog';
import { HolidayManager } from '@/components/HolidayManager';
import { useSchedule, type ScheduleBlock } from '@/hooks/useSchedule';
import { useAssignments } from '@/hooks/useAssignments';
import { useExams } from '@/hooks/useExams';
import { useHolidays } from '@/hooks/useHolidays';
import { useOptimizedRealtimeCalendar } from '@/hooks/useOptimizedRealtimeCalendar';
import { format, isToday, isWithinInterval, parseISO } from 'date-fns';
import { CalendarErrorBoundaryWrapper } from '@/components/calendar/ErrorBoundary';
import { MemoizedQuickStats } from '@/components/MemoizedQuickStats';

export default function Calendar() {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [activeTab, setActiveTab] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Use optimized calendar hook for real-time events
  const { events, loading: calendarLoading } = useOptimizedRealtimeCalendar();
  
  // Keep existing hooks for statistics (memoized)
  const { scheduleBlocks, exams, loading: scheduleLoading, addScheduleBlock, updateScheduleBlock } = useSchedule();
  const { assignments, loading: assignmentsLoading } = useAssignments();
  const { exams: examsList, loading: examsLoading } = useExams();
  const { holidays } = useHolidays();

  const loading = scheduleLoading || assignmentsLoading || examsLoading;

  // Memoized calculations for better performance
  const todayClasses = useMemo(() => {
    return scheduleBlocks.filter(block => {
      if (!block.is_recurring) return false;
      const today = new Date();
      return block.day_of_week === today.getDay();
    }).length;
  }, [scheduleBlocks]);

  const todayAssignments = useMemo(() => {
    return assignments.filter(assignment => 
      isToday(new Date(assignment.due_date))
    ).length;
  }, [assignments]);

  const weeklyStudyHours = useMemo(() => {
    return scheduleBlocks.reduce((total, block) => {
      const start = new Date(`2000-01-01T${block.start_time}`);
      const end = new Date(`2000-01-01T${block.end_time}`);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + duration;
    }, 0);
  }, [scheduleBlocks]);

  const upcomingExams = useMemo(() => {
    return examsList.filter(exam => 
      new Date(exam.exam_date) > new Date()
    ).length;
  }, [examsList]);

  // Memoized active holidays calculation
  const activeHolidays = useMemo(() => {
    return holidays.filter(holiday => {
      const today = new Date();
      const startDate = parseISO(holiday.start_date);
      const endDate = parseISO(holiday.end_date);
      return isWithinInterval(today, { start: startDate, end: endDate });
    });
  }, [holidays]);

  // Memoized wrapper functions for better performance
  const handleAddScheduleBlock = useCallback(async (data: Omit<ScheduleBlock, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      await addScheduleBlock(data);
      return true;
    } catch (error) {
      return false;
    }
  }, [addScheduleBlock]);

  const handleUpdateScheduleBlock = useCallback(async (id: string, updates: Partial<ScheduleBlock>): Promise<boolean> => {
    try {
      await updateScheduleBlock(id, updates);
      return true;
    } catch (error) {
      return false;
    }
  }, [updateScheduleBlock]);

  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground">Manage your academic schedule and holidays</p>
          {activeHolidays.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">
                Currently on holiday: {activeHolidays[0].name}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <AddClassDialog />
        </div>
      </div>

      {/* Quick Stats - Memoized for better performance */}
      <MemoizedQuickStats
        todayClasses={todayClasses}
        weeklyStudyHours={weeklyStudyHours}
        todayAssignments={todayAssignments}
        activeHolidaysCount={activeHolidays.length}
        upcomingExams={upcomingExams}
        loading={loading}
      />

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="holidays">
            <MapPin className="w-4 h-4 mr-2" />
            Holiday Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          {/* Optimized Calendar View */}
          {calendarLoading ? (
            <Card className="bg-gradient-card">
              <CardContent className="p-12">
                <div className="text-center text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-4 animate-spin" />
                  <p>Loading your schedule...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <CalendarErrorBoundaryWrapper>
              <NativeCalendarView
                selectedDate={currentDate}
                onDateChange={handleDateChange}
              />
            </CalendarErrorBoundaryWrapper>
          )}
        </TabsContent>

        <TabsContent value="holidays" className="space-y-4">
          <HolidayManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}