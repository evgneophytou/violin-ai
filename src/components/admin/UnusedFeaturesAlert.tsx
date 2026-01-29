'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Activity } from 'lucide-react';

interface UnusedFeature {
  feature: string;
  usagePercent: number;
  lastUsed: string | null;
  trend: 'declining' | 'stable' | 'none';
}

interface UnusedFeaturesAlertProps {
  features: UnusedFeature[];
  threshold?: number; // Percentage below which a feature is "unused"
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

const getTrendIcon = (trend: UnusedFeature['trend']) => {
  switch (trend) {
    case 'declining':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case 'stable':
      return <Activity className="h-4 w-4 text-amber-500" />;
    default:
      return null;
  }
};

const formatLastUsed = (lastUsed: string | null): string => {
  if (!lastUsed) return 'Never';
  
  const date = new Date(lastUsed);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

export const UnusedFeaturesAlert = ({ 
  features, 
  threshold = 5 
}: UnusedFeaturesAlertProps) => {
  const unusedFeatures = features
    .filter(f => f.usagePercent < threshold)
    .sort((a, b) => a.usagePercent - b.usagePercent);

  if (unusedFeatures.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-500" />
            All Features Active
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All features are being used above the {threshold}% threshold.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          Underused Features ({unusedFeatures.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          The following features have less than {threshold}% usage. Consider improving
          discoverability or removing them.
        </p>
        
        <div className="space-y-3">
          {unusedFeatures.map((feature) => (
            <div 
              key={feature.feature}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-2">
                {getTrendIcon(feature.trend)}
                <span className="font-medium">
                  {FEATURE_LABELS[feature.feature] || feature.feature}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {feature.usagePercent.toFixed(1)}%
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatLastUsed(feature.lastUsed)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
