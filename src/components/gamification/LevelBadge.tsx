'use client';

import { Badge } from '@/components/ui/badge';
import { getLevelTitle } from '@/lib/gamification/level-system';
import { Trophy, Star, Crown } from 'lucide-react';

interface LevelBadgeProps {
  level: number;
  showTitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const LevelBadge = ({
  level,
  showTitle = true,
  size = 'md',
}: LevelBadgeProps) => {
  const title = getLevelTitle(level);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };
  
  const getIcon = () => {
    if (level >= 15) {
      return <Crown className={`${iconSizes[size]} text-yellow-500`} />;
    } else if (level >= 10) {
      return <Trophy className={`${iconSizes[size]} text-amber-500`} />;
    } else if (level >= 5) {
      return <Star className={`${iconSizes[size]} text-primary`} />;
    }
    return <Star className={`${iconSizes[size]} text-muted-foreground`} />;
  };
  
  const getGradient = () => {
    if (level >= 15) {
      return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white';
    } else if (level >= 10) {
      return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
    } else if (level >= 5) {
      return 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground';
    }
    return '';
  };

  return (
    <Badge 
      variant={level >= 5 ? 'default' : 'secondary'}
      className={`${sizeClasses[size]} ${getGradient()} flex items-center gap-1.5`}
    >
      {getIcon()}
      <span className="font-bold">Lvl {level}</span>
      {showTitle && (
        <span className="font-normal opacity-90">• {title}</span>
      )}
    </Badge>
  );
};
