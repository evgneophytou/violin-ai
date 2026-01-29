// Achievement definitions and checker

import { prisma } from '@/lib/db';
import type { User, UserAchievement, Achievement } from '@prisma/client';

export interface AchievementDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: 'practice' | 'mastery' | 'streak' | 'explorer' | 'milestone';
  threshold?: number;
  checkCondition: (stats: UserStats) => boolean;
}

export interface UserStats {
  totalExercises: number;
  totalPracticeMinutes: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  perfectScores: number;
  scalesCompleted: number;
  arpeggiosCompleted: number;
  avgScore: number;
  sessionsCount: number;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Practice achievements
  {
    key: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first exercise',
    icon: '🎵',
    xpReward: 25,
    category: 'practice',
    threshold: 1,
    checkCondition: (stats) => stats.totalExercises >= 1,
  },
  {
    key: 'getting_started',
    name: 'Getting Started',
    description: 'Complete 10 exercises',
    icon: '🎶',
    xpReward: 50,
    category: 'practice',
    threshold: 10,
    checkCondition: (stats) => stats.totalExercises >= 10,
  },
  {
    key: 'dedicated_student',
    name: 'Dedicated Student',
    description: 'Complete 50 exercises',
    icon: '📚',
    xpReward: 100,
    category: 'practice',
    threshold: 50,
    checkCondition: (stats) => stats.totalExercises >= 50,
  },
  {
    key: 'century_club',
    name: 'Century Club',
    description: 'Complete 100 exercises',
    icon: '💯',
    xpReward: 200,
    category: 'practice',
    threshold: 100,
    checkCondition: (stats) => stats.totalExercises >= 100,
  },
  {
    key: 'practice_warrior',
    name: 'Practice Warrior',
    description: 'Complete 500 exercises',
    icon: '⚔️',
    xpReward: 500,
    category: 'practice',
    threshold: 500,
    checkCondition: (stats) => stats.totalExercises >= 500,
  },
  
  // Mastery achievements
  {
    key: 'pitch_perfect',
    name: 'Pitch Perfect',
    description: 'Get a perfect pitch score (95%+)',
    icon: '🎯',
    xpReward: 50,
    category: 'mastery',
    checkCondition: (stats) => stats.perfectScores >= 1,
  },
  {
    key: 'perfectionist',
    name: 'Perfectionist',
    description: 'Get 10 perfect scores',
    icon: '✨',
    xpReward: 150,
    category: 'mastery',
    threshold: 10,
    checkCondition: (stats) => stats.perfectScores >= 10,
  },
  {
    key: 'scale_master',
    name: 'Scale Master',
    description: 'Complete 25 scale exercises',
    icon: '🎹',
    xpReward: 75,
    category: 'mastery',
    threshold: 25,
    checkCondition: (stats) => stats.scalesCompleted >= 25,
  },
  {
    key: 'arpeggio_ace',
    name: 'Arpeggio Ace',
    description: 'Complete 25 arpeggio exercises',
    icon: '🌊',
    xpReward: 75,
    category: 'mastery',
    threshold: 25,
    checkCondition: (stats) => stats.arpeggiosCompleted >= 25,
  },
  
  // Streak achievements
  {
    key: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day practice streak',
    icon: '🔥',
    xpReward: 100,
    category: 'streak',
    threshold: 7,
    checkCondition: (stats) => stats.longestStreak >= 7,
  },
  {
    key: 'fortnight_fighter',
    name: 'Fortnight Fighter',
    description: 'Maintain a 14-day practice streak',
    icon: '💪',
    xpReward: 150,
    category: 'streak',
    threshold: 14,
    checkCondition: (stats) => stats.longestStreak >= 14,
  },
  {
    key: 'monthly_master',
    name: 'Monthly Master',
    description: 'Maintain a 30-day practice streak',
    icon: '🏆',
    xpReward: 300,
    category: 'streak',
    threshold: 30,
    checkCondition: (stats) => stats.longestStreak >= 30,
  },
  {
    key: 'unstoppable',
    name: 'Unstoppable',
    description: 'Maintain a 100-day practice streak',
    icon: '👑',
    xpReward: 1000,
    category: 'streak',
    threshold: 100,
    checkCondition: (stats) => stats.longestStreak >= 100,
  },
  
