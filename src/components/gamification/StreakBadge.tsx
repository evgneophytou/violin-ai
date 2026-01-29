'use client';

import { useState, useEffect } from 'react';
import { Flame, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getStreakInfo, formatStreakMessage, type StreakInfo } from '@/lib/gamification/streak-tracker';

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
  lastPracticeAt: Date | null;
  showMessage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StreakBadge = ({
  currentStreak,
  longestStreak,
  lastPracticeAt,
  showMessage = false,
  size = 'md',
}: StreakBadgeProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [streakInfo, setStreakInfo] = useState<StreakInfo>({
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeAt: null,
    streakStatus: 'none',
    hoursUntilStreakLost: null,
  });

  // Calculate streak info only on client to avoid hydration mismatch
  useEffect(() => {
    setStreakInfo(getStreakInfo(currentStreak, longestStreak, lastPracticeAt));
    setIsMounted(true);
  }, [currentStreak, longestStreak, lastPracticeAt]);
  
  const sizeClasses = {
    sm: 'text-sm px-2 py-0.5',
    md: 'text-base px-3 py-1',
    lg: 'text-lg px-4 py-1.5',
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // Render a placeholder until mounted to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Badge variant="secondary" className={`${sizeClasses[size]} flex items-center gap-1.5`}>
          <Flame className={`${iconSizes[size]} text-muted-foreground`} />
          <span className="font-bold">-</span>
          <span className="text-muted-foreground">days</span>
        </Badge>
      </div>
    );
  }
  
  const getVariant = () => {
    switch (streakInfo.streakStatus) {
      case 'active':
        return 'default';
      case 'at_risk':
        return 'destructive';
      case 'broken':
      case 'none':
      default:
        return 'secondary';
    }
  };
  
  const getIcon = () => {
    if (streakInfo.streakStatus === 'at_risk') {
      return <AlertTriangle className={`${iconSizes[size]} text-yellow-500`} />;
    }
    return (
      <Flame 
        className={`${iconSizes[size]} ${
          streakInfo.currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'
        }`} 
      />
    );
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Badge 
        variant={getVariant()} 
        className={`${sizeClasses[size]} flex items-center gap-1.5`}
      >
        {getIcon()}
        <span className="font-bold">{streakInfo.currentStreak}</span>
        <span className="text-muted-foreground">day{streakInfo.currentStreak !== 1 ? 's' : ''}</span>
      </Badge>
      
      {showMessage && (
        <p className="text-xs text-muted-foreground">
          {formatStreakMessage(streakInfo)}
        </p>
      )}
      
      {streakInfo.streakStatus === 'at_risk' && streakInfo.hoursUntilStreakLost && (
        <p className="text-xs text-destructive font-medium">
          {streakInfo.hoursUntilStreakLost}h left to practice!
        </p>
      )}
    </div>
  );
};
