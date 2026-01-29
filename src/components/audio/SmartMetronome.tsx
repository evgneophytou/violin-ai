'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  Minus, 
  Plus,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useMetronome } from '@/hooks/useMetronome';
import type { Subdivision, TimeSignature } from '@/lib/audio/metronome';

interface SmartMetronomeProps {
  compact?: boolean;
  onBPMChange?: (bpm: number) => void;
}

export const SmartMetronome = ({ compact = false, onBPMChange }: SmartMetronomeProps) => {
  const metronome = useMetronome();
  
  const handleBPMChange = (bpm: number) => {
    metronome.setBPM(bpm);
    onBPMChange?.(bpm);
  };

  const timeSignatures: TimeSignature[] = ['4/4', '3/4', '2/4', '6/8'];
  const subdivisions: { value: Subdivision; label: string }[] = [
    { value: 'quarter', label: '♩' },
    { value: 'eighth', label: '♪♪' },
    { value: 'triplet', label: '♪♪♪' },
    { value: 'sixteenth', label: '♬♬' },
  ];

  const beatsPerMeasure = parseInt(metronome.timeSignature.split('/')[0]);

  if (compact) {
    return (
      <Card className="p-3">
        <div className="flex items-center gap-4">
          {/* Play/Pause */}
          <Button
            variant={metronome.isPlaying ? 'destructive' : 'default'}
            size="icon"
            onClick={metronome.toggle}
          >
            {metronome.isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          {/* BPM Display */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleBPMChange(metronome.bpm - 5)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <div className="w-16 text-center">
              <span className="text-xl font-bold">{metronome.bpm}</span>
              <span className="text-xs text-muted-foreground ml-1">BPM</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleBPMChange(metronome.bpm + 5)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Beat Indicator */}
          <div className="flex gap-1">
            {Array.from({ length: beatsPerMeasure }).map((_, i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-full transition-all ${
                  metronome.isPlaying && metronome.currentBeat === i
                    ? i === 0
                      ? 'bg-primary scale-125'
                      : 'bg-primary/70 scale-110'
                    : 'bg-secondary'
                }`}
              />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Metronome</span>
          <Badge variant={metronome.isPlaying ? 'default' : 'secondary'}>
            {metronome.isPlaying ? 'Playing' : 'Stopped'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* BPM Display and Controls */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleBPMChange(metronome.bpm - 10)}
              disabled={metronome.bpm <= 20}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleBPMChange(metronome.bpm - 1)}
              disabled={metronome.bpm <= 20}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <div className="w-24">
              <span className="text-4xl font-bold">{metronome.bpm}</span>
              <p className="text-sm text-muted-foreground">BPM</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleBPMChange(metronome.bpm + 1)}
              disabled={metronome.bpm >= 300}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleBPMChange(metronome.bpm + 10)}
              disabled={metronome.bpm >= 300}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* BPM Slider */}
          <Slider
            value={[metronome.bpm]}
            onValueChange={([value]) => handleBPMChange(value)}
            min={20}
            max={300}
            step={1}
            className="w-full"
          />
          
          {/* Tempo Markings */}
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>Largo (40)</span>
            <span>Andante (80)</span>
            <span>Allegro (120)</span>
            <span>Presto (180)</span>
          </div>
        </div>

        {/* Beat Visualization */}
        <div className="flex justify-center gap-3 py-4">
          {Array.from({ length: beatsPerMeasure }).map((_, i) => (
            <div
              key={i}
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-100 ${
                metronome.isPlaying && metronome.currentBeat === i
                  ? i === 0
                    ? 'bg-primary text-primary-foreground scale-125 shadow-lg'
                    : 'bg-primary/70 text-primary-foreground scale-110'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Play/Pause Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            variant={metronome.isPlaying ? 'destructive' : 'default'}
            onClick={metronome.toggle}
            className="w-32 gap-2"
          >
            {metronome.isPlaying ? (
              <>
                <Pause className="h-5 w-5" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Start
              </>
            )}
          </Button>
        </div>

        {/* Tap Tempo */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={metronome.tapTempo}
            className="w-32"
          >
            Tap Tempo
          </Button>
        </div>

        {/* Time Signature */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Time Signature</label>
          <Tabs
            value={metronome.timeSignature}
            onValueChange={(v) => metronome.setTimeSignature(v as TimeSignature)}
          >
            <TabsList className="grid grid-cols-4 w-full">
              {timeSignatures.map((ts) => (
                <TabsTrigger key={ts} value={ts}>
                  {ts}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Subdivision */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Subdivision</label>
          <Tabs
            value={metronome.subdivision}
            onValueChange={(v) => metronome.setSubdivision(v as Subdivision)}
          >
            <TabsList className="grid grid-cols-4 w-full">
              {subdivisions.map((sub) => (
                <TabsTrigger key={sub.value} value={sub.value}>
                  {sub.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              {metronome.volume > 0 ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              Volume
            </label>
            <span className="text-sm text-muted-foreground">
              {Math.round(metronome.volume * 100)}%
            </span>
          </div>
          <Slider
            value={[metronome.volume]}
            onValueChange={([value]) => metronome.setVolume(value)}
            min={0}
            max={1}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Accent Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Accent First Beat</label>
          <Button
            variant={metronome.accentFirst ? 'default' : 'outline'}
            size="sm"
            onClick={() => metronome.setAccentFirst(!metronome.accentFirst)}
          >
            {metronome.accentFirst ? 'On' : 'Off'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
