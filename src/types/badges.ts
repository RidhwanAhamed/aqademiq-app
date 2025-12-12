/**
 * Badge Types
 * Purpose: Share badge shapes between services and UI layers.
 * Backend integration: Keep this in sync with /api/achievements responses.
 */

export type BadgeCategory = 'focus' | 'streak' | 'completion' | 'engagement';

export type BadgeCriteriaType =
  | 'first_pomodoro'
  | 'streak_days'
  | 'assignments_completed'
  | 'ada_chat_messages'
  | 'ada_events_created';

export interface Badge {
  id: string;
  title: string;
  description: string;
  unlock_toast: string;
  icon: string;
  category: BadgeCategory;
  criteria: {
    type: BadgeCriteriaType;
    threshold: number;
  };
}

export interface UserBadge {
  badge_id: string;
  unlocked_at: string;
}

