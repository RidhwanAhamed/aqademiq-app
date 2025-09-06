import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AcademicSyncOptions {
  auto_study_blocks: boolean;
  study_session_duration: number;
  exam_prep_days: number;
  assignment_buffer_hours: number;
  color_coding_enabled: boolean;
  weekend_study_allowed: boolean;
}

interface StudyBlock {
  id: string;
  title: string;
  course_id: string;
  start_time: string;
  end_time: string;
  date: string;
  type: 'study' | 'review' | 'exam_prep';
  auto_generated: boolean;
}

interface DeadlineAlert {
  id: string;
  assignment_id?: string;
  exam_id?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  days_remaining: number;
  escalation_level: number;
}

export function useAcademicCalendarSync() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [syncOptions, setSyncOptions] = useState<AcademicSyncOptions>({
    auto_study_blocks: true,
    study_session_duration: 120,
    exam_prep_days: 14,
    assignment_buffer_hours: 2,
    color_coding_enabled: true,
    weekend_study_allowed: true,
  });
  
  const [generatedStudyBlocks, setGeneratedStudyBlocks] = useState<StudyBlock[]>([]);
  const [deadlineAlerts, setDeadlineAlerts] = useState<DeadlineAlert[]>([]);
  const [loading, setLoading] = useState(false);

  // Load academic sync preferences (using existing table)
  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      // Use existing table or localStorage as fallback
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // For now, use default values - can be extended to store in profiles table
      setSyncOptions({
        auto_study_blocks: true,
        study_session_duration: 120,
        exam_prep_days: 14,
        assignment_buffer_hours: 2,
        color_coding_enabled: true,
        weekend_study_allowed: true,
      });
    };

    loadPreferences();
  }, [user]);

  // Auto-generate study blocks for exams
  const generateExamStudyBlocks = useCallback(async (examId: string) => {
    if (!user || !syncOptions.auto_study_blocks) return [];

    try {
      const { data: exam } = await supabase
        .from('exams')
        .select('*, courses(name, color)')
        .eq('id', examId)
        .single();

      if (!exam) return [];

      const examDate = new Date(exam.exam_date);
      const studyStartDate = new Date(examDate);
      studyStartDate.setDate(studyStartDate.getDate() - syncOptions.exam_prep_days);

      const studyBlocks: StudyBlock[] = [];
      const totalStudyHours = exam.study_hours_planned || 20;
      const sessionDuration = syncOptions.study_session_duration / 60; // Convert to hours
      const sessionsNeeded = Math.ceil(totalStudyHours / sessionDuration);

      // Distribute study sessions across available days
      const availableDays = [];
      for (let d = new Date(studyStartDate); d < examDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (syncOptions.weekend_study_allowed || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
          availableDays.push(new Date(d));
        }
      }

      const sessionsPerDay = Math.ceil(sessionsNeeded / availableDays.length);

      for (let i = 0; i < Math.min(sessionsNeeded, availableDays.length * sessionsPerDay); i++) {
        const dayIndex = Math.floor(i / sessionsPerDay);
        const sessionOfDay = i % sessionsPerDay;
        
        if (dayIndex < availableDays.length) {
          const date = availableDays[dayIndex];
          const startHour = 9 + (sessionOfDay * 3); // Space sessions 3 hours apart
          
          if (startHour < 18) { // Don't schedule past 6 PM
            studyBlocks.push({
              id: `study-${examId}-${i}`,
              title: `Study: ${exam.title}`,
              course_id: exam.course_id,
              start_time: `${startHour.toString().padStart(2, '0')}:00`,
              end_time: `${(startHour + sessionDuration).toString().padStart(2, '0')}:00`,
              date: date.toISOString().split('T')[0],
              type: i < sessionsNeeded * 0.7 ? 'study' : 'review',
              auto_generated: true,
            });
          }
        }
      }

      setGeneratedStudyBlocks(prev => [...prev, ...studyBlocks]);
      return studyBlocks;
    } catch (error) {
      console.error('Error generating exam study blocks:', error);
      return [];
    }
  }, [user, syncOptions]);

  // Generate assignment deadline alerts with escalation
  const generateDeadlineAlerts = useCallback(async () => {
    if (!user) return [];

    try {
      const now = new Date();
      const { data: assignments } = await supabase
        .from('assignments')
        .select('*, courses(name, color)')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gte('due_date', now.toISOString());

      const alerts: DeadlineAlert[] = [];

      assignments?.forEach(assignment => {
        const dueDate = new Date(assignment.due_date);
        const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        let escalationLevel = 0;
        let message = '';

        if (daysRemaining <= 1) {
          severity = 'critical';
          escalationLevel = 3;
          message = `URGENT: ${assignment.title} is due in ${daysRemaining} day(s)!`;
        } else if (daysRemaining <= 3) {
          severity = 'high';
          escalationLevel = 2;
          message = `${assignment.title} is due in ${daysRemaining} days`;
        } else if (daysRemaining <= 7) {
          severity = 'medium';
          escalationLevel = 1;
          message = `${assignment.title} is due next week (${daysRemaining} days)`;
        } else if (daysRemaining <= 14) {
          severity = 'low';
          message = `Upcoming: ${assignment.title} is due in ${daysRemaining} days`;
        }

        if (message) {
          alerts.push({
            id: `alert-${assignment.id}`,
            assignment_id: assignment.id,
            severity,
            message,
            days_remaining: daysRemaining,
            escalation_level: escalationLevel,
          });
        }
      });

      // Sort by escalation level and days remaining
      alerts.sort((a, b) => {
        if (a.escalation_level !== b.escalation_level) {
          return b.escalation_level - a.escalation_level;
        }
        return a.days_remaining - b.days_remaining;
      });

      setDeadlineAlerts(alerts);
      return alerts;
    } catch (error) {
      console.error('Error generating deadline alerts:', error);
      return [];
    }
  }, [user]);

  // Auto-schedule study sessions based on workload
  const autoScheduleStudySessions = useCallback(async () => {
    if (!user || !syncOptions.auto_study_blocks) return;

    setLoading(true);
    try {
      // Get upcoming assignments and exams
      const { data: assignments } = await supabase
        .from('assignments')
        .select('*, courses(name, color)')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gte('due_date', new Date().toISOString())
        .order('due_date');

      const { data: exams } = await supabase
        .from('exams')
        .select('*, courses(name, color)')
        .eq('user_id', user.id)
        .gte('exam_date', new Date().toISOString())
        .order('exam_date');

      // Generate study blocks for each exam
      for (const exam of exams || []) {
        await generateExamStudyBlocks(exam.id);
      }

      // Generate study sessions for assignments
      const assignmentStudyBlocks: StudyBlock[] = [];
      
      assignments?.forEach((assignment, index) => {
        const dueDate = new Date(assignment.due_date);
        const studyDate = new Date(dueDate);
        studyDate.setHours(studyDate.getHours() - syncOptions.assignment_buffer_hours);
        
        const estimatedHours = assignment.estimated_hours || 2;
        const sessionDuration = Math.min(syncOptions.study_session_duration / 60, estimatedHours);

        assignmentStudyBlocks.push({
          id: `assignment-study-${assignment.id}`,
          title: `Work on: ${assignment.title}`,
          course_id: assignment.course_id,
          start_time: `${(14 + (index % 3)).toString().padStart(2, '0')}:00`,
          end_time: `${(14 + (index % 3) + sessionDuration).toString().padStart(2, '0')}:00`,
          date: studyDate.toISOString().split('T')[0],
          type: 'study',
          auto_generated: true,
        });
      });

      setGeneratedStudyBlocks(prev => [...prev, ...assignmentStudyBlocks]);

      toast({
        title: "Study Schedule Generated",
        description: `Created ${assignmentStudyBlocks.length} study sessions for your assignments.`,
      });
    } catch (error) {
      console.error('Error auto-scheduling study sessions:', error);
      toast({
        title: "Scheduling Failed",
        description: "Failed to auto-generate study schedule.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, syncOptions, generateExamStudyBlocks, toast]);

  // Update academic sync preferences (using localStorage for now)
  const updateSyncOptions = useCallback(async (newOptions: Partial<AcademicSyncOptions>) => {
    if (!user) return;

    const updatedOptions = { ...syncOptions, ...newOptions };
    setSyncOptions(updatedOptions);

    try {
      // Store in localStorage as fallback until we have proper table
      localStorage.setItem(`academic_sync_${user.id}`, JSON.stringify(updatedOptions));

      toast({
        title: "Preferences Updated",
        description: "Academic sync preferences have been saved.",
      });
    } catch (error) {
      console.error('Error updating sync options:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update sync preferences.",
        variant: "destructive",
      });
    }
  }, [user, syncOptions, toast]);

  // Create academic insights for calendar patterns
  const generateAcademicInsights = useCallback(async () => {
    if (!user) return [];

    try {
      const insights = [];
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Analyze upcoming workload
      const { data: upcomingWork } = await supabase
        .from('assignments')
        .select('*, courses(name)')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gte('due_date', now.toISOString())
        .lte('due_date', weekFromNow.toISOString());

      if (upcomingWork && upcomingWork.length > 3) {
        insights.push({
          type: 'workload_warning',
          title: 'Heavy Workload Ahead',
          description: `You have ${upcomingWork.length} assignments due this week. Consider starting early.`,
          priority: 2,
          action_items: [
            'Break down large assignments into smaller tasks',
            'Schedule dedicated study blocks',
            'Consider office hours for challenging assignments'
          ]
        });
      }

      // Check for exam preparation gaps
      const { data: upcomingExams } = await supabase
        .from('exams')
        .select('*, courses(name)')
        .eq('user_id', user.id)
        .gte('exam_date', now.toISOString())
        .lte('exam_date', new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString());

      upcomingExams?.forEach(exam => {
        const examDate = new Date(exam.exam_date);
        const daysUntilExam = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const plannedHours = exam.study_hours_planned || 10;
        const completedHours = exam.study_hours_completed || 0;
        const remainingHours = plannedHours - completedHours;

        if (remainingHours > 0 && daysUntilExam <= 7) {
          insights.push({
            type: 'exam_prep_alert',
            title: `${exam.title} Preparation`,
            description: `${remainingHours} study hours remaining for exam in ${daysUntilExam} days.`,
            priority: daysUntilExam <= 3 ? 1 : 2,
            action_items: [
              `Schedule ${Math.ceil(remainingHours / daysUntilExam)} hours per day`,
              'Review past assignments and notes',
              'Create a study guide or summary'
            ]
          });
        }
      });

      return insights;
    } catch (error) {
      console.error('Error generating academic insights:', error);
      return [];
    }
  }, [user]);

  // Refresh all academic calendar data
  const refreshAcademicData = useCallback(async () => {
    await Promise.all([
      autoScheduleStudySessions(),
      generateDeadlineAlerts(),
      generateAcademicInsights()
    ]);
  }, [autoScheduleStudySessions, generateDeadlineAlerts, generateAcademicInsights]);

  return {
    syncOptions,
    generatedStudyBlocks,
    deadlineAlerts,
    loading,
    generateExamStudyBlocks,
    generateDeadlineAlerts,
    autoScheduleStudySessions,
    updateSyncOptions,
    generateAcademicInsights,
    refreshAcademicData,
    clearGeneratedBlocks: () => setGeneratedStudyBlocks([]),
  };
}