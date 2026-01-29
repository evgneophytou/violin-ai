// Analytics data aggregation service

import { prisma } from '@/lib/db';
import { startOfDay, subDays, format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';

export interface DailyStats {
  date: string;
  practiceMinutes: number;
  exercisesCompleted: number;
  avgScore: number;
  xpEarned: number;
}

export interface FocusAreaStats {
  focusArea: string;
  count: number;
  totalMinutes: number;
  avgScore: number;
}

export interface OverallStats {
  totalPracticeMinutes: number;
  totalExercises: number;
  totalSessions: number;
  avgScore: number;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  level: number;
  perfectScores: number;
  scalesCompleted: number;
  arpeggiosCompleted: number;
}

export interface ProgressTrend {
  date: string;
  avgPitchAcc: number;
  avgRhythmAcc: number;
  avgOverallScore: number;
}

// Get daily practice stats for the last N days
export const getDailyStats = async (
  userId: string,
  days: number = 30
): Promise<DailyStats[]> => {
  const startDate = subDays(new Date(), days);
  
  const sessions = await prisma.practiceSession.findMany({
    where: {
      userId,
      startedAt: { gte: startDate },
    },
    include: {
      performances: true,
    },
    orderBy: { startedAt: 'asc' },
  });

  // Create a map of all dates
  const dateMap = new Map<string, DailyStats>();
  const allDates = eachDayOfInterval({
    start: startDate,
    end: new Date(),
  });

  // Initialize all dates with zero values
  for (const date of allDates) {
    const dateStr = format(date, 'yyyy-MM-dd');
    dateMap.set(dateStr, {
      date: dateStr,
      practiceMinutes: 0,
      exercisesCompleted: 0,
      avgScore: 0,
      xpEarned: 0,
    });
  }

  // Aggregate session data
  for (const session of sessions) {
    const dateStr = format(new Date(session.startedAt), 'yyyy-MM-dd');
    const existing = dateMap.get(dateStr);
    
    if (existing) {
      existing.practiceMinutes += session.durationMins;
      existing.exercisesCompleted += session.exerciseCount;
      existing.xpEarned += session.xpEarned;
      
      // Calculate weighted average score
      if (session.avgScore > 0) {
        const totalExercises = existing.exercisesCompleted;
        const prevWeight = (totalExercises - session.exerciseCount) / totalExercises;
        const newWeight = session.exerciseCount / totalExercises;
        existing.avgScore = existing.avgScore * prevWeight + session.avgScore * newWeight;
      }
    }
  }

  return Array.from(dateMap.values());
};

// Get practice time by focus area
export const getFocusAreaStats = async (
  userId: string,
  days: number = 30
): Promise<FocusAreaStats[]> => {
  const startDate = subDays(new Date(), days);
  
  const sessions = await prisma.practiceSession.groupBy({
    by: ['focusArea'],
    where: {
      userId,
      startedAt: { gte: startDate },
      focusArea: { not: null },
    },
    _count: true,
    _sum: {
      durationMins: true,
    },
    _avg: {
      avgScore: true,
    },
  });

  return sessions.map((s) => ({
    focusArea: s.focusArea || 'Unknown',
    count: s._count,
    totalMinutes: s._sum.durationMins || 0,
    avgScore: Math.round(s._avg.avgScore || 0),
  }));
};

// Get overall user statistics
export const getOverallStats = async (userId: string): Promise<OverallStats> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return {
      totalPracticeMinutes: 0,
      totalExercises: 0,
      totalSessions: 0,
      avgScore: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalXP: 0,
      level: 1,
      perfectScores: 0,
      scalesCompleted: 0,
      arpeggiosCompleted: 0,
    };
  }

  // Get aggregated session stats
  const sessionStats = await prisma.practiceSession.aggregate({
    where: { userId },
    _sum: {
      durationMins: true,
      exerciseCount: true,
    },
    _avg: {
      avgScore: true,
    },
    _count: true,
  });

  // Count perfect scores (95%+)
  const perfectScores = await prisma.performance.count({
    where: {
      session: { userId },
      score: { gte: 95 },
    },
  });

  // Count scales and arpeggios
  const [scalesCount, arpeggiosCount] = await Promise.all([
    prisma.practiceSession.count({
      where: { userId, focusArea: 'scales' },
    }),
    prisma.practiceSession.count({
      where: { userId, focusArea: 'arpeggios' },
    }),
  ]);

  return {
    totalPracticeMinutes: user.totalPracticeMinutes,
    totalExercises: sessionStats._sum.exerciseCount || 0,
    totalSessions: sessionStats._count,
    avgScore: Math.round(sessionStats._avg.avgScore || 0),
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    totalXP: user.xp,
    level: user.level,
    perfectScores,
    scalesCompleted: scalesCount,
    arpeggiosCompleted: arpeggiosCount,
  };
};

