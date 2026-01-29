'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Trophy, Target } from 'lucide-react';
import type { DifficultyAdjustment, PerformanceAnalysis } from '@/types';

interface AdaptiveIndicatorProps {
  currentDifficulty: number;
  lastAdjustment: DifficultyAdjustment | null;
  performanceHistory: PerformanceAnalysis[];
}

export const AdaptiveIndicator = ({
  currentDifficulty,
  lastAdjustment,
  performanceHistory,
}: AdaptiveIndicatorProps) => {
  // Calculate trend from recent performances
  const recentScores = performanceHistory.slice(-5).map(p => p.overallScore);
  const averageScore = recentScores.length > 0 
    ? Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length)
    : 0;
  
  // Determine trend
  let trend: 'improving' | 'steady' | 'struggling' = 'steady';
  if (recentScores.length >= 3) {
    const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2));
    const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg + 5) trend = 'improving';
    else if (secondAvg < firstAvg - 5) trend = 'struggling';
  }

  const trendIcons = {
    improving: <TrendingUp className="h-4 w-4 text-green-500" />,
    steady: <Minus className="h-4 w-4 text-yellow-500" />,
    struggling: <TrendingDown className="h-4 w-4 text-red-500" />,
  };

  const trendLabels = {
    improving: 'Improving',
    steady: 'Steady',
    struggling: 'Needs focus',
  };

  const trendColors = {
    improving: 'text-green-600 bg-green-50',
    steady: 'text-yellow-600 bg-yellow-50',
    struggling: 'text-red-600 bg-red-50',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Adaptive Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Level */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Level</span>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-2xl font-bold">{currentDifficulty}</span>
            <span className="text-muted-foreground">/10</span>
          </div>
        </div>

        {/* Progress bar showing position in difficulty spectrum */}
        <div className="space-y-1">
          <Progress value={currentDifficulty * 10} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Beginner</span>
            <span>Master</span>
          </div>
        </div>

        {/* Trend indicator */}
        {performanceHistory.length > 0 && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2">
              {trendIcons[trend]}
              <span className="text-sm font-medium">{trendLabels[trend]}</span>
            </div>
            <Badge className={trendColors[trend]}>
              Avg: {averageScore}%
            </Badge>
          </div>
        )}

        {/* Last adjustment message */}
        {lastAdjustment && (
          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-sm">{lastAdjustment.reason}</p>
            {lastAdjustment.focusAreas.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {lastAdjustment.focusAreas.map((area) => (
                  <Badge key={area} variant="outline" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Session stats */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center p-2 bg-secondary/30 rounded-lg">
            <p className="text-2xl font-bold">{performanceHistory.length}</p>
            <p className="text-xs text-muted-foreground">Exercises Done</p>
          </div>
          <div className="text-center p-2 bg-secondary/30 rounded-lg">
            <p className="text-2xl font-bold">{averageScore}%</p>
            <p className="text-xs text-muted-foreground">Session Avg</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
