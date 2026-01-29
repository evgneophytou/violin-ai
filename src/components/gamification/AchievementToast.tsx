'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Sparkles, X } from 'lucide-react';
import type { Achievement } from '@prisma/client';

interface AchievementToastProps {
  achievement: Achievement;
  onClose: () => void;
  autoCloseDelay?: number;
}

export const AchievementToast = ({
  achievement,
  onClose,
  autoCloseDelay = 5000,
}: AchievementToastProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto close
    const closeTimer = setTimeout(() => {
      handleClose();
    }, autoCloseDelay);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(closeTimer);
    };
  }, [autoCloseDelay]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        isVisible && !isLeaving
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0'
      }`}
    >
      <Card className="p-4 min-w-[320px] border-2 border-primary/50 shadow-lg bg-gradient-to-br from-background to-primary/5">
        <div className="flex items-start gap-3">
          {/* Achievement Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
            {achievement.icon}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                Achievement Unlocked!
              </span>
            </div>
            
            <h4 className="font-bold text-base truncate">
              {achievement.name}
            </h4>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {achievement.description}
            </p>
            
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                +{achievement.xpReward} XP
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {achievement.category}
              </Badge>
            </div>
          </div>
          
          {/* Close button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 hover:bg-secondary rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </Card>
    </div>
  );
};

// Container for multiple achievement toasts
interface AchievementToastContainerProps {
  achievements: Achievement[];
  onDismiss: (key: string) => void;
}

export const AchievementToastContainer = ({
  achievements,
  onDismiss,
}: AchievementToastContainerProps) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {achievements.map((achievement, index) => (
        <div
          key={achievement.key}
          style={{ transform: `translateY(${-index * 8}px)` }}
        >
          <AchievementToast
            achievement={achievement}
            onClose={() => onDismiss(achievement.key)}
            autoCloseDelay={5000 + index * 1000}
          />
        </div>
      ))}
    </div>
  );
};
