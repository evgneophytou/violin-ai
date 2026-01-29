'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart3, Calendar, TrendingUp, PieChart } from 'lucide-react';
import { StatsCards } from './StatsCards';
import { PracticeCalendar } from './PracticeCalendar';
import { ProgressChart, PracticeTimeChart } from './ProgressChart';
import { FocusAreaChart } from './FocusAreaChart';
import type {
  OverallStats,
  DailyStats,
  FocusAreaStats,
  ProgressTrend,
} from '@/lib/analytics/analytics-service';

interface AnalyticsDashboardProps {
  overallStats: OverallStats;
  dailyStats: DailyStats[];
  focusAreaStats: FocusAreaStats[];
  progressTrend: ProgressTrend[];
  calendarData: Array<{ date: string; level: number; minutes: number }>;
  weeklyChange?: {
    minutes: number;
    exercises: number;
    avgScore: number;
  };
}

export const AnalyticsDashboard = ({
  overallStats,
  dailyStats,
  focusAreaStats,
  progressTrend,
  calendarData,
  weeklyChange,
}: AnalyticsDashboardProps) => {
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <StatsCards stats={overallStats} weeklyChange={weeklyChange} />
      
      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Progress</span>
          </TabsTrigger>
          <TabsTrigger value="focus" className="gap-2">
            <PieChart className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Focus</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <PracticeTimeChart data={dailyStats} />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  <div className="flex justify-between items-center">
                    <dt className="text-muted-foreground">Total Sessions</dt>
                    <dd className="font-bold">{overallStats.totalSessions}</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-muted-foreground">Perfect Scores</dt>
                    <dd className="font-bold">{overallStats.perfectScores}</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-muted-foreground">Scales Completed</dt>
                    <dd className="font-bold">{overallStats.scalesCompleted}</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-muted-foreground">Arpeggios Completed</dt>
                    <dd className="font-bold">{overallStats.arpeggiosCompleted}</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-muted-foreground">Current Streak</dt>
                    <dd className="font-bold">{overallStats.currentStreak} days</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-muted-foreground">Longest Streak</dt>
                    <dd className="font-bold">{overallStats.longestStreak} days</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="progress" className="mt-4">
          <ProgressChart data={progressTrend} />
        </TabsContent>
        
        <TabsContent value="focus" className="mt-4">
          <FocusAreaChart data={focusAreaStats} />
        </TabsContent>
        
        <TabsContent value="calendar" className="mt-4">
          <PracticeCalendar data={calendarData} months={4} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Compact version for sidebar or modal
export const AnalyticsSummary = ({
  overallStats,
  dailyStats,
}: Pick<AnalyticsDashboardProps, 'overallStats' | 'dailyStats'>) => {
  // Memoize computed values
  const recentDays = useMemo(() => dailyStats.slice(-7), [dailyStats]);
  
  const weekMinutes = useMemo(
    () => recentDays.reduce((sum, d) => sum + d.practiceMinutes, 0),
    [recentDays]
  );
  
  const weekExercises = useMemo(
    () => recentDays.reduce((sum, d) => sum + d.exercisesCompleted, 0),
    [recentDays]
  );
  
  const maxMinutes = useMemo(
    () => Math.max(...recentDays.map(d => d.practiceMinutes), 1),
    [recentDays]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{weekMinutes}</p>
            <p className="text-xs text-muted-foreground">Minutes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{weekExercises}</p>
            <p className="text-xs text-muted-foreground">Exercises</p>
          </div>
        </div>
        
        {/* Mini bar chart for daily practice */}
        <div 
          className="flex items-end justify-between h-16 mt-4 gap-1"
          role="img"
          aria-label={`Weekly practice chart: ${weekMinutes} total minutes this week`}
        >
          {recentDays.map((day) => {
            const height = (day.practiceMinutes / maxMinutes) * 100;
            const dayLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(day.date).getDay()];
            
            return (
              <div
                key={day.date}
                className="flex-1 bg-primary/20 rounded-t relative group"
                style={{ height: `${Math.max(height, 4)}%` }}
                title={`${dayLabel}: ${day.practiceMinutes} min`}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 bg-primary rounded-t transition-all"
                  style={{ height: `${height}%` }}
                />
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                  {dayLabel.charAt(0)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
