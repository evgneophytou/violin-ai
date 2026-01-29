import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateDefaultUser } from '@/lib/db';
import {
  getDailyStats,
  getFocusAreaStats,
  getOverallStats,
  getProgressTrend,
  getWeeklySummary,
  getPracticeCalendar,
} from '@/lib/analytics/analytics-service';
import { logError } from '@/lib/validation';

// GET /api/analytics - Get analytics data
export async function GET(request: NextRequest) {
  try {
    const user = await getOrCreateDefaultUser();
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const [
      dailyStats,
      focusAreaStats,
      overallStats,
      progressTrend,
      weeklySummary,
      calendarData,
    ] = await Promise.all([
      getDailyStats(user.id, days),
      getFocusAreaStats(user.id, days),
      getOverallStats(user.id),
      getProgressTrend(user.id, days),
      getWeeklySummary(user.id),
      getPracticeCalendar(user.id, 4),
    ]);
    
    return NextResponse.json({
      dailyStats,
      focusAreaStats,
      overallStats,
      progressTrend,
      weeklySummary,
      calendarData,
    });
  } catch (error) {
    logError('analytics', error);
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}
