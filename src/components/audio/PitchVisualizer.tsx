'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import type { DetectedPitch } from '@/types';
import { getPitchQuality } from '@/lib/audio/pitch-detector';
import {
  getIntonationAnalyzer,
  type IntonationAnalysisResult,
} from '@/lib/ai/intonation-agent';

interface PitchVisualizerProps {
  currentPitch: DetectedPitch | null;
  targetNote?: string;
  volume: number;
  isActive: boolean;
  showAdvancedAnalysis?: boolean;
}

// Convert note name + octave to MIDI number
const noteToMidi = (note: string, octave: number): number => {
  const noteMap: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
  };
  return (octave + 1) * 12 + (noteMap[note] || 0);
};

export const PitchVisualizer = ({
  currentPitch,
  targetNote,
  volume,
  isActive,
  showAdvancedAnalysis = true,
}: PitchVisualizerProps) => {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [intonationAnalysis, setIntonationAnalysis] = useState<IntonationAnalysisResult | null>(null);
  const [recentCents, setRecentCents] = useState<number[]>([]);
  const analyzerRef = useRef(getIntonationAnalyzer());

  // Feed pitch data to the intonation analyzer
  useEffect(() => {
    if (!isActive || !currentPitch || currentPitch.clarity < 0.7) return;

    const analyzer = analyzerRef.current;
    analyzer.addSample(currentPitch.frequency, volume);

    // Track recent cents for trend display
    setRecentCents((prev) => {
      const newCents = [...prev, currentPitch.cents];
      if (newCents.length > 20) newCents.shift();
      return newCents;
    });
  }, [currentPitch, isActive, volume]);

  // Update analysis periodically
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const analysis = analyzerRef.current.getAnalysis();
      setIntonationAnalysis(analysis);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Reset analyzer when becoming inactive
  useEffect(() => {
    if (!isActive) {
      analyzerRef.current.reset();
      setRecentCents([]);
    }
  }, [isActive]);

  const pitchQuality = useMemo(() => {
    if (!currentPitch) return null;
    return getPitchQuality(currentPitch.cents);
  }, [currentPitch]);

  const qualityColors: Record<string, string> = {
    perfect: 'bg-green-500',
    good: 'bg-lime-500',
    fair: 'bg-yellow-500',
    poor: 'bg-red-500',
  };

  const qualityText: Record<string, string> = {
    perfect: 'Perfect!',
    good: 'Good',
    fair: 'Fair',
    poor: 'Adjust',
  };

  // Calculate position on the tuner bar (-50 to +50 cents)
  const tunerPosition = useMemo(() => {
    if (!currentPitch) return 50;
    const clamped = Math.max(-50, Math.min(50, currentPitch.cents));
    return ((clamped + 50) / 100) * 100;
  }, [currentPitch]);

  // Calculate trend from recent cents
  const trend = useMemo(() => {
    if (recentCents.length < 5) return 'stable';
    const firstHalf = recentCents.slice(0, Math.floor(recentCents.length / 2));
    const secondHalf = recentCents.slice(Math.floor(recentCents.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const diff = avgSecond - avgFirst;
    if (diff > 3) return 'rising';
    if (diff < -3) return 'falling';
    return 'stable';
  }, [recentCents]);

  // Mini histogram for cents distribution
  const centsHistogram = useMemo(() => {
    if (recentCents.length < 5) return null;
    const buckets = Array(10).fill(0);
    recentCents.forEach((c) => {
      const idx = Math.min(9, Math.max(0, Math.floor((c + 50) / 10)));
      buckets[idx]++;
    });
    const max = Math.max(...buckets);
    return buckets.map((count) => (max > 0 ? (count / max) * 100 : 0));
  }, [recentCents]);

  // Get note report from analyzer if we have current pitch
  const currentNoteReport = useMemo(() => {
    if (!currentPitch) return null;
    const midi = noteToMidi(currentPitch.note, currentPitch.octave);
    return analyzerRef.current.getNoteReport(midi);
  }, [currentPitch]);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            Real-time Pitch Detection
          </h3>
          <div className="flex items-center gap-2">
            {trend !== 'stable' && isActive && (
              <Badge variant="outline" className="text-xs">
                {trend === 'rising' ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-orange-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-blue-500" />
                )}
                {trend}
              </Badge>
            )}
            <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          </div>
        </div>

        {/* Main pitch display */}
        <div className="text-center py-4">
          {currentPitch ? (
            <div className="space-y-2">
              <div className="text-4xl font-bold">
                {currentPitch.note}
                <span className="text-2xl text-muted-foreground">{currentPitch.octave}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {currentPitch.frequency.toFixed(1)} Hz
              </div>
              {pitchQuality && (
                <div className={`inline-block px-3 py-1 rounded-full text-white text-sm font-medium ${qualityColors[pitchQuality]}`}>
                  {qualityText[pitchQuality]}
                </div>
              )}
            </div>
          ) : (
            <div className="text-2xl text-muted-foreground">
              {isActive ? 'Listening...' : 'Not active'}
            </div>
          )}
        </div>

        {/* Tuner bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Flat (-50¢)</span>
            <span>In Tune</span>
            <span>Sharp (+50¢)</span>
          </div>
          <div className="relative h-4 bg-secondary rounded-full overflow-hidden">
            {/* Center marker */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-primary -translate-x-1/2 z-10" />
            
            {/* Pitch indicator */}
            {currentPitch && (
              <div
                className={`absolute top-0 bottom-0 w-3 rounded-full transition-all duration-75 ${
                  pitchQuality ? qualityColors[pitchQuality] : 'bg-primary'
                }`}
                style={{ left: `calc(${tunerPosition}% - 6px)` }}
              />
            )}
          </div>
          {currentPitch && (
            <div className="text-center text-sm">
              <span className={currentPitch.cents >= 0 ? 'text-orange-500' : 'text-blue-500'}>
                {currentPitch.cents >= 0 ? '+' : ''}{currentPitch.cents}¢
              </span>
            </div>
          )}
        </div>

        {/* Mini Cents Histogram */}
        {centsHistogram && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Cents Distribution</div>
            <div className="flex gap-0.5 h-6 items-end">
              {centsHistogram.map((height, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-t ${
                    idx === 4 || idx === 5 ? 'bg-green-500' : 'bg-muted-foreground/50'
                  }`}
                  style={{ height: `${Math.max(2, height)}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Target note indicator */}
        {targetNote && (
          <div className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Target:</span>
            <span className="font-bold">{targetNote}</span>
          </div>
        )}

        {/* Volume meter */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Volume</span>
            <span>{Math.round(volume * 100)}%</span>
          </div>
          <Progress value={volume * 100} className="h-2" />
        </div>

        {/* Advanced Analysis Section */}
        {showAdvancedAnalysis && intonationAnalysis && (
          <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Advanced Analysis
                </span>
                {analysisOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {/* Overall Accuracy */}
              <div className="p-2 bg-secondary/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Overall Accuracy</span>
                  <Badge variant={
                    intonationAnalysis.overallAccuracy >= 90 ? 'default' :
                    intonationAnalysis.overallAccuracy >= 70 ? 'secondary' : 'destructive'
                  }>
                    {intonationAnalysis.overallAccuracy.toFixed(0)}%
                  </Badge>
                </div>
                <div className="text-xs mt-1">
                  Avg deviation: {intonationAnalysis.averageDeviation.toFixed(1)}¢
                </div>
              </div>

              {/* Vibrato Detection */}
              <div className="p-2 bg-secondary/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Vibrato</span>
                  <Badge variant={intonationAnalysis.vibratoPresent ? 'default' : 'outline'}>
                    {intonationAnalysis.vibratoPresent ? 'Detected' : 'None'}
                  </Badge>
                </div>
                {intonationAnalysis.vibratoPresent && (
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Rate:</span>{' '}
                      {intonationAnalysis.averageVibratoRate.toFixed(1)} Hz
                    </div>
                    <div>
                      <span className="text-muted-foreground">Width:</span>{' '}
                      {intonationAnalysis.averageVibratoWidth.toFixed(0)}¢
                    </div>
                  </div>
                )}
              </div>

              {/* Current Note Stats */}
              {currentNoteReport && currentNoteReport.samples > 3 && (
                <div className="p-2 bg-secondary/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    Current Note ({currentPitch?.note}{currentPitch?.octave})
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Avg</div>
                      <div className={currentNoteReport.averageCents > 0 ? 'text-orange-500' : 'text-blue-500'}>
                        {currentNoteReport.averageCents > 0 ? '+' : ''}{currentNoteReport.averageCents.toFixed(1)}¢
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Stability</div>
                      <div>{currentNoteReport.stability.toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Samples</div>
                      <div>{currentNoteReport.samples}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {intonationAnalysis.suggestions.length > 0 && (
                <div className="p-2 bg-secondary/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Suggestions</div>
                  <ul className="text-xs space-y-1">
                    {intonationAnalysis.suggestions.slice(0, 3).map((suggestion, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-primary">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </Card>
  );
};
