'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface FeatureStats {
  feature: string;
  sessions: number;
  uniqueUsers: number;
  avgDuration: number; // minutes
  trend: number; // percentage change
}

interface FeatureSessionsTableProps {
  data: FeatureStats[];
  title?: string;
}

type SortKey = 'feature' | 'sessions' | 'uniqueUsers' | 'avgDuration' | 'trend';
type SortDirection = 'asc' | 'desc';

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

const TrendIndicator = ({ value }: { value: number }) => {
  if (value > 5) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <TrendingUp className="h-4 w-4" />
        <span>+{value.toFixed(1)}%</span>
      </div>
    );
  }
  if (value < -5) {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <TrendingDown className="h-4 w-4" />
        <span>{value.toFixed(1)}%</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Minus className="h-4 w-4" />
      <span>{value > 0 ? '+' : ''}{value.toFixed(1)}%</span>
    </div>
  );
};

export const FeatureSessionsTable = ({ 
  data, 
  title = 'Feature Sessions' 
}: FeatureSessionsTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('sessions');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aValue = sortKey === 'feature' 
      ? (FEATURE_LABELS[a.feature] || a.feature) 
      : a[sortKey];
    const bValue = sortKey === 'feature' 
      ? (FEATURE_LABELS[b.feature] || b.feature) 
      : b[sortKey];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' 
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-medium"
      onClick={() => handleSort(sortKeyName)}
    >
      {label}
      {sortKey === sortKeyName ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="ml-1 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-1 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
      )}
    </Button>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">
                  <SortHeader label="Feature" sortKeyName="feature" />
                </th>
                <th className="text-right py-2 px-2">
                  <SortHeader label="Sessions" sortKeyName="sessions" />
                </th>
                <th className="text-right py-2 px-2">
                  <SortHeader label="Users" sortKeyName="uniqueUsers" />
                </th>
                <th className="text-right py-2 px-2">
                  <SortHeader label="Avg Duration" sortKeyName="avgDuration" />
                </th>
                <th className="text-right py-2 px-2">
                  <SortHeader label="Trend" sortKeyName="trend" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row) => (
                <tr key={row.feature} className="border-b last:border-0">
                  <td className="py-3 px-2">
                    <span className="font-medium">
                      {FEATURE_LABELS[row.feature] || row.feature}
                    </span>
                  </td>
                  <td className="text-right py-3 px-2">
                    <Badge variant="secondary">{row.sessions.toLocaleString()}</Badge>
                  </td>
                  <td className="text-right py-3 px-2">
                    {row.uniqueUsers.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-2">
                    {row.avgDuration.toFixed(1)} min
                  </td>
                  <td className="text-right py-3 px-2">
                    <TrendIndicator value={row.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
