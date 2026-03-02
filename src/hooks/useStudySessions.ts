import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface StudySession {
  id: string;
  user_id: string;
  assignment_id?: string;
  exam_id?: string;
  course_id?: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  status: string;
  focus_score?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useStudySessions() {
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // MOCK DATA GENERATOR
  const generateMockSessions = () => {
    const sessions: StudySession[] = [];
    const courseIds = ["course-math-uuid", "course-physics-uuid", "course-cs-uuid", "course-history-uuid"];
    const now = new Date();

    // Create a precise pattern for the last 7 days for the "Whoop" report
    // Day 0 (Today): High Strain (6h), High Recovery (90%) -> "Primed"
    // Day 1 (Yesterday): High Strain (5h), Low Recovery (30%) -> "Suppressed"
    // Day 2: Medium Strain (3h), Medium Recovery (60%)
    // Day 3: Low Strain (1h), High Recovery (95%)
    // Day 4: High Strain (7h), High Recovery (85%)
    // Day 5: High Strain (6.5h), Low Recovery (40%)
    // Day 6: Medium Strain (4h), Medium Recovery (65%)

    const dailyPatterns = [
      { hours: 6, focus: 9 }, // Today (Day 0)
      { hours: 8, focus: 3 }, // Yesterday (High Strain, Low Rec)
      { hours: 4, focus: 8 },
      { hours: 2, focus: 9 },
      { hours: 7, focus: 7 },
      { hours: 5, focus: 5 },
      { hours: 3, focus: 8 }
    ];

    // Generate last 7 days of specific data
    for (let i = 0; i < 7; i++) {
      const pattern = dailyPatterns[i];
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(14, 0, 0, 0); // Start at 2 PM

      const courseId = courseIds[i % courseIds.length];

      // Split into 2 sessions if hours > 4 for realism
      if (pattern.hours > 4) {
        // Session 1
        const dur1 = Math.floor(pattern.hours * 0.6 * 60);
        const end1 = new Date(date.getTime() + dur1 * 60000);
        sessions.push({
          id: `session-d${i}-1`, user_id: user?.id || "mock", course_id: courseId, title: "Deep Work Block",
          scheduled_start: date.toISOString(), scheduled_end: end1.toISOString(),
          actual_start: date.toISOString(), actual_end: end1.toISOString(),
          status: "completed", focus_score: pattern.focus,
          created_at: date.toISOString(), updated_at: date.toISOString()
        });

        // Session 2 (Evening)
        const date2 = new Date(date);
        date2.setHours(20, 0, 0, 0);
        const dur2 = Math.floor(pattern.hours * 0.4 * 60);
        const end2 = new Date(date2.getTime() + dur2 * 60000);
        sessions.push({
          id: `session-d${i}-2`, user_id: user?.id || "mock", course_id: courseIds[(i + 1) % courseIds.length], title: "Evening Review",
          scheduled_start: date2.toISOString(), scheduled_end: end2.toISOString(),
          actual_start: date2.toISOString(), actual_end: end2.toISOString(),
          status: "completed", focus_score: pattern.focus - 1, // Slightly lower focus in evening
          created_at: date2.toISOString(), updated_at: date2.toISOString()
        });
      } else {
        // Single Session
        const dur = pattern.hours * 60;
        const end = new Date(date.getTime() + dur * 60000);
        sessions.push({
          id: `session-d${i}-1`, user_id: user?.id || "mock", course_id: courseId, title: "Study Session",
          scheduled_start: date.toISOString(), scheduled_end: end.toISOString(),
          actual_start: date.toISOString(), actual_end: end.toISOString(),
          status: "completed", focus_score: pattern.focus,
          created_at: date.toISOString(), updated_at: date.toISOString()
        });
      }
    }

    // Fill the rest of the month with random filler
    for (let i = 7; i < 45; i++) {
      // ... (keep previous random logic simplified)
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(10, 0, 0, 0);
      sessions.push({
        id: `session-${i}`, user_id: user?.id || "mock-user", course_id: courseIds[0], title: `Old Session ${i}`,
        scheduled_start: date.toISOString(), scheduled_end: new Date(date.getTime() + 60 * 60000).toISOString(),
        actual_start: date.toISOString(), actual_end: new Date(date.getTime() + 60 * 60000).toISOString(),
        status: "completed", focus_score: 7,
        created_at: date.toISOString(), updated_at: date.toISOString()
      });
    }

    return sessions.sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime());
  };

  const fetchStudySessions = async () => {
    try {
      if (!user) {
        setStudySessions(generateMockSessions());
        return;
      }

      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_start', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log("Analytics Demo: Injecting Mock Study Sessions");
        setStudySessions(generateMockSessions());
      } else {
        setStudySessions(data);
      }
    } catch (error) {
      console.error('Error fetching study sessions:', error);
      setStudySessions(generateMockSessions());
    } finally {
      setLoading(false);
    }
  };

  const addStudySession = async (sessionData: Omit<StudySession, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert([{ ...sessionData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      await fetchStudySessions(); // Refresh the list
      return data;
    } catch (error) {
      console.error('Error adding study session:', error);
      setError('Failed to add study session');
      return null;
    }
  };

  const updateStudySession = async (id: string, updates: Partial<StudySession>) => {
    try {
      const { error } = await supabase
        .from('study_sessions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchStudySessions(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error updating study session:', error);
      setError('Failed to update study session');
      return false;
    }
  };

  useEffect(() => {
    fetchStudySessions();
  }, [user]);

  return {
    studySessions,
    loading,
    error,
    addStudySession,
    updateStudySession,
    refetch: fetchStudySessions,
  };
}