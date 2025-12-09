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
import { format, isWithinInterval, parseISO } from 'date-fns';
import { getTodayDayOfWeek, isSameDayInTimezone, getUserTimezone } from '@/utils/timezone';
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

  // Memoized calculations for better performance with timezone awareness
  const userTimezone = getUserTimezone();
  const todayDayOfWeek = getTodayDayOfWeek(userTimezone);
  const now = new Date();
  
  const todayClasses = useMemo(() => {
    return scheduleBlocks.filter(block => {
      if (!block.is_recurring) return false;
      return block.day_of_week === todayDayOfWeek;
    }).length;
  }, [scheduleBlocks, todayDayOfWeek]);

  const todayAssignments = useMemo(() => {
    return assignments.filter(assignment => 
      isSameDayInTimezone(new Date(assignment.due_date), now, userTimezone)
    ).length;
  }, [assignments, now, userTimezone]);

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
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your academic schedule</p>
          {activeHolidays.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm text-primary font-medium">
                Currently on holiday: {activeHolidays[0].name}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <AddClassDialog />
        </div>
      </div>

      {/* Quick Stats - Hidden on mobile for cleaner view */}
      <div className="hidden sm:block">
        <MemoizedQuickStats
          todayClasses={todayClasses}
          weeklyStudyHours={weeklyStudyHours}
          todayAssignments={todayAssignments}
          activeHolidaysCount={activeHolidays.length}
          upcomingExams={upcomingExams}
          loading={loading}
        />
      </div>

      {/* Mobile Quick Stats - Compact horizontal scroll */}
      <div className="sm:hidden overflow-x-auto -mx-3 px-3">
        <div className="flex gap-2 min-w-max pb-2">
          <Card className="bg-gradient-card flex-shrink-0 w-28">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">Classes</p>
              <p className="text-lg font-bold">{todayClasses}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card flex-shrink-0 w-28">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">Study Hrs</p>
              <p className="text-lg font-bold">{weeklyStudyHours.toFixed(1)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card flex-shrink-0 w-28">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">Due Today</p>
              <p className="text-lg font-bold">{todayAssignments}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card flex-shrink-0 w-28">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">Exams</p>
              <p className="text-lg font-bold">{upcomingExams}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-10">
          <TabsTrigger value="calendar" className="text-xs sm:text-sm">
            <CalendarIcon className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Calendar</span>
            <span className="xs:hidden">Cal</span>
          </TabsTrigger>
          <TabsTrigger value="holidays" className="text-xs sm:text-sm">
            <MapPin className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Holidays</span>
            <span className="xs:hidden">Hol</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-3 sm:space-y-4">
          {calendarLoading ? (
            <Card className="bg-gradient-card">
              <CardContent className="p-8 sm:p-12">
                <div className="text-center text-muted-foreground">
                  <Clock className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-4 animate-spin" />
                  <p className="text-sm sm:text-base">Loading your schedule...</p>
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