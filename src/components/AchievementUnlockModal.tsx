/**
 * AchievementUnlockModal Component
 * Purpose: Celebratory modal displayed when user unlocks a new badge.
 * Backend integration: Badge data comes from useAchievements hook.
 */

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge as BadgeType } from '@/types/badges';
import { cn } from '@/lib/utils';

interface AchievementUnlockModalProps {
  badge: BadgeType | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AchievementUnlockModal({ badge, isOpen, onClose }: AchievementUnlockModalProps) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isOpen && badge) {
      // Delay animation for smoother entrance
      const timer = setTimeout(() => setShowAnimation(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowAnimation(false);
    }
  }, [isOpen, badge]);

  if (!badge) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="sm:max-w-md bg-gradient-to-b from-background to-muted/30 border-primary/20"
        aria-describedby="achievement-unlock-description"
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Achievement Unlocked!
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-6">
          {/* Badge Image with Animation */}
          <div 
            className={cn(
              'relative transition-all duration-700 ease-out',
              showAnimation 
                ? 'scale-100 opacity-100 translate-y-0' 
                : 'scale-75 opacity-0 translate-y-4'
            )}
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl animate-pulse" />
            
            {/* Badge Image */}
            <div className="relative w-36 h-36 rounded-2xl overflow-hidden ring-4 ring-primary/50 shadow-2xl shadow-primary/30">
              <img 
                src={badge.icon} 
                alt={badge.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Badge Info */}
          <div 
            className={cn(
              'text-center space-y-3 transition-all duration-500 delay-200',
              showAnimation 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-4'
            )}
          >
            <h3 className="text-2xl font-bold text-foreground">
              {badge.title}
            </h3>
            <p 
              id="achievement-unlock-description"
              className="text-muted-foreground max-w-xs mx-auto"
            >
              {badge.unlock_toast}
            </p>
          </div>

          {/* Continue Button */}
          <Button 
            onClick={onClose}
            className={cn(
              'mt-2 px-8 bg-gradient-primary hover:opacity-90 transition-all duration-500 delay-400',
              showAnimation 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-4'
            )}
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

