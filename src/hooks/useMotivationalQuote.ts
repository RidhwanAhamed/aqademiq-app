/**
 * useMotivationalQuote Hook
 * Purpose: Provides context-aware motivational quotes for splash screen and other components.
 * 
 * Priority order for quote selection:
 * 1. Exam today or tomorrow → Exam quote
 * 2. Exam in 2-7 days → Exam soon quote
 * 3. Assignment due today/tomorrow → Assignment quote
 * 4. Assignment due in 2-5 days → Assignment soon quote
 * 5. Streak milestone (7, 14, 30, 60, 100) → Milestone quote
 * 6. Active streak → Streak quote
 * 7. Time of day → Time-based quote
 * 8. Fallback → General motivational quote
 * 
 * Backend integration: TODO: API -> /api/user/preferences for enable/disable toggle
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, isToday, isTomorrow, startOfDay } from 'date-fns';
import quotes from '@/data/motivational-quotes.json';

type QuoteCategory = 'exam' | 'examSoon' | 'assignment' | 'assignmentSoon' | 'streak' | 'welcomeBack' | 'morning' | 'afternoon' | 'evening' | 'night' | 'general';

interface QuoteResult {
  quote: string;
  category: QuoteCategory | 'streakMilestone';
  context?: string; // e.g., "Chemistry Exam" or "Math Assignment"
}

// Helper to get random item from array
const getRandomItem = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

// Get time of day category
const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

// Main hook for getting a context-aware quote
export function useMotivationalQuote(
  exams?: Array<{ id: string; title: string; exam_date: string; course_id?: string }>,
  assignments?: Array<{ id: string; title: string; due_date: string; is_completed: boolean; course_id?: string }>,
  userStreak?: number
): QuoteResult {
  
  return useMemo(() => {
    const today = startOfDay(new Date());
    
    // 1. Check for exams today or tomorrow
    if (exams && exams.length > 0) {
      const urgentExam = exams.find(exam => {
        const examDate = new Date(exam.exam_date);
        return isToday(examDate) || isTomorrow(examDate);
      });
      
      if (urgentExam) {
        const quote = getRandomItem(quotes.exam);
        return {
          quote,
          category: 'exam' as QuoteCategory,
          context: urgentExam.title
        };
      }
      
      // 2. Check for exams in 2-7 days
      const upcomingExam = exams.find(exam => {
        const examDate = startOfDay(new Date(exam.exam_date));
        const daysUntil = differenceInDays(examDate, today);
        return daysUntil >= 2 && daysUntil <= 7;
      });
      
      if (upcomingExam) {
        const quote = getRandomItem(quotes.examSoon);
        return {
          quote,
          category: 'examSoon' as QuoteCategory,
          context: upcomingExam.title
        };
      }
    }
    
    // 3. Check for assignments due today or tomorrow
    if (assignments && assignments.length > 0) {
      const urgentAssignment = assignments.find(a => {
        if (a.is_completed) return false;
        const dueDate = new Date(a.due_date);
        return isToday(dueDate) || isTomorrow(dueDate);
      });
      
      if (urgentAssignment) {
        const quote = getRandomItem(quotes.assignment);
        return {
          quote,
          category: 'assignment' as QuoteCategory,
          context: urgentAssignment.title
        };
      }
      
      // 4. Check for assignments due in 2-5 days
      const upcomingAssignment = assignments.find(a => {
        if (a.is_completed) return false;
        const dueDate = startOfDay(new Date(a.due_date));
        const daysUntil = differenceInDays(dueDate, today);
        return daysUntil >= 2 && daysUntil <= 5;
      });
      
      if (upcomingAssignment) {
        const quote = getRandomItem(quotes.assignmentSoon);
        return {
          quote,
          category: 'assignmentSoon' as QuoteCategory,
          context: upcomingAssignment.title
        };
      }
    }
    
    // 5. Check for streak milestones
    if (userStreak) {
      const milestones = [100, 60, 30, 14, 7] as const;
      for (const milestone of milestones) {
        if (userStreak === milestone) {
          const milestoneQuotes = quotes.streakMilestone as Record<string, string>;
          return {
            quote: milestoneQuotes[milestone.toString()] || getRandomItem(quotes.streak),
            category: 'streakMilestone',
            context: `${milestone} day streak!`
          };
        }
      }
      
      // 6. Active streak (but not a milestone)
      if (userStreak >= 3) {
        return {
          quote: getRandomItem(quotes.streak),
          category: 'streak' as QuoteCategory,
          context: `${userStreak} day streak`
        };
      }
    }
    
    // 7. Time of day quote
    const timeOfDay = getTimeOfDay();
    const timeQuotes = quotes[timeOfDay];
    if (timeQuotes && timeQuotes.length > 0) {
      return {
        quote: getRandomItem(timeQuotes),
        category: timeOfDay as QuoteCategory
      };
    }
    
    // 8. Fallback to general quote
    return {
      quote: getRandomItem(quotes.general),
      category: 'general' as QuoteCategory
    };
    
  }, [exams, assignments, userStreak]);
}

// Simplified hook for splash screen that fetches its own data
export function useSplashQuote(): { quote: string; loading: boolean } {
  // For splash screen, we want a quick quote without waiting for full data fetch
  // So we'll use time-of-day or general quotes initially
  
  const timeOfDay = getTimeOfDay();
  const timeQuotes = quotes[timeOfDay];
  
  // Mix time-based and general quotes for variety
  const allQuotes = [...timeQuotes, ...quotes.general];
  const quote = getRandomItem(allQuotes);
  
  return { quote, loading: false };
}

export default useMotivationalQuote;







