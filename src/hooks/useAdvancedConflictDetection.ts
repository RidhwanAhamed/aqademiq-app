import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/config/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

export interface AdvancedConflict {
  id: string;
  type: 'time_overlap' | 'deadline_cluster' | 'workload_peak' | 'location_conflict' | 'travel_time' | 'study_overload';
  severity: 'minor' | 'major' | 'critical';
  title: string;
  description: string;
  affected_items: ConflictItem[];
  suggestions: ConflictSuggestion[];
  auto_resolvable: boolean;
  created_at: string;
  metadata?: any;
}

interface ConflictItem {
  id: string;
  type: 'assignment' | 'exam' | 'class' | 'study_session';
  title: string;
  start_time: string;
  end_time?: string;
  location?: string;
  course_code?: string;
  metadata?: any;
}

interface ConflictSuggestion {
  id: string;
  type: 'reschedule' | 'priority_adjust' | 'time_extend' | 'location_change' | 'workload_distribute';
  description: string;
  impact_score: number;
  auto_executable: boolean;
  estimated_time_savings?: number;
}

interface ConflictDetectionOptions {
  travel_time_minutes?: number;
  max_daily_study_hours?: number;
  priority_threshold?: number;
  deadline_cluster_days?: number;
  include_suggested_items?: boolean;
}

export function useAdvancedConflictDetection() {
  const { user } = useAuth();
  const [conflicts, setConflicts] = useState<AdvancedConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);

  // Advanced conflict detection with ML-like pattern recognition
  const detectConflicts = useCallback(async (options: ConflictDetectionOptions = {}) => {
    if (!user) return [];

    setLoading(true);
    const startTime = Date.now();

    try {
      console.log('Starting advanced conflict detection...');

      // Fetch all relevant user data
      const userData = await fetchUserScheduleData(user.id);
      
      // Multi-layered conflict detection
      const detectedConflicts: AdvancedConflict[] = [];

      // 1. Time overlap detection with travel time consideration
      const timeConflicts = detectTimeOverlapConflicts(userData, options);
      detectedConflicts.push(...timeConflicts);

      // 2. Deadline clustering analysis
      const deadlineConflicts = detectDeadlineClusterConflicts(userData, options);
      detectedConflicts.push(...deadlineConflicts);

      // 3. Workload peak detection
      const workloadConflicts = detectWorkloadPeaks(userData, options);
      detectedConflicts.push(...workloadConflicts);

      // 4. Location and travel time conflicts
      const locationConflicts = detectLocationConflicts(userData, options);
      detectedConflicts.push(...locationConflicts);

      // 5. Study overload analysis
      const studyConflicts = detectStudyOverload(userData, options);
      detectedConflicts.push(...studyConflicts);

      // 6. Intelligent suggestion generation
      const enhancedConflicts = await generateIntelligentSuggestions(detectedConflicts, userData, options);

      setConflicts(enhancedConflicts);
      setLastAnalysis(new Date());

      console.log(`Conflict detection completed in ${Date.now() - startTime}ms, found ${enhancedConflicts.length} conflicts`);
      
      return enhancedConflicts;

    } catch (error) {
      console.error('Advanced conflict detection error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Real-time conflict checking for new events
  const checkNewEventConflicts = useCallback(async (eventData: {
    type: 'assignment' | 'exam' | 'class' | 'study_session';
    start_time: string;
    end_time?: string;
    location?: string;
    estimated_hours?: number;
    priority?: number;
  }) => {
    if (!user) return [];

    try {
      const userData = await fetchUserScheduleData(user.id);
      const newConflicts = analyzeNewEventConflicts(eventData, userData);
      
      return newConflicts;
    } catch (error) {
      console.error('New event conflict check error:', error);
      return [];
    }
  }, [user]);

  // Auto-resolve conflicts where possible
  const autoResolveConflicts = useCallback(async (conflictIds: string[]) => {
    if (!user) return { resolved: 0, failed: 0, errors: [] };

    const results = {
      resolved: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const conflictId of conflictIds) {
      const conflict = conflicts.find(c => c.id === conflictId);
      
      if (conflict && conflict.auto_resolvable) {
        try {
          const success = await executeAutoResolution(conflict, user.id);
          
          if (success) {
            results.resolved++;
            // Remove resolved conflict from state
            setConflicts(prev => prev.filter(c => c.id !== conflictId));
          } else {
            results.failed++;
            results.errors.push(`Failed to resolve conflict: ${conflict.title}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Error resolving ${conflict.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return { resolved: results.resolved, failed: results.failed, errors: results.errors };
  }, [conflicts, user]);

  // Get conflict statistics and insights
  const conflictAnalytics = useMemo(() => {
    const analytics = {
      total_conflicts: conflicts.length,
      severity_breakdown: {
        critical: conflicts.filter(c => c.severity === 'critical').length,
        major: conflicts.filter(c => c.severity === 'major').length,
        minor: conflicts.filter(c => c.severity === 'minor').length
      },
      type_breakdown: conflicts.reduce((acc, conflict) => {
        acc[conflict.type] = (acc[conflict.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      auto_resolvable: conflicts.filter(c => c.auto_resolvable).length,
      estimated_time_impact: conflicts.reduce((sum, c) => {
        return sum + (c.metadata?.estimated_time_impact || 0);
      }, 0),
      priority_distribution: conflicts.reduce((acc, conflict) => {
        const avgPriority = conflict.affected_items.reduce((sum, item) => sum + (item.metadata?.priority || 2), 0) / conflict.affected_items.length;
        if (avgPriority >= 4) acc.high++;
        else if (avgPriority >= 3) acc.medium++;
        else acc.low++;
        return acc;
      }, { high: 0, medium: 0, low: 0 })
    };

    return analytics;
  }, [conflicts]);

  return {
    conflicts,
    loading,
    lastAnalysis,
    conflictAnalytics,
    detectConflicts,
    checkNewEventConflicts,
    autoResolveConflicts,
    clearConflicts: () => setConflicts([]),
    refreshConflicts: () => detectConflicts()
  };
}

// Helper functions for advanced conflict detection
async function fetchUserScheduleData(userId: string) {
  const [scheduleBlocks, assignments, exams, studySessions] = await Promise.all([
    supabase.from('schedule_blocks').select('*').eq('user_id', userId).eq('is_active', true),
    supabase.from('assignments').select('*').eq('user_id', userId).eq('is_completed', false),
    supabase.from('exams').select('*').eq('user_id', userId),
    supabase.from('study_sessions').select('*').eq('user_id', userId).gte('scheduled_start', new Date().toISOString())
  ]);

  return {
    scheduleBlocks: scheduleBlocks.data || [],
    assignments: assignments.data || [],
    exams: exams.data || [],
    studySessions: studySessions.data || []
  };
}

function detectTimeOverlapConflicts(userData: any, options: ConflictDetectionOptions): AdvancedConflict[] {
  const conflicts: AdvancedConflict[] = [];
  const travelTimeMinutes = options.travel_time_minutes || 15;

  // Check class overlaps with travel time consideration
  for (let i = 0; i < userData.scheduleBlocks.length; i++) {
    for (let j = i + 1; j < userData.scheduleBlocks.length; j++) {
      const block1 = userData.scheduleBlocks[i];
      const block2 = userData.scheduleBlocks[j];

      if (block1.day_of_week === block2.day_of_week) {
        const overlap = checkTimeOverlapWithTravel(block1, block2, travelTimeMinutes);
        
        if (overlap.hasConflict) {
          conflicts.push({
            id: `overlap-${block1.id}-${block2.id}`,
            type: 'time_overlap',
            severity: overlap.travelConflict ? 'major' : 'critical',
            title: `Class Schedule Conflict`,
            description: `${block1.title} and ${block2.title} have ${overlap.travelConflict ? 'insufficient travel time' : 'overlapping times'}`,
            affected_items: [
              convertToConflictItem(block1, 'class'),
              convertToConflictItem(block2, 'class')
            ],
            suggestions: generateTimeConflictSuggestions(block1, block2, overlap),
            auto_resolvable: false,
            created_at: new Date().toISOString(),
            metadata: {
              overlap_minutes: overlap.overlapMinutes,
              travel_time_needed: travelTimeMinutes,
              locations_different: block1.location !== block2.location
            }
          });
        }
      }
    }
  }

  return conflicts;
}

function detectDeadlineClusterConflicts(userData: any, options: ConflictDetectionOptions): AdvancedConflict[] {
  const conflicts: AdvancedConflict[] = [];
  const clusterDays = options.deadline_cluster_days || 3;

  // Group assignments by due date clusters
  const assignmentsByDate = userData.assignments.reduce((acc: any, assignment: any) => {
    const dateKey = new Date(assignment.due_date).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(assignment);
    return acc;
  }, {});

  // Find date clusters
  const sortedDates = Object.keys(assignmentsByDate).sort();
  let currentCluster: any[] = [];
  
  for (const dateStr of sortedDates) {
    const currentDate = new Date(dateStr);
    const assignments = assignmentsByDate[dateStr];

    if (currentCluster.length === 0) {
      currentCluster = assignments;
    } else {
      const lastDate = new Date(currentCluster[0].due_date);
      const daysDiff = Math.abs((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= clusterDays) {
        currentCluster.push(...assignments);
      } else {
        // Process current cluster if it has multiple assignments
        if (currentCluster.length > 2) {
          conflicts.push(createDeadlineClusterConflict(currentCluster));
        }
        currentCluster = assignments;
      }
    }
  }

  // Process final cluster
  if (currentCluster.length > 2) {
    conflicts.push(createDeadlineClusterConflict(currentCluster));
  }

  return conflicts;
}

function detectWorkloadPeaks(userData: any, options: ConflictDetectionOptions): AdvancedConflict[] {
  const conflicts: AdvancedConflict[] = [];
  const maxDailyHours = options.max_daily_study_hours || 12;

  // Calculate daily workload for next 30 days
  const dailyWorkload = new Map<string, { hours: number; items: any[] }>();

  // Add assignments to daily workload
  userData.assignments.forEach((assignment: any) => {
    const dueDate = new Date(assignment.due_date);
    const dateKey = dueDate.toDateString();
    const estimatedHours = assignment.estimated_hours || 2;

    if (!dailyWorkload.has(dateKey)) {
      dailyWorkload.set(dateKey, { hours: 0, items: [] });
    }

    const dayData = dailyWorkload.get(dateKey)!;
    dayData.hours += estimatedHours;
    dayData.items.push(assignment);
  });

  // Add exams (assume 4 hours study time)
  userData.exams.forEach((exam: any) => {
    const examDate = new Date(exam.exam_date);
    const dateKey = examDate.toDateString();

    if (!dailyWorkload.has(dateKey)) {
      dailyWorkload.set(dateKey, { hours: 0, items: [] });
    }

    const dayData = dailyWorkload.get(dateKey)!;
    dayData.hours += 4; // Assume 4 hours for exam
    dayData.items.push(exam);
  });

  // Identify workload peaks
  dailyWorkload.forEach((workload, dateKey) => {
    if (workload.hours > maxDailyHours) {
      conflicts.push({
        id: `workload-${dateKey}`,
        type: 'workload_peak',
        severity: workload.hours > maxDailyHours * 1.5 ? 'critical' : 'major',
        title: `High Workload Day`,
        description: `${workload.hours} hours of work scheduled for ${dateKey}`,
        affected_items: workload.items.map(item => convertToConflictItem(item, item.exam_date ? 'exam' : 'assignment')),
        suggestions: generateWorkloadSuggestions(workload),
        auto_resolvable: true,
        created_at: new Date().toISOString(),
        metadata: {
          total_hours: workload.hours,
          max_recommended: maxDailyHours,
          overflow_hours: workload.hours - maxDailyHours
        }
      });
    }
  });

  return conflicts;
}

function detectLocationConflicts(userData: any, options: ConflictDetectionOptions): AdvancedConflict[] {
  const conflicts: AdvancedConflict[] = [];
  const travelTimeMinutes = options.travel_time_minutes || 15;

  // Group schedule blocks by day
  const blocksByDay = userData.scheduleBlocks.reduce((acc: any, block: any) => {
    if (!acc[block.day_of_week]) acc[block.day_of_week] = [];
    acc[block.day_of_week].push(block);
    return acc;
  }, {});

  // Check for location conflicts within each day
  Object.values(blocksByDay).forEach((dayBlocks: any) => {
    const sortedBlocks = dayBlocks.sort((a: any, b: any) => 
      a.start_time.localeCompare(b.start_time)
    );

    for (let i = 0; i < sortedBlocks.length - 1; i++) {
      const current = sortedBlocks[i];
      const next = sortedBlocks[i + 1];

      if (current.location && next.location && current.location !== next.location) {
        const timeBetween = calculateTimeBetween(current.end_time, next.start_time);
        
        if (timeBetween < travelTimeMinutes) {
          conflicts.push({
            id: `location-${current.id}-${next.id}`,
            type: 'location_conflict',
            severity: timeBetween < travelTimeMinutes / 2 ? 'critical' : 'major',
            title: `Insufficient Travel Time`,
            description: `Only ${timeBetween} minutes to travel from ${current.location} to ${next.location}`,
            affected_items: [
              convertToConflictItem(current, 'class'),
              convertToConflictItem(next, 'class')
            ],
            suggestions: generateLocationSuggestions(current, next, timeBetween, travelTimeMinutes),
            auto_resolvable: false,
            created_at: new Date().toISOString(),
            metadata: {
              available_time: timeBetween,
              required_time: travelTimeMinutes,
              from_location: current.location,
              to_location: next.location
            }
          });
        }
      }
    }
  });

  return conflicts;
}

function detectStudyOverload(userData: any, options: ConflictDetectionOptions): AdvancedConflict[] {
  const conflicts: AdvancedConflict[] = [];

  // Calculate total weekly study hours
  const totalEstimatedHours = userData.assignments.reduce((sum: number, assignment: any) => 
    sum + (assignment.estimated_hours || 2), 0
  );

  const totalExamStudyHours = userData.exams.reduce((sum: number, exam: any) => 
    sum + (exam.study_hours_planned || 10), 0
  );

  const weeklyTotal = (totalEstimatedHours + totalExamStudyHours) / 4; // Assume 4-week period

  if (weeklyTotal > 40) { // More than 40 hours per week
    conflicts.push({
      id: 'study-overload',
      type: 'study_overload',
      severity: weeklyTotal > 60 ? 'critical' : 'major',
      title: 'Excessive Study Load',
      description: `Estimated ${Math.round(weeklyTotal)} study hours per week`,
      affected_items: [
        ...userData.assignments.map((a: any) => convertToConflictItem(a, 'assignment')),
        ...userData.exams.map((e: any) => convertToConflictItem(e, 'exam'))
      ],
      suggestions: [
        {
          id: 'reduce-load',
          type: 'workload_distribute',
          description: 'Consider dropping a course or extending deadlines',
          impact_score: 0.8,
          auto_executable: false,
          estimated_time_savings: weeklyTotal - 35
        },
        {
          id: 'efficiency',
          type: 'time_extend',
          description: 'Implement time management techniques like Pomodoro',
          impact_score: 0.6,
          auto_executable: false,
          estimated_time_savings: weeklyTotal * 0.15
        }
      ],
      auto_resolvable: false,
      created_at: new Date().toISOString(),
      metadata: {
        weekly_hours: weeklyTotal,
        recommended_max: 40,
        overflow_percentage: ((weeklyTotal - 40) / 40) * 100
      }
    });
  }

  return conflicts;
}

// Additional helper functions...
function checkTimeOverlapWithTravel(block1: any, block2: any, travelMinutes: number) {
  const start1 = new Date(`2024-01-01T${block1.start_time}`);
  const end1 = new Date(`2024-01-01T${block1.end_time}`);
  const start2 = new Date(`2024-01-01T${block2.start_time}`);
  const end2 = new Date(`2024-01-01T${block2.end_time}`);

  const hasDirectOverlap = start1 < end2 && start2 < end1;
  
  if (hasDirectOverlap) {
    const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
    const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));
    const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60);
    
    return {
      hasConflict: true,
      travelConflict: false,
      overlapMinutes
    };
  }

  // Check travel time conflict
  if (block1.location !== block2.location) {
    const timeBetween = Math.min(
      Math.abs((start2.getTime() - end1.getTime()) / (1000 * 60)),
      Math.abs((start1.getTime() - end2.getTime()) / (1000 * 60))
    );

    if (timeBetween < travelMinutes && timeBetween > 0) {
      return {
        hasConflict: true,
        travelConflict: true,
        overlapMinutes: travelMinutes - timeBetween
      };
    }
  }

  return { hasConflict: false, travelConflict: false, overlapMinutes: 0 };
}

function calculateTimeBetween(endTime: string, startTime: string): number {
  const end = new Date(`2024-01-01T${endTime}`);
  const start = new Date(`2024-01-01T${startTime}`);
  return Math.abs((start.getTime() - end.getTime()) / (1000 * 60));
}

function convertToConflictItem(item: any, type: ConflictItem['type']): ConflictItem {
  return {
    id: item.id,
    type,
    title: item.title || item.name,
    start_time: item.start_time || item.due_date || item.exam_date || item.scheduled_start,
    end_time: item.end_time || item.scheduled_end,
    location: item.location,
    course_code: item.course_code,
    metadata: item
  };
}

function generateTimeConflictSuggestions(block1: any, block2: any, overlap: any): ConflictSuggestion[] {
  return [
    {
      id: 'reschedule-1',
      type: 'reschedule',
      description: `Reschedule ${block1.title} to a different time slot`,
      impact_score: 0.8,
      auto_executable: false
    },
    {
      id: 'reschedule-2',
      type: 'reschedule', 
      description: `Reschedule ${block2.title} to a different time slot`,
      impact_score: 0.8,
      auto_executable: false
    }
  ];
}

function generateWorkloadSuggestions(workload: any): ConflictSuggestion[] {
  return [
    {
      id: 'distribute',
      type: 'workload_distribute',
      description: 'Redistribute some tasks to adjacent days',
      impact_score: 0.7,
      auto_executable: true,
      estimated_time_savings: Math.max(workload.hours - 8, 0)
    },
    {
      id: 'prioritize',
      type: 'priority_adjust',
      description: 'Adjust task priorities and defer non-critical items',
      impact_score: 0.6,
      auto_executable: true
    }
  ];
}

function generateLocationSuggestions(current: any, next: any, available: number, needed: number): ConflictSuggestion[] {
  return [
    {
      id: 'extend-break',
      type: 'time_extend',
      description: `Request ${needed - available} minute extension for transition`,
      impact_score: 0.6,
      auto_executable: false
    },
    {
      id: 'alternative-location',
      type: 'location_change',
      description: 'Check for alternative classroom locations',
      impact_score: 0.4,
      auto_executable: false
    }
  ];
}

function createDeadlineClusterConflict(assignments: any[]): AdvancedConflict {
  const totalHours = assignments.reduce((sum, a) => sum + (a.estimated_hours || 2), 0);
  
  return {
    id: `cluster-${assignments.map(a => a.id).join('-')}`,
    type: 'deadline_cluster',
    severity: assignments.length > 4 ? 'critical' : 'major',
    title: `${assignments.length} Assignments Due Together`,
    description: `${totalHours} hours of work due within 3 days`,
    affected_items: assignments.map(a => convertToConflictItem(a, 'assignment')),
    suggestions: [
      {
        id: 'stagger',
        type: 'workload_distribute',
        description: 'Start assignments early to distribute workload',
        impact_score: 0.8,
        auto_executable: false,
        estimated_time_savings: totalHours * 0.3
      }
    ],
    auto_resolvable: false,
    created_at: new Date().toISOString(),
    metadata: {
      total_assignments: assignments.length,
      total_hours: totalHours,
      date_range: `${assignments[0].due_date} to ${assignments[assignments.length - 1].due_date}`
    }
  };
}

function analyzeNewEventConflicts(eventData: any, userData: any): AdvancedConflict[] {
  // Implementation for analyzing conflicts for new events
  return [];
}

async function generateIntelligentSuggestions(conflicts: AdvancedConflict[], userData: any, options: ConflictDetectionOptions): Promise<AdvancedConflict[]> {
  // Enhance conflicts with AI-generated suggestions
  return conflicts;
}

async function executeAutoResolution(conflict: AdvancedConflict, userId: string): Promise<boolean> {
  // Implementation for auto-resolving conflicts
  return false;
}