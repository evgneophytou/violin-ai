import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { 
  getOverviewStats, 
  getFeatureStats, 
  getUsageTrends, 
  detectUnusedFeatures,
  aggregateAnalytics,
  runDailyAggregation,
} from '@/lib/analytics/aggregation';
import { logError } from '@/lib/validation';

// Query params schema
const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(7),
});

/**
 * GET /api/admin/analytics
 * Get analytics dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const { authorized, error } = await requireAdmin('viewer');
    if (!authorized) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const parseResult = querySchema.safeParse({
      days: searchParams.get('days') || '7',
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const { days } = parseResult.data;

    // Fetch all analytics data in parallel
    const [overview, featureStats, trends, unusedFeatures] = await Promise.all([
      getOverviewStats(days),
      getFeatureStats(days),
      getUsageTrends(days),
      detectUnusedFeatures(days),
    ]);

    // Transform feature stats for chart
    const featureUsage = featureStats.map(stat => ({
      feature: stat.feature,
      sessions: stat.sessions,
      duration: stat.avgDuration * stat.sessions, // Total duration
      users: stat.uniqueUsers,
    }));

    // Transform unused features
    const unusedFeaturesData = unusedFeatures.map(f => ({
      feature: f.feature,
      usagePercent: f.usagePercent,
      lastUsed: f.lastUsed?.toISOString() || null,
      trend: f.trend,
    }));

    return NextResponse.json({
      overview,
      featureUsage,
      trends,
      unusedFeatures: unusedFeaturesData,
      featureStats,
    });
  } catch (error) {
    logError('admin/analytics', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/analytics
 * Trigger aggregation manually (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication with admin role
    const { authorized, error } = await requireAdmin('admin');
    if (!authorized) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action, date } = body;

    if (action === 'aggregate') {
      // Run aggregation for specific date or today
      const targetDate = date ? new Date(date) : new Date();
      await runDailyAggregation(targetDate);
      
      return NextResponse.json({ 
        success: true, 
        message: `Aggregation completed for ${targetDate.toISOString().split('T')[0]}` 
      });
    }

    if (action === 'backfill') {
      // Backfill aggregates for past days
      const days = body.days || 30;
      const results: string[] = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        await runDailyAggregation(date);
        results.push(date.toISOString().split('T')[0]);
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Backfilled ${days} days`,
        dates: results,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "aggregate" or "backfill"' },
      { status: 400 }
    );
  } catch (error) {
    logError('admin/analytics/action', error);
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    );
  }
}
