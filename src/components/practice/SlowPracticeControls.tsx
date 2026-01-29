'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Gauge, 
  Repeat, 
  TrendingUp, 
  X, 
  ChevronDown, 
  ChevronUp,
  Play,
  Square
} from 'lucide-react';
import type { LoopConfig, Note } from '@/types';

interface SlowPracticeControlsProps {
  baseTempo: number;
  tempoPercent: number;
  onTempoPercentChange: (percent: number) => void;
  loopConfig: LoopConfig | null;
  onLoopChange: (config: LoopConfig | null) => void;
  loopCount: number;
  totalMeasures: number;
  notes: Note[];
  isPlaying: boolean;
  disabled?: boolean;
  onPlay?: () => void;
  onStop?: () => void;
}

const TEMPO_PRESETS = [25, 50, 75, 100];

export const SlowPracticeControls = ({
  baseTempo,
  tempoPercent,
  onTempoPercentChange,
  loopConfig,
  onLoopChange,
  loopCount,
  totalMeasures,
  notes,
  isPlaying,
  disabled = false,
  onPlay,
  onStop,
}: SlowPracticeControlsProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoIncrease, setAutoIncrease] = useState(false);
  const [increaseAmount, setIncreaseAmount] = useState(5);
  
  const effectiveTempo = Math.round(baseTempo * (tempoPercent / 100));
  
  // Calculate measure ranges from notes
  const getMeasureFromNote = useCallback((noteIndex: number): number => {
    if (!notes.length || noteIndex < 0) return 1;
    // Assuming 4 beats per measure (can be made dynamic based on time signature)
    const beatsPerMeasure = 4;
    const note = notes[noteIndex];
    if (!note) return 1;
    return Math.floor(note.startTime / beatsPerMeasure) + 1;
  }, [notes]);

  const getNoteIndexForMeasure = useCallback((measure: number, findStart: boolean): number => {
    if (!notes.length) return 0;
    const beatsPerMeasure = 4;
    const measureStartBeat = (measure - 1) * beatsPerMeasure;
    const measureEndBeat = measure * beatsPerMeasure;
    
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      if (findStart) {
        if (note.startTime >= measureStartBeat) return i;
      } else {
        if (note.startTime >= measureEndBeat) return Math.max(0, i - 1);
      }
    }
    return findStart ? 0 : notes.length - 1;
  }, [notes]);

  const handleLoopRangeChange = useCallback((values: number[]) => {
    if (values.length !== 2) return;
    
    const [startMeasure, endMeasure] = values;
    const startNoteIndex = getNoteIndexForMeasure(startMeasure, true);
    const endNoteIndex = getNoteIndexForMeasure(endMeasure, false);
    
    onLoopChange({
      startMeasure,
      endMeasure,
      startNoteIndex,
      endNoteIndex,
      enabled: true,
    });
  }, [getNoteIndexForMeasure, onLoopChange]);

  const handleToggleLoop = useCallback(() => {
    if (loopConfig?.enabled) {
      onLoopChange(null);
    } else {
      // Enable loop with full range
      onLoopChange({
        startMeasure: 1,
        endMeasure: totalMeasures,
        startNoteIndex: 0,
        endNoteIndex: notes.length - 1,
        enabled: true,
      });
    }
  }, [loopConfig, onLoopChange, totalMeasures, notes.length]);

  const handleTempoPreset = useCallback((preset: number) => {
    onTempoPercentChange(preset);
  }, [onTempoPercentChange]);

  const handleAutoIncreaseToggle = useCallback(() => {
    setAutoIncrease(prev => !prev);
    // Auto increase would be handled in the playback logic
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardHeader 
        className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        aria-label="Toggle slow practice controls"
      >
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            <span>Slow Practice</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {effectiveTempo} BPM
            </Badge>
            {loopConfig?.enabled && (
              <Badge variant="outline" className="gap-1">
                <Repeat className="h-3 w-3" />
                {loopCount}
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4 pb-4">
          {/* Tempo Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Tempo</label>
              <span className="text-sm text-muted-foreground">
                {tempoPercent}% ({effectiveTempo} BPM)
              </span>
            </div>
            
            <Slider
              value={[tempoPercent]}
              onValueChange={(values) => onTempoPercentChange(values[0])}
              min={25}
              max={100}
              step={5}
              disabled={disabled}
              aria-label="Tempo percentage"
            />
            
            {/* Tempo Presets */}
            <div className="flex gap-2">
              {TEMPO_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  variant={tempoPercent === preset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTempoPreset(preset)}
                  disabled={disabled}
                  className="flex-1"
                  aria-label={`Set tempo to ${preset}%`}
                >
                  {preset}%
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Loop Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                <label className="text-sm font-medium">Loop Section</label>
              </div>
              <Button
                variant={loopConfig?.enabled ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggleLoop}
                disabled={disabled || totalMeasures === 0}
                className="gap-1"
                aria-label={loopConfig?.enabled ? 'Disable loop' : 'Enable loop'}
              >
                {loopConfig?.enabled ? (
                  <>
                    <X className="h-3 w-3" />
                    Clear
                  </>
                ) : (
                  'Enable'
                )}
              </Button>
            </div>

            {loopConfig?.enabled && totalMeasures > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Measures {loopConfig.startMeasure} - {loopConfig.endMeasure}</span>
                  <span>{loopCount} loops</span>
                </div>
                
                <Slider
                  value={[loopConfig.startMeasure, loopConfig.endMeasure]}
                  onValueChange={handleLoopRangeChange}
                  min={1}
                  max={totalMeasures}
                  step={1}
                  disabled={disabled}
                  aria-label="Loop range"
                />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span>{totalMeasures}</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Gradual Increase */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <label className="text-sm font-medium">Gradual Increase</label>
              </div>
              <Button
                variant={autoIncrease ? 'default' : 'outline'}
                size="sm"
                onClick={handleAutoIncreaseToggle}
                disabled={disabled || !loopConfig?.enabled}
                aria-label={autoIncrease ? 'Disable auto increase' : 'Enable auto increase'}
              >
                {autoIncrease ? 'On' : 'Off'}
              </Button>
            </div>

            {autoIncrease && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Increase per loop</span>
                  <span>{increaseAmount}%</span>
                </div>
                <Slider
                  value={[increaseAmount]}
                  onValueChange={(values) => setIncreaseAmount(values[0])}
                  min={1}
                  max={10}
                  step={1}
                  disabled={disabled}
                  aria-label="Increase amount per loop"
                />
                <p className="text-xs text-muted-foreground">
                  Target: 100% ({baseTempo} BPM)
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Play Controls */}
          <div className="flex gap-2">
            {isPlaying ? (
              <Button
                variant="secondary"
                className="flex-1 gap-2"
                onClick={onStop}
                disabled={disabled}
                aria-label="Stop playback"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button
                variant="default"
                className="flex-1 gap-2"
                onClick={onPlay}
                disabled={disabled}
                aria-label="Play with slow practice settings"
              >
                <Play className="h-4 w-4" />
                Play at {tempoPercent}%
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
