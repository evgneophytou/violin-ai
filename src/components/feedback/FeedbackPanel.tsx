'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Music, 
  Clock, 
  Volume2, 
  Waves,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Target
} from 'lucide-react';
import type { PerformanceAnalysis } from '@/types';

interface FeedbackPanelProps {
  analysis: PerformanceAnalysis | null;
  isLoading?: boolean;
}

export const FeedbackPanel = ({ analysis, isLoading }: FeedbackPanelProps) => {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Analyzing your performance...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Record your performance to receive detailed feedback
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-lime-600';
    if (score >= 55) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-lime-500';
    if (score >= 55) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Feedback
          </span>
          <span className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>
            {analysis.overallScore}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {/* Encouragement */}
            <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-sm">{analysis.encouragement}</p>
            </div>

            {/* Pitch Analysis */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Pitch Accuracy
                </h4>
                <span className={`font-bold ${getScoreColor(analysis.pitch.accuracy)}`}>
                  {analysis.pitch.accuracy}%
                </span>
              </div>
              <Progress 
                value={analysis.pitch.accuracy} 
                className={`h-2 ${getProgressColor(analysis.pitch.accuracy)}`} 
              />
              {analysis.pitch.suggestions.length > 0 && (
                <ul className="text-sm text-muted-foreground space-y-1">
                  {analysis.pitch.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
              {(analysis.pitch.sharpNotes.length > 0 || analysis.pitch.flatNotes.length > 0) && (
                <div className="flex gap-2 flex-wrap">
                  {analysis.pitch.sharpNotes.length > 0 && (
                    <Badge variant="outline" className="text-orange-600">
                      Sharp: {analysis.pitch.sharpNotes.length} notes
                    </Badge>
                  )}
                  {analysis.pitch.flatNotes.length > 0 && (
                    <Badge variant="outline" className="text-blue-600">
                      Flat: {analysis.pitch.flatNotes.length} notes
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Rhythm Analysis */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Rhythm Accuracy
                </h4>
                <span className={`font-bold ${getScoreColor(analysis.rhythm.accuracy)}`}>
                  {analysis.rhythm.accuracy}%
                </span>
              </div>
              <Progress 
                value={analysis.rhythm.accuracy} 
                className={`h-2 ${getProgressColor(analysis.rhythm.accuracy)}`} 
              />
              <div className="flex gap-2 flex-wrap">
                {analysis.rhythm.rushingTendency && (
                  <Badge variant="outline" className="text-orange-600">
                    Rushing tendency
                  </Badge>
                )}
                {analysis.rhythm.draggingTendency && (
                  <Badge variant="outline" className="text-blue-600">
                    Dragging tendency
                  </Badge>
                )}
                <Badge variant="outline">
                  Tempo consistency: {analysis.rhythm.tempoConsistency}%
                </Badge>
              </div>
              {analysis.rhythm.suggestions.length > 0 && (
                <ul className="text-sm text-muted-foreground space-y-1">
                  {analysis.rhythm.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            {/* Dynamics Analysis */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Dynamics
                </h4>
                <span className={`font-bold ${getScoreColor((analysis.dynamics.crescendoControl + analysis.dynamics.diminuendoControl) / 2)}`}>
                  {Math.round((analysis.dynamics.crescendoControl + analysis.dynamics.diminuendoControl) / 2)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Crescendo</p>
                  <Progress value={analysis.dynamics.crescendoControl} className="h-2" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Diminuendo</p>
                  <Progress value={analysis.dynamics.diminuendoControl} className="h-2" />
                </div>
              </div>
              {analysis.dynamics.suggestions.length > 0 && (
                <ul className="text-sm text-muted-foreground space-y-1">
                  {analysis.dynamics.suggestions.slice(0, 2).map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            {/* Phrasing Analysis */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Waves className="h-4 w-4" />
                  Phrasing
                </h4>
                <span className={`font-bold ${getScoreColor((analysis.phrasing.legato + analysis.phrasing.articulation) / 2)}`}>
                  {Math.round((analysis.phrasing.legato + analysis.phrasing.articulation) / 2)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Legato</p>
                  <Progress value={analysis.phrasing.legato} className="h-2" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Articulation</p>
                  <Progress value={analysis.phrasing.articulation} className="h-2" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">
                "{analysis.phrasing.musicalLine}"
              </p>
            </div>

            <Separator />

            {/* Next Focus */}
            <div className="p-3 bg-secondary rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Target className="h-4 w-4" />
                Next Focus Area
              </h4>
              <p className="text-sm">{analysis.nextFocus}</p>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
