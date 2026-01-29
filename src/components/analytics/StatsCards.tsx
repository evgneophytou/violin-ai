'use client';

import { Card } from '@/components/ui/card';
import { 
  Clock, 
  Music, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Calendar,
  Sparkles
} from 'lucide-react';
import type { OverallStats } from '@/lib/analytics/analytics-service';

interface StatsCardsProps {
  stats: OverallStats;
  weeklyChange?: {
    minutes: number;
    exercises: number;
    avgScore: number;
  };
}

export const StatsCards = ({ stats, weeklyChange }: StatsCardsProps) => {
  const cards = [
    {
      title: 'Practice Time',
      value: formatTime(stats.totalPracticeMinutes),
      icon: Clock,
      change: weeklyChange?.minutes,
      changeLabel: 'min this week',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Exercises Done',
      value: stats.totalExercises.toLocaleString(),
      icon: Music,
      change: weeklyChange?.exercises,
      changeLabel: 'this week',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Avg Score',
      value: `${stats.avgScore}%`,
      icon: Target,
      change: weeklyChange?.avgScore,
      changeLabel: 'vs last week',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Total XP',
      value: stats.totalXP.toLocaleString(),
      icon: Sparkles,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="p-4">
          <div className="flex items-start justify-between">
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            {card.change !== undefined && (
              <ChangeIndicator value={card.change} label={card.changeLabel} />
            )}
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.title}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};

const ChangeIndicator = ({ value, label }: { value: number; label?: string }) => {
  if (value === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>No change</span>
      </div>
    );
  }

  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-green-500' : 'text-red-500';

  return (
    <div className={`flex items-center gap-1 text-xs ${colorClass}`}>
      <Icon className="h-3 w-3" />
      <span>{isPositive ? '+' : ''}{value} {label}</span>
    </div>
  );
};

const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

// Mini stats for sidebar
interface MiniStatsProps {
  practiceMinutes: number;
  exercises: number;
  streak: number;
}

export const MiniStats = ({ practiceMinutes, exercises, streak }: MiniStatsProps) => {
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="p-2 bg-secondary/30 rounded-lg">
        <p className="text-lg font-bold">{formatTime(practiceMinutes)}</p>
        <p className="text-xs text-muted-foreground">Total Time</p>
      </div>
      <div className="p-2 bg-secondary/30 rounded-lg">
        <p className="text-lg font-bold">{exercises}</p>
        <p className="text-xs text-muted-foreground">Exercises</p>
      </div>
      <div className="p-2 bg-secondary/30 rounded-lg">
        <p className="text-lg font-bold">{streak}</p>
        <p className="text-xs text-muted-foreground">Day Streak</p>
      </div>
    </div>
  );
};
