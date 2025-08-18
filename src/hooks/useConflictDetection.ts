import { useState, useCallback } from 'react';
import { CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { areIntervalsOverlapping, isWithinInterval } from 'date-fns';

export interface ConflictInfo {
  eventId: string;
  conflictingEventIds: string[];
  severity: 'minor' | 'major';
  message: string;
}

export function useConflictDetection() {
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);

  const detectConflicts = useCallback((events: CalendarEvent[]): ConflictInfo[] => {
    const detectedConflicts: ConflictInfo[] = [];
    const conflictMap = new Map<string, string[]>();

    // Check each event against all others
    for (let i = 0; i < events.length; i++) {
      const eventA = events[i];
      const conflictingIds: string[] = [];

      for (let j = i + 1; j < events.length; j++) {
        const eventB = events[j];

        // Skip if same type and different courses (courses can overlap)
        if (eventA.type === 'schedule' && eventB.type === 'schedule' && 
            eventA.course?.name !== eventB.course?.name) {
          continue;
        }

        // Check for time overlap
        const overlap = areIntervalsOverlapping(
          { start: eventA.start, end: eventA.end },
          { start: eventB.start, end: eventB.end }
        );

        if (overlap) {
          conflictingIds.push(eventB.id);
          
          // Add to conflict map for eventB as well
          if (!conflictMap.has(eventB.id)) {
            conflictMap.set(eventB.id, []);
          }
          conflictMap.get(eventB.id)!.push(eventA.id);
        }
      }

      if (conflictingIds.length > 0) {
        conflictMap.set(eventA.id, conflictingIds);
      }
    }

    // Create conflict info objects
    conflictMap.forEach((conflictingIds, eventId) => {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const severity = conflictingIds.length > 2 || 
        conflictingIds.some(id => {
          const conflictingEvent = events.find(e => e.id === id);
          return conflictingEvent?.type === 'exam';
        }) ? 'major' : 'minor';

      const message = `Conflicts with ${conflictingIds.length} other event${conflictingIds.length > 1 ? 's' : ''}`;

      detectedConflicts.push({
        eventId,
        conflictingEventIds: conflictingIds,
        severity,
        message
      });
    });

    setConflicts(detectedConflicts);
    return detectedConflicts;
  }, []);

  const hasConflict = useCallback((eventId: string): boolean => {
    return conflicts.some(c => c.eventId === eventId);
  }, [conflicts]);

  const getConflictInfo = useCallback((eventId: string): ConflictInfo | undefined => {
    return conflicts.find(c => c.eventId === eventId);
  }, [conflicts]);

  const resolveConflict = useCallback((eventId: string) => {
    setConflicts(prev => prev.filter(c => c.eventId !== eventId));
  }, []);

  return {
    conflicts,
    detectConflicts,
    hasConflict,
    getConflictInfo,
    resolveConflict
  };
}