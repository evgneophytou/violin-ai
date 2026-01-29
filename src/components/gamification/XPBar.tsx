'use client';

import { Progress } from '@/components/ui/progress';
import { getXPToNextLevel, getLevelTitle } from '@/lib/gamification/level-system';
import { Sparkles } from 'lucide-react';

interface XPBarProps {
  currentXP: number;
  level: number;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const XPBar = ({
  currentXP,
  level,
  showDetails = true,
  size = 'md',
  animated = true,
}: XPBarProps) => {
  const { xpNeeded, xpProgress, progressPercent } = getXPToNextLevel(currentXP);
  const levelTitle = getLevelTitle(level);
  
  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };
  
  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="w-full space-y-1">
      {showDetails && (
        <div className={`flex items-center justify-between ${textClasses[size]}`}>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium">{currentXP.toLocaleString()} XP</span>
          </div>
          <span className="text-muted-foreground">
            {xpNeeded > 0 ? `${xpNeeded.toLocaleString()} to Level ${level + 1}` : 'Max Level!'}
          </span>
        </div>
      )}
      
      <div className="relative">
        <Progress 
          value={progressPercent} 
          className={`${heightClasses[size]} ${animated ? 'transition-all duration-500' : ''}`}
        />
        {size === 'lg' && (
          <div 
            className="absolute inset-0 flex items-center justify-center text-xs font-medium"
            style={{ 
              color: progressPercent > 50 ? 'white' : 'inherit',
              mixBlendMode: progressPercent > 50 ? 'difference' : 'normal'
            }}
          >
            {progressPercent}%
          </div>
        )}
      </div>
      
      {showDetails && size !== 'sm' && (
        <div className={`flex items-center justify-between ${textClasses[size]} text-muted-foreground`}>
          <span>Level {level} - {levelTitle}</span>
          <span>{xpProgress.toLocaleString()} / {(xpProgress + xpNeeded).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};
