/**
 * Analytics Aggregation Service
 * Handles daily aggregation of analytics events and feature session data
 */

import { prisma } from '@/lib/db';
import { FEATURES } from './tracking';

type FeatureValue = (typeof FEATURES)[keyof typeof FEATURES];

interface AggregatedFeatureStats {
  feature: string;
  sessions: number;
  uniqueUsers: number;
  totalDuration: number; // seconds
  eventCount: number;
}

interface UnusedFeatureInfo {
  feature: string;
  usagePercent: number;
  lastUsed: Date | null;
  trend: 'declining' | 'stable' | 'none';
}

/**
 * Aggregate analytics for a specific date range
 */
export async function aggregateAnalytics(
  startDate: Date,
  endDate: Date
): Promise<AggregatedFeatureStats[]> {
  // Get feature sessions grouped by feature
  const sessionStats = await prisma.featureSession.groupBy({
    by: ['feature'],
    where: {
      startedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      id: true,
    },
    _sum: {
      duration: true,
    },
  });

  // Get unique users per feature
  const uniqueUserStats = await prisma.featureSession.groupBy({
    by: ['feature'],
    where: {
      startedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      _all: true,
    },
  });

  // Get unique user counts using raw query (Prisma limitation)
  const uniqueUsersPerFeature = new Map<string, number>();
  for (const feature of Object.values(FEATURES)) {
    const result = await prisma.featureSession.findMany({
      where: {
        feature,
        startedAt: { gte: startDate, lte: endDate },
        userId: { not: null },
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    uniqueUsersPerFeature.set(feature, result.length);
  }

  // Get event counts per feature
  const eventStats = await prisma.analyticsEvent.groupBy({
    by: ['feature'],
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      id: true,
    },
  });

  // Combine stats
  const statsMap = new Map<string, AggregatedFeatureStats>();
  
  // Initialize with all features
  for (const feature of Object.values(FEATURES)) {
    statsMap.set(feature, {
      feature,
      sessions: 0,
      uniqueUsers: 0,
      totalDuration: 0,
      eventCount: 0,
    });
  }

  // Add session stats
  for (const stat of sessionStats) {
    const existing = statsMap.get(stat.feature);
    if (existing) {
      existing.sessions = stat._count.id;
      existing.totalDuration = stat._sum.duration || 0;
    }
  }

  // Add unique users
  for (const [feature, count] of uniqueUsersPerFeature) {
    const existing = statsMap.get(feature);
    if (existing) {
      existing.uniqueUsers = count;
    }
  }

  // Add event counts
  for (const stat of eventStats) {
    const existing = statsMap.get(stat.feature);
    if (existing) {
      existing.eventCount = stat._count.id;
    }
  }

  return Array.from(statsMap.values());
}

/**
 * Run daily aggregation and store in DailyFeatureAggregate
 */
export async function runDailyAggregation(date?: Date): Promise<void> {
  const targetDate = date || new Date();
  targetDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(targetDate);
  endDate.setHours(23, 59, 59, 999);

  const stats = await aggregateAnalytics(targetDate, endDate);

  // Upsert aggregates
  for (const stat of stats) {
    await prisma.dailyFeatureAggregate.upsert({
      where: {
        date_feature: {
          date: targetDate,
          feature: stat.feature,
        },
      },
      create: {
        date: targetDate,
        feature: stat.feature,
        uniqueUsers: stat.uniqueUsers,
        totalSessions: stat.sessions,
        totalDuration: stat.totalDuration,
        eventCount: stat.eventCount,
      },
      update: {
        uniqueUsers: stat.uniqueUsers,
        totalSessions: stat.sessions,
        totalDuration: stat.totalDuration,
        eventCount: stat.eventCount,
      },
    });
  }
}

/**
 * Get usage trends for a date range
 */
export async function getUsageTrends(days: number = 7): Promise<{
  date: string;
  sessions: number;
  users: number;
  duration: number;
}[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const aggregates = await prisma.dailyFeatureAggregate.groupBy({
    by: ['date'],
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      totalSessions: true,
      uniqueUsers: true,
      totalDuration: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  return aggregates.map(agg => ({
    date: agg.date.toISOString().split('T')[0],
    sessions: agg._sum.totalSessions || 0,
    users: agg._sum.uniqueUsers || 0,
    duration: Math.round((agg._sum.totalDuration || 0) / 60), // Convert to minutes
  }));
}

/**
 * Detect unused or underused features
 */
export async function detectUnusedFeatures(
  days: number = 30,
  threshold: number = 5 // Percentage
): Promise<UnusedFeatureInfo[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get total sessions for period
  const totalSessions = await prisma.featureSession.count({
    where: {
      startedAt: { gte: startDate, lte: endDate },
    },
  });

  if (totalSessions === 0) {
    return Object.values(FEATURES).map(feature => ({
      feature,
      usagePercent: 0,
      lastUsed: null,
      trend: 'none' as const,
    }));
  }

  const unusedFeatures: UnusedFeatureInfo[] = [];

  for (const feature of Object.values(FEATURES)) {
    // Get session count for this feature
    const featureSessions = await prisma.featureSession.count({
      where: {
        feature,
        startedAt: { gte: startDate, lte: endDate },
      },
    });

    const usagePercent = (featureSessions / totalSessions) * 100;

    // Get last used date
    const lastSession = await prisma.featureSession.findFirst({
      where: { feature },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true },
    });

    // Calculate trend (compare first half vs second half of period)
    const midDate = new Date(startDate);
    midDate.setDate(midDate.getDate() + Math.floor(days / 2));

    const firstHalfCount = await prisma.featureSession.count({
      where: {
        feature,
        startedAt: { gte: startDate, lt: midDate },
      },
    });

    const secondHalfCount = await prisma.featureSession.count({
      where: {
        feature,
        startedAt: { gte: midDate, lte: endDate },
      },
    });

    let trend: 'declining' | 'stable' | 'none' = 'none';
    if (firstHalfCount > 0 || secondHalfCount > 0) {
      if (secondHalfCount < firstHalfCount * 0.7) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }
    }

    unusedFeatures.push({
      feature,
      usagePercent,
      lastUsed: lastSession?.startedAt || null,
      trend,
    });
  }

  // Sort by usage percentage (ascending)
  return unusedFeatures.sort((a, b) => a.usagePercent - b.usagePercent);
}

/**
 * Get feature statistics with trends
 */
export async function getFeatureStats(days: number = 7): Promise<{
  feature: string;
  sessions: number;
  uniqueUsers: number;
  avgDuration: number; // minutes
  trend: number; // percentage change
}[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get previous period for comparison
  const prevStartDate = new Date(startDate);
  prevStartDate.setDate(prevStartDate.getDate() - days);

  const stats: Array<{
    feature: string;
    sessions: number;
    uniqueUsers: number;
    avgDuration: number;
    trend: number;
  }> = [];

  for (const feature of Object.values(FEATURES)) {
    // Current period stats
    const currentSessions = await prisma.featureSession.findMany({
      where: {
        feature,
        startedAt: { gte: startDate, lte: endDate },
      },
      select: { duration: true, userId: true },
    });

    // Previous period stats
    const prevSessions = await prisma.featureSession.count({
      where: {
        feature,
        startedAt: { gte: prevStartDate, lt: startDate },
      },
    });

    const sessions = currentSessions.length;
    const uniqueUsers = new Set(currentSessions.map(s => s.userId).filter(Boolean)).size;
    const totalDuration = currentSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgDuration = sessions > 0 ? (totalDuration / sessions) / 60 : 0; // Convert to minutes

    // Calculate trend
    let trend = 0;
    if (prevSessions > 0) {
      trend = ((sessions - prevSessions) / prevSessions) * 100;
    } else if (sessions > 0) {
      trend = 100; // New activity
    }

    stats.push({
      feature,
      sessions,
      uniqueUsers,
      avgDuration,
      trend,
    });
  }

  return stats;
}

/**
 * Get overview statistics
 */
export async function getOverviewStats(days: number = 7): Promise<{
  totalSessions: number;
  totalUsers: number;
  totalDuration: number; // minutes
  avgSessionDuration: number; // minutes
}> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sessions = await prisma.featureSession.findMany({
    where: {
      startedAt: { gte: startDate, lte: endDate },
    },
    select: { duration: true, userId: true },
  });

  const totalSessions = sessions.length;
  const totalUsers = new Set(sessions.map(s => s.userId).filter(Boolean)).size;
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60; // minutes
  const avgSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

  return {
    totalSessions,
    totalUsers,
    totalDuration,
    avgSessionDuration,
  };
}

/**
 * Clean up old events (keep aggregates, delete raw events older than 90 days)
 */
export async function cleanupOldEvents(retentionDays: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.analyticsEvent.deleteMany({
    where: {
      timestamp: { lt: cutoffDate },
    },
  });

  return result.count;
}
