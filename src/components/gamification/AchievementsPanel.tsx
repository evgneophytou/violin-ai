'use client';

import { useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Trophy, Lock, Sparkles, Check } from 'lucide-react';
import { ACHIEVEMENTS, getAchievementProgress, type UserStats } from '@/lib/gamification/achievements';
import type { Achievement, UserAchievement } from '@prisma/client';

interface AchievementsPanelProps {
  unlockedAchievements: (UserAchievement & { achievement: Achievement })[];
  userStats: UserStats;
}

export const AchievementsPanel = ({
  unlockedAchievements,
  userStats,
}: AchievementsPanelProps) => {
  // Memoize computed values
  const unlockedKeys = useMemo(
    () => new Set(unlockedAchievements.map(ua => ua.achievement.key)),
    [unlockedAchievements]
  );
  
  const totalXP = useMemo(
    () => unlockedAchievements.reduce((sum, ua) => sum + ua.achievement.xpReward, 0),
    [unlockedAchievements]
  );
  
  const categories = ['all', 'practice', 'mastery', 'streak', 'milestone', 'explorer'] as const;
  
  // Memoize category filter function
  const getAchievementsForCategory = useCallback((category: string) => {
    if (category === 'all') return ACHIEVEMENTS;
    return ACHIEVEMENTS.filter(a => a.category === category);
  }, []);

  // Memoize render function to prevent recreation
  const renderAchievementCard = useCallback((achievement: typeof ACHIEVEMENTS[0]) => {
    const isUnlocked = unlockedKeys.has(achievement.key);
    const progress = getAchievementProgress(achievement, userStats);
    const unlockedData = unlockedAchievements.find(ua => ua.achievement.key === achievement.key);
    
    return (
      <div
        key={achievement.key}
        className={`p-3 rounded-lg border transition-all ${
          isUnlocked 
            ? 'bg-primary/5 border-primary/20' 
            : 'bg-secondary/30 border-transparent opacity-75'
        }`}
        role="listitem"
        aria-label={`${achievement.name}: ${isUnlocked ? 'Unlocked' : 'Locked'}`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div 
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl ${
              isUnlocked ? 'bg-primary/10' : 'bg-secondary'
            }`}
            aria-hidden="true"
          >
            {isUnlocked ? achievement.icon : <Lock className="h-4 w-4 text-muted-foreground" />}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={`font-medium text-sm ${isUnlocked ? '' : 'text-muted-foreground'}`}>
                {achievement.name}
              </h4>
              {isUnlocked && (
                <Check className="h-4 w-4 text-green-500" aria-label="Completed" />
              )}
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-1">
              {achievement.description}
            </p>
            
            {/* Progress bar for locked achievements */}
            {!isUnlocked && achievement.threshold && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span aria-label={`${progress.current} of ${progress.target} completed`}>
                    {progress.current} / {progress.target}
                  </span>
                </div>
                <Progress 
                  value={progress.percent} 
                  className="h-1.5"
                  aria-label={`${progress.percent}% complete`}
                />
              </div>
            )}
            
            {/* Unlocked info */}
            {isUnlocked && unlockedData && (
              <p className="text-xs text-muted-foreground mt-1">
                Unlocked {new Date(unlockedData.unlockedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          
          {/* XP Reward */}
          <Badge 
            variant={isUnlocked ? 'default' : 'secondary'} 
            className="text-xs flex-shrink-0"
            aria-label={`${achievement.xpReward} XP reward`}
          >
            <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
            {achievement.xpReward}
          </Badge>
        </div>
      </div>
    );
  }, [unlockedKeys, unlockedAchievements, userStats]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="h-5 w-5" aria-hidden="true" />
            Achievements
          </span>
          <div className="flex items-center gap-2 text-sm font-normal">
            <Badge variant="secondary" aria-label={`${unlockedAchievements.length} of ${ACHIEVEMENTS.length} achievements unlocked`}>
              {unlockedAchievements.length} / {ACHIEVEMENTS.length}
            </Badge>
            <Badge variant="outline" aria-label={`${totalXP.toLocaleString()} XP earned from achievements`}>
              <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
              {totalXP.toLocaleString()} XP
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-6 w-full mb-4">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs capitalize">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map(category => (
            <TabsContent key={category} value={category} className="mt-0">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2" role="list" aria-label={`${category} achievements`}>
                  {getAchievementsForCategory(category).map(renderAchievementCard)}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
