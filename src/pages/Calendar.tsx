import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, Users, GraduationCap } from "lucide-react";
import { CalendarView } from '@/components/calendar/CalendarView';
import { EnhancedCalendarView } from '@/components/calendar/EnhancedCalendarView';
import { AddClassDialog } from '@/components/calendar/AddClassDialog';
import { useSchedule, type ScheduleBlock } from '@/hooks/useSchedule';
import { useAssignments } from '@/hooks/useAssignments';
import { useExams } from '@/hooks/useExams';
import { format, isToday } from 'date-fns';

export default function Calendar() {
  const [view, setView] = useState<'week' | 'month'>('week');
  const { scheduleBlocks, exams, loading: scheduleLoading, addScheduleBlock, updateScheduleBlock } = useSchedule();
  const { assignments, loading: assignmentsLoading } = useAssignments();
  const { exams: examsList, loading: examsLoading } = useExams();

  const loading = scheduleLoading || assignmentsLoading || examsLoading;

  // Calculate today's stats
  const todayClasses = scheduleBlocks.filter(block => {
    if (!block.is_recurring) return false;
    const today = new Date();
    return block.day_of_week === today.getDay();
  }).length;

  const todayAssignments = assignments.filter(assignment => 
    isToday(new Date(assignment.due_date))
  ).length;

  const weeklyStudyHours = scheduleBlocks.reduce((total, block) => {
    const start = new Date(`2000-01-01T${block.start_time}`);
    const end = new Date(`2000-01-01T${block.end_time}`);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return total + duration;
  }, 0);

  const upcomingExams = examsList.filter(exam => 
    new Date(exam.exam_date) > new Date()
  ).length;

  // Wrapper functions to match the expected interface
  const handleAddScheduleBlock = async (data: Omit<ScheduleBlock, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      await addScheduleBlock(data);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleUpdateScheduleBlock = async (id: string, updates: Partial<ScheduleBlock>): Promise<boolean> => {
    try {
      await updateScheduleBlock(id, updates);
      return true;
    } catch (error) {
      return false;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground">Manage your academic schedule</p>
        </div>
        <AddClassDialog />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Classes</p>
                <p className="text-2xl font-bold">{loading ? '...' : todayClasses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weekly Hours</p>
                <p className="text-2xl font-bold">{loading ? '...' : Math.round(weeklyStudyHours)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Users className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Today</p>
                <p className="text-2xl font-bold">{loading ? '...' : todayAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <GraduationCap className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Exams</p>
                <p className="text-2xl font-bold">{loading ? '...' : upcomingExams}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      {loading ? (
        <Card className="bg-gradient-card">
          <CardContent className="p-12">
            <div className="text-center text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-4 animate-spin" />
              <p>Loading your schedule...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EnhancedCalendarView
          scheduleBlocks={scheduleBlocks}
          exams={examsList}
          assignments={assignments}
          view={view}
          onViewChange={setView}
          onUpdateScheduleBlock={handleUpdateScheduleBlock}
          onAddScheduleBlock={handleAddScheduleBlock}
        />
      )}
    </div>
  );
}