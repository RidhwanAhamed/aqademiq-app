/**
 * useAchievements Hook
 * Purpose: Track and award achievement badges based on user progress.
 * Backend integration: Replace localStorage with /api/achievements endpoints.
 * TODO: API -> GET /api/achievements/user/:id, POST /api/achievements/award
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Badge, 
  UserBadge, 
  getBadges, 
  getUserBadges, 
  awardBadge, 
  checkBadgeEligibility 
} from '@/services/api';

interface AchievementStats {
  totalPomodoroSessions: number;
  currentStreak: number;
  assignmentsCompleted: number;
  adaChatMessages?: number;
}

export function useAchievements() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentUnlock, setRecentUnlock] = useState<Badge | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch all badges and user's unlocked badges
  const fetchBadges = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [allBadges, unlockedBadges] = await Promise.all([
        getBadges(),
        getUserBadges(user.id)
      ]);
      
      setBadges(allBadges);
      setUserBadges(unlockedBadges);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  // Check and award eligible badges
  const checkAndAwardBadges = useCallback(async (stats: AchievementStats) => {
    if (!user) return [];
    
    try {
      const eligibleBadges = await checkBadgeEligibility(user.id, stats);
      const awardedBadges: Badge[] = [];
      
      for (const badge of eligibleBadges) {
        const result = await awardBadge(user.id, badge.id);
        
        if (result.success && result.badge) {
          awardedBadges.push(result.badge);
          setRecentUnlock(result.badge);
          
          // Show unlock toast notification
          toast({
            title: `🏆 ${result.badge.title}`,
            description: result.badge.unlock_toast,
            duration: 5000,
          });
        }
      }
      
      if (awardedBadges.length > 0) {
        await fetchBadges(); // Refresh badges list
      }
      
      return awardedBadges;
    } catch (error) {
      console.error('Error checking badges:', error);
      return [];
    }
  }, [user, toast, fetchBadges]);

  // Quick lookup utility to prevent duplicate awards
  const isBadgeUnlocked = useCallback((badgeId: string) => {
    return userBadges.some(ub => ub.badge_id === badgeId);
  }, [userBadges]);

  // Award a specific badge directly
  const awardSpecificBadge = useCallback(async (badgeId: string) => {
    if (!user) return null;
    
    try {
      const result = await awardBadge(user.id, badgeId);
      
      if (result.success && result.badge) {
        setRecentUnlock(result.badge);
        
        toast({
          title: `🏆 ${result.badge.title}`,
          description: result.badge.unlock_toast,
          duration: 5000,
        });
        
        await fetchBadges();
        return result.badge;
      }
      
      return null;
    } catch (error) {
      console.error('Error awarding badge:', error);
      return null;
    }
  }, [user, toast, fetchBadges]);

  // Dedicated helper so chat components can request Ada badge unlocks
  const awardAdaApprenticeBadge = useCallback(async () => {
    if (isBadgeUnlocked('adas_apprentice_10_messages')) {
      return null;
    }
    return awardSpecificBadge('adas_apprentice_10_messages');
  }, [isBadgeUnlocked, awardSpecificBadge]);

  // Get unlocked badge details with unlock date
  const getUnlockedBadgeDetails = useCallback((badgeId: string) => {
    const userBadge = userBadges.find(ub => ub.badge_id === badgeId);
    const badge = badges.find(b => b.id === badgeId);
    
    if (!userBadge || !badge) return null;
    
    return {
      ...badge,
      unlockedAt: userBadge.unlocked_at
    };
  }, [userBadges, badges]);

  // Clear recent unlock (for dismissing UI elements)
  const clearRecentUnlock = useCallback(() => {
    setRecentUnlock(null);
  }, []);

  return {
    badges,
    userBadges,
    loading,
    recentUnlock,
    checkAndAwardBadges,
    awardSpecificBadge,
    awardAdaApprenticeBadge,
    isBadgeUnlocked,
    getUnlockedBadgeDetails,
    clearRecentUnlock,
    refetch: fetchBadges
  };
}

