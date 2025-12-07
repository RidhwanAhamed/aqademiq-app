/**
 * AchievementShowcase Component
 * Purpose: Display all available badges with unlock status.
 * Backend integration: Badge data comes from useAchievements hook.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AchievementBadge } from '@/components/AchievementBadge';
import { useAchievements } from '@/hooks/useAchievements';
import { Trophy, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AchievementShowcaseProps {
  compact?: boolean;
}

export function AchievementShowcase({ compact = false }: AchievementShowcaseProps) {
  const { badges, userBadges, loading, isBadgeUnlocked, getUnlockedBadgeDetails } = useAchievements();

  const unlockedCount = userBadges.length;
  const totalCount = badges.length;

  if (loading) {
    return (
      <Card className="bg-gradient-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            Achievements
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {unlockedCount}/{totalCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No achievements available yet.
          </p>
        ) : (
          <div className={`grid gap-6 ${compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
            {badges.map((badge) => {
              const isUnlocked = isBadgeUnlocked(badge.id);
              const details = isUnlocked ? getUnlockedBadgeDetails(badge.id) : null;
              
              return (
                <AchievementBadge
                  key={badge.id}
                  badge={badge}
                  isUnlocked={isUnlocked}
                  unlockedAt={details?.unlockedAt}
                  size={compact ? 'sm' : 'md'}
                  showDetails={!compact}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

