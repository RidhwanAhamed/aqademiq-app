/**
 * AchievementBadge Component
 * Purpose: Display achievement badges with locked/unlocked states.
 * Backend integration: Badge data comes from useAchievements hook.
 */

import { Badge as BadgeType } from '@/types/badges';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface AchievementBadgeProps {
  badge: BadgeType;
  isUnlocked: boolean;
  unlockedAt?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

export function AchievementBadge({
  badge,
  isUnlocked,
  unlockedAt,
  size = 'md',
  showDetails = true,
  className
}: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div 
      className={cn(
        'flex flex-col items-center gap-2 transition-all duration-300',
        className
      )}
      role="img"
      aria-label={`${badge.title} badge - ${isUnlocked ? 'Unlocked' : 'Locked'}`}
    >
      <div className="relative">
        <div 
          className={cn(
            sizeClasses[size],
            'rounded-xl overflow-hidden transition-all duration-300',
            isUnlocked 
              ? 'ring-2 ring-primary/50 shadow-lg shadow-primary/20' 
              : 'grayscale opacity-40'
          )}
        >
          <img 
            src={badge.icon} 
            alt={badge.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {showDetails && (
        <div className="text-center space-y-1">
          <h4 className={cn(
            'font-semibold',
            textSizes[size],
            isUnlocked ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {badge.title}
          </h4>
          <p className={cn(
            'text-muted-foreground max-w-[150px]',
            size === 'sm' ? 'text-[10px]' : 'text-xs'
          )}>
            {badge.description}
          </p>
          {isUnlocked && unlockedAt && (
            <p className="text-[10px] text-muted-foreground/70">
              {new Date(unlockedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

