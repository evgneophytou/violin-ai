'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ProgressTrend } from '@/lib/analytics/analytics-service';

interface ProgressChartProps {
  data: ProgressTrend[];
  title?: string;
}

export const ProgressChart = ({ data, title = 'Performance Trend' }: ProgressChartProps) => {
  // Memoize formatted data to prevent recalculation on every render
  const formattedData = useMemo(() => 
    data.map(item => ({
      ...item,
      displayDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })),
    [data]
  );

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="h-[200px] flex items-center justify-center text-muted-foreground"
            role="status"
            aria-label="No performance data available"
          >
            No performance data yet. Complete some exercises to see your progress!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full" role="img" aria-label={`${title} chart showing pitch, rhythm, and overall scores over time`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgPitchAcc"
                name="Pitch"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="avgRhythmAcc"
                name="Rhythm"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="avgOverallScore"
                name="Overall"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Simplified chart for daily practice time
interface PracticeTimeChartProps {
  data: Array<{ date: string; practiceMinutes: number }>;
}

export const PracticeTimeChart = ({ data }: PracticeTimeChartProps) => {
  // Memoize formatted data
  const formattedData = useMemo(() => 
    data.slice(-14).map(item => ({
      ...item,
      displayDate: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
    })),
    [data]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Practice Time (Last 2 Weeks)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[150px] w-full" role="img" aria-label="Practice time chart showing minutes practiced over the last 2 weeks">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                formatter={(value) => [`${value} min`, 'Practice']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="practiceMinutes"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="hsl(var(--primary))"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