// Get progress trend over time
export const getProgressTrend = async (
  userId: string,
  days: number = 30
): Promise<ProgressTrend[]> => {
  const startDate = subDays(new Date(), days);
  
  const performances = await prisma.performance.findMany({
    where: {
      session: {
        userId,
        startedAt: { gte: startDate },
      },
    },
    select: {
      pitchAcc: true,
      rhythmAcc: true,
      score: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const dateMap = new Map<string, { pitchAcc: number[]; rhythmAcc: number[]; score: number[] }>();
  
  for (const perf of performances) {
    const dateStr = format(new Date(perf.createdAt), 'yyyy-MM-dd');
    
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { pitchAcc: [], rhythmAcc: [], score: [] });
    }
    
    const data = dateMap.get(dateStr)!;
    data.pitchAcc.push(perf.pitchAcc);
    data.rhythmAcc.push(perf.rhythmAcc);
    data.score.push(perf.score);
  }

  return Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    avgPitchAcc: Math.round(data.pitchAcc.reduce((a, b) => a + b, 0) / data.pitchAcc.length),
    avgRhythmAcc: Math.round(data.rhythmAcc.reduce((a, b) => a + b, 0) / data.rhythmAcc.length),
    avgOverallScore: Math.round(data.score.reduce((a, b) => a + b, 0) / data.score.length),
  }));
};

// Get weekly summary
export const getWeeklySummary = async (userId: string): Promise<{
  thisWeek: { minutes: number; exercises: number; avgScore: number };
  lastWeek: { minutes: number; exercises: number; avgScore: number };
  change: { minutes: number; exercises: number; avgScore: number };
}> => {
  const now = new Date();
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = startOfWeek(subDays(thisWeekStart, 1));
  const lastWeekEnd = endOfWeek(lastWeekStart);

  const [thisWeekStats, lastWeekStats] = await Promise.all([
    prisma.practiceSession.aggregate({
      where: {
        userId,
        startedAt: { gte: thisWeekStart },
      },
      _sum: { durationMins: true, exerciseCount: true },
      _avg: { avgScore: true },
    }),
    prisma.practiceSession.aggregate({
      where: {
        userId,
        startedAt: { gte: lastWeekStart, lte: lastWeekEnd },
      },
      _sum: { durationMins: true, exerciseCount: true },
      _avg: { avgScore: true },
    }),
  ]);

  const thisWeek = {
    minutes: thisWeekStats._sum.durationMins || 0,
    exercises: thisWeekStats._sum.exerciseCount || 0,
    avgScore: Math.round(thisWeekStats._avg.avgScore || 0),
  };

  const lastWeek = {
    minutes: lastWeekStats._sum.durationMins || 0,
    exercises: lastWeekStats._sum.exerciseCount || 0,
    avgScore: Math.round(lastWeekStats._avg.avgScore || 0),
  };

  return {
    thisWeek,
    lastWeek,
    change: {
      minutes: thisWeek.minutes - lastWeek.minutes,
      exercises: thisWeek.exercises - lastWeek.exercises,
      avgScore: thisWeek.avgScore - lastWeek.avgScore,
    },
  };
};

// Get practice calendar data (for heatmap)
export const getPracticeCalendar = async (
  userId: string,
  months: number = 6
): Promise<{ date: string; level: number; minutes: number }[]> => {
  const startDate = subDays(new Date(), months * 30);
  
  const sessions = await prisma.practiceSession.findMany({
    where: {
      userId,
      startedAt: { gte: startDate },
    },
    select: {
      startedAt: true,
      durationMins: true,
    },
  });

  // Group by date
  const dateMap = new Map<string, number>();
  
  for (const session of sessions) {
    const dateStr = format(new Date(session.startedAt), 'yyyy-MM-dd');
    dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + session.durationMins);
  }

  // Convert to level (0-4 based on minutes)
  return Array.from(dateMap.entries()).map(([date, minutes]) => {
    let level = 0;
    if (minutes >= 60) level = 4;
    else if (minutes >= 30) level = 3;
    else if (minutes >= 15) level = 2;
    else if (minutes > 0) level = 1;
    
    return { date, level, minutes };
  });
};
