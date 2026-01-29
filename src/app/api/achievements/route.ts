import { NextResponse } from 'next/server';
import { getOrCreateDefaultUser } from '@/lib/db';
import { getUserAchievements, ACHIEVEMENTS, getAchievementProgress, type UserStats } from '@/lib/gamification/achievements';
import { prisma } from '@/lib/db';
import { logError } from '@/lib/validation';

// GET /api/achievements - Get user's achievements
export async function GET() {
  try {
    const user = await getOrCreateDefaultUser();
    const achievements = await getUserAchievements(user.id);
    
    // Get user stats for progress calculation
    const [totalExercises, perfectScores, scalesCount, arpeggiosCount, sessionsCount] = await Promise.all([
      prisma.performance.count({ where: { session: { userId: user.id } } }),
      prisma.performance.count({ where: { session: { userId: user.id }, score: { gte: 95 } } }),
      prisma.practiceSession.count({ where: { userId: user.id, focusArea: 'scales' } }),
      prisma.practiceSession.count({ where: { userId: user.id, focusArea: 'arpeggios' } }),
      prisma.practiceSession.count({ where: { userId: user.id } }),
    ]);
    
    const userStats: UserStats = {
      totalExercises,
      totalPracticeMinutes: user.totalPracticeMinutes,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      level: user.level,
      perfectScores,
      scalesCompleted: scalesCount,
      arpeggiosCompleted: arpeggiosCount,
      avgScore: 0,
      sessionsCount,
    };
    
    // Add progress to locked achievements
    const lockedWithProgress = achievements.locked.map((achievement) => {
      const definition = ACHIEVEMENTS.find(a => a.key === achievement.key);
      const progress = definition ? getAchievementProgress(definition, userStats) : { current: 0, target: 1, percent: 0 };
      
      return {
        ...achievement,
        progress,
      };
    });
    
    return NextResponse.json({
      unlocked: achievements.unlocked,
      locked: lockedWithProgress,
      totalXP: achievements.totalXP,
      stats: userStats,
    });
  } catch (error) {
    logError('achievements', error);
    return NextResponse.json(
      { error: 'Failed to get achievements' },
      { status: 500 }
    );
  }
}
