'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Target, Music, Timer, Zap } from 'lucide-react';
import type { ExerciseFocus } from '@/types';

interface DifficultySelectorProps {
  difficulty: number;
  focus: ExerciseFocus;
  onDifficultyChange: (value: number) => void;
  onFocusChange: (value: ExerciseFocus) => void;
  disabled?: boolean;
}

const DIFFICULTY_LABELS: Record<number, { label: string; description: string }> = {
  1: { label: 'Beginner', description: 'Open strings, simple rhythms' },
  2: { label: 'Elementary', description: 'First position basics' },
  3: { label: 'Elementary+', description: 'Simple slurs and dynamics' },
  4: { label: 'Intermediate', description: 'Shifting introduction' },
  5: { label: 'Intermediate+', description: 'Vibrato and positions 1-3' },
  6: { label: 'Advanced', description: 'Extended positions, spiccato' },
  7: { label: 'Advanced+', description: 'Double stops, harmonics' },
  8: { label: 'Pre-Professional', description: 'Concert-level techniques' },
  9: { label: 'Professional', description: 'Virtuosic passages' },
  10: { label: 'Master', description: 'Concert soloist level' },
};

const FOCUS_OPTIONS: Array<{ value: ExerciseFocus; label: string; icon: React.ReactNode }> = [
  { value: 'scales', label: 'Scales', icon: <Music className="h-3 w-3" /> },
  { value: 'arpeggios', label: 'Arpeggios', icon: <Zap className="h-3 w-3" /> },
  { value: 'bowing', label: 'Bowing', icon: <Target className="h-3 w-3" /> },
  { value: 'rhythm', label: 'Rhythm', icon: <Timer className="h-3 w-3" /> },
  { value: 'mixed', label: 'Mixed', icon: <BarChart3 className="h-3 w-3" /> },
];

export const DifficultySelector = ({
  difficulty,
  focus,
  onDifficultyChange,
  onFocusChange,
  disabled = false,
}: DifficultySelectorProps) => {
  const currentDifficulty = DIFFICULTY_LABELS[difficulty] || DIFFICULTY_LABELS[5];

  const handleSliderChange = (value: number[]) => {
    onDifficultyChange(value[0]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Exercise Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Difficulty Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Difficulty Level</label>
            <Badge variant="secondary" className="text-lg px-3">
              {difficulty}/10
            </Badge>
          </div>
          
          <Slider
            value={[difficulty]}
            onValueChange={handleSliderChange}
            min={1}
            max={10}
            step={1}
            disabled={disabled}
            className="w-full"
            aria-label="Difficulty level"
          />
          
          <div className="text-center">
            <p className="font-medium text-primary">{currentDifficulty.label}</p>
            <p className="text-sm text-muted-foreground">{currentDifficulty.description}</p>
          </div>
        </div>

        {/* Focus Area Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Focus Area</label>
          <Tabs 
            value={focus} 
            onValueChange={(v) => onFocusChange(v as ExerciseFocus)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-5 w-full">
              {FOCUS_OPTIONS.map((option) => (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  disabled={disabled}
                  className="text-xs gap-1"
                  aria-label={option.label}
                >
                  {option.icon}
                  <span className="hidden sm:inline">{option.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Difficulty indicators */}
        <div className="flex justify-between text-xs text-muted-foreground pt-2">
          <span>Easier</span>
          <span>Harder</span>
        </div>
      </CardContent>
    </Card>
  );
};
