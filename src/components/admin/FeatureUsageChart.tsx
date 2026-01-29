'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';

interface FeatureUsageData {
  feature: string;
  sessions: number;
  duration: number; // in minutes
  users: number;
}

interface FeatureUsageChartProps {
  data: FeatureUsageData[];
  title?: string;
  metric?: 'sessions' | 'duration' | 'users';
}

// Feature display names
const FEATURE_LABELS: Record<string, string> = {
  practice: 'Practice',
  sight_reading: 'Sight Reading',
  studio: 'Studio',
  expression: 'Expression',
  tools: 'Tools',
  journal: 'Journal',
  theory: 'Theory',
  review: 'Review',
  metronome: 'Metronome',
  technique: 'Technique',
  exams: 'Exams',
  stats: 'Stats',
  repertoire: 'Repertoire',
  wellness: 'Wellness',
  schedule: 'Schedule',
  reference: 'Reference',
  my_pieces: 'My Pieces',
  coach: 'Coach',
};

// Colors for bars
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export const FeatureUsageChart = ({ 
  data, 
  title = 'Feature Usage', 
  metric = 'sessions' 
}: FeatureUsageChartProps) => {
  // Sort by selected metric (descending)
  const sortedData = [...data].sort((a, b) => b[metric] - a[metric]);

  // Format data for chart
  const chartData = sortedData.map(item => ({
    name: FEATURE_LABELS[item.feature] || item.feature,
    value: metric === 'duration' ? Math.round(item.duration) : item[metric],
    feature: item.feature,
  }));

  const getMetricLabel = () => {
    switch (metric) {
      case 'sessions': return 'Sessions';
      case 'duration': return 'Minutes';
      case 'users': return 'Users';
      default: return metric;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number" 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                width={75}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ fontWeight: 600 }}
                formatter={(value) => [value, getMetricLabel()]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