  // Milestone achievements
  {
    key: 'level_5',
    name: 'Rising Star',
    description: 'Reach Level 5',
    icon: '⭐',
    xpReward: 50,
    category: 'milestone',
    threshold: 5,
    checkCondition: (stats) => stats.level >= 5,
  },
  {
    key: 'level_10',
    name: 'Expert Player',
    description: 'Reach Level 10',
    icon: '🌟',
    xpReward: 100,
    category: 'milestone',
    threshold: 10,
    checkCondition: (stats) => stats.level >= 10,
  },
  {
    key: 'level_15',
    name: 'Virtuoso',
    description: 'Reach Level 15',
    icon: '💫',
    xpReward: 200,
    category: 'milestone',
    threshold: 15,
    checkCondition: (stats) => stats.level >= 15,
  },
  {
    key: 'hour_hero',
    name: 'Hour Hero',
    description: 'Practice for 60 minutes total',
    icon: '⏰',
    xpReward: 50,
    category: 'milestone',
    threshold: 60,
    checkCondition: (stats) => stats.totalPracticeMinutes >= 60,
  },
  {
    key: 'practice_pro',
    name: 'Practice Pro',
    description: 'Practice for 10 hours total',
    icon: '🎻',
    xpReward: 200,
    category: 'milestone',
    threshold: 600,
    checkCondition: (stats) => stats.totalPracticeMinutes >= 600,
  },
  
  // Explorer achievements
  {
    key: 'session_starter',
    name: 'Session Starter',
    description: 'Complete 5 practice sessions',
    icon: '📅',
    xpReward: 25,
    category: 'explorer',
    threshold: 5,
    checkCondition: (stats) => stats.sessionsCount >= 5,
  },
  {
    key: 'consistent_player',
    name: 'Consistent Player',
    description: 'Complete 25 practice sessions',
    icon: '📆',
    xpReward: 100,
    category: 'explorer',
    threshold: 25,
    checkCondition: (stats) => stats.sessionsCount >= 25,
  },
];

export const seedAchievements = async (): Promise<void> => {
  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: {
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xpReward,
        category: achievement.category,
        threshold: achievement.threshold,
      },
      create: {
        key: achievement.key,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xpReward,
        category: achievement.category,
        threshold: achievement.threshold,
      },
    });
  }
};

export const checkAndUnlockAchievements = async (
  userId: string,
  stats: UserStats
): Promise<{ unlocked: Achievement[]; xpEarned: number }> => {
  const unlocked: Achievement[] = [];
  let xpEarned = 0;
  
  // Get user's current achievements
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  
  const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));
  
  // Get all achievements from DB
  const dbAchievements = await prisma.achievement.findMany();
  
  for (const dbAchievement of dbAchievements) {
    // Skip if already unlocked
    if (unlockedIds.has(dbAchievement.id)) continue;
    
    // Find the definition
    const definition = ACHIEVEMENTS.find(a => a.key === dbAchievement.key);
    if (!definition) continue;
    
    // Check if condition is met
    if (definition.checkCondition(stats)) {
      // Unlock the achievement
      await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: dbAchievement.id,
          progress: definition.threshold || 1,
        },
      });
      
      unlocked.push(dbAchievement);
      xpEarned += dbAchievement.xpReward;
    }
  }
  
  return { unlocked, xpEarned };
};

export const getUserAchievements = async (userId: string): Promise<{
  unlocked: (UserAchievement & { achievement: Achievement })[];
  locked: Achievement[];
  totalXP: number;
}> => {
  const [userAchievements, allAchievements] = await Promise.all([
    prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    }),
    prisma.achievement.findMany(),
  ]);
  
  const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));
  const locked = allAchievements.filter(a => !unlockedIds.has(a.id));
  const totalXP = userAchievements.reduce((sum, ua) => sum + ua.achievement.xpReward, 0);
  
  return {
    unlocked: userAchievements,
    locked,
    totalXP,
  };
};

export const getAchievementProgress = (
  achievement: AchievementDefinition,
  stats: UserStats
): { current: number; target: number; percent: number } => {
  const target = achievement.threshold || 1;
  let current = 0;
  
  // Map achievement categories to stats
  switch (achievement.key) {
    case 'first_steps':
    case 'getting_started':
    case 'dedicated_student':
    case 'century_club':
    case 'practice_warrior':
      current = stats.totalExercises;
      break;
    case 'pitch_perfect':
    case 'perfectionist':
      current = stats.perfectScores;
      break;
    case 'scale_master':
      current = stats.scalesCompleted;
      break;
    case 'arpeggio_ace':
      current = stats.arpeggiosCompleted;
      break;
    case 'week_warrior':
    case 'fortnight_fighter':
    case 'monthly_master':
    case 'unstoppable':
      current = stats.longestStreak;
      break;
    case 'level_5':
    case 'level_10':
    case 'level_15':
      current = stats.level;
      break;
    case 'hour_hero':
    case 'practice_pro':
      current = stats.totalPracticeMinutes;
      break;
    case 'session_starter':
    case 'consistent_player':
      current = stats.sessionsCount;
      break;
    default:
      current = 0;
  }
  
  return {
    current: Math.min(current, target),
    target,
    percent: Math.min(100, Math.round((current / target) * 100)),
  };
};
