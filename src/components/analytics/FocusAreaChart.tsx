'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart } from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { FocusAreaStats } from '@/lib/analytics/analytics-service';

interface FocusAreaChartProps {
  data: FocusAreaStats[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const FOCUS_LABELS: Record<string, string> = {
  scales: 'Scales',
  arpeggios: 'Arpeggios',
  bowing: 'Bowing',
  intonation: 'Intonation',
  rhythm: 'Rhythm',
  mixed: 'Mixed',
};

export const FocusAreaChart = ({ data }: FocusAreaChartProps) => {
  const chartData = data.map(item => ({
    name: FOCUS_LABELS[item.focusArea] || item.focusArea,
    value: item.totalMinutes,
    count: item.count,
    avgScore: item.avgScore,
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Focus Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No focus area data yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PieChart className="h-4 w-4" />
          Practice Focus Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name, props) => {
                  const payload = props?.payload as { count: number; avgScore: number } | undefined;
                  return [
                    `${value} min (${payload?.count ?? 0} sessions, avg ${payload?.avgScore ?? 0}%)`,
                    name
                  ];
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Simple bar representation for sidebar
export const FocusAreaBars = ({ data }: FocusAreaChartProps) => {
  const total = data.reduce((sum, item) => sum + item.totalMinutes, 0);
  
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Focus Distribution</p>
      {data.slice(0, 5).map((item, index) => {
        const percent = Math.round((item.totalMinutes / total) * 100);
        return (
          <div key={item.focusArea} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="capitalize">{FOCUS_LABELS[item.focusArea] || item.focusArea}</span>
              <span className="text-muted-foreground">{percent}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${percent}%`,
                  backgroundColor: COLORS[index % COLORS.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
