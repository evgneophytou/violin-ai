'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Piano,
  Play,
  Square,
  Volume2,
  RefreshCw,
  Music2,
} from 'lucide-react';
import {
  generateAccompaniment,
  STYLE_DESCRIPTIONS,
  type AccompanimentStyle,
  type GeneratedAccompaniment,
  type ChordEvent,
} from '@/lib/ai/accompaniment-agent';
import type { Note, Exercise } from '@/types';

interface AccompanimentPlayerProps {
  exercise: Exercise | null;
  className?: string;
}

export const AccompanimentPlayer = ({ exercise, className }: AccompanimentPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [style, setStyle] = useState<AccompanimentStyle>('classical');
  const [volume, setVolume] = useState(70);
  const [accompaniment, setAccompaniment] = useState<GeneratedAccompaniment | null>(null);
  const [currentChordIndex, setCurrentChordIndex] = useState(-1);

  const synthRef = useRef<Tone.PolySynth | null>(null);
  const scheduledEventsRef = useRef<number[]>([]);

  // Initialize synth
  useEffect(() => {
    const initSynth = async () => {
      await Tone.start();
      
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: 'triangle',
        },
        envelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.3,
          release: 0.5,
        },
      }).toDestination();
    };

    initSynth();

    return () => {
      if (synthRef.current) {
        synthRef.current.dispose();
      }
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.volume.value = Tone.gainToDb(volume / 100);
    }
  }, [volume]);

  // Generate accompaniment when exercise or style changes
  useEffect(() => {
    if (exercise) {
      setIsGenerating(true);
      // Small timeout to allow UI to update and show loading state
      const timeoutId = setTimeout(() => {
        const newAccompaniment = generateAccompaniment({
          melody: exercise.notes,
          key: exercise.metadata.key,
          style,
          tempo: exercise.metadata.tempo,
        });
        setAccompaniment(newAccompaniment);
        setIsGenerating(false);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [exercise, style]);

  const handlePlay = useCallback(async () => {
    if (!accompaniment || !synthRef.current) return;

    await Tone.start();
    
    setIsPlaying(true);
    setCurrentChordIndex(0);

    const tempo = accompaniment.tempo;
    const beatDuration = 60 / tempo;
    const now = Tone.now();

    // Schedule all chords
    accompaniment.chords.forEach((chord, index) => {
      const startTime = now + (chord.time * beatDuration);
      const duration = chord.duration * beatDuration;

      const eventId = Tone.Transport.scheduleOnce(() => {
        if (synthRef.current) {
          setCurrentChordIndex(index);
          synthRef.current.triggerAttackRelease(
            chord.notes,
            duration * 0.9, // Slight gap between chords
            undefined,
            chord.velocity / 127
          );
        }
      }, startTime);

      scheduledEventsRef.current.push(eventId);
    });

    // Schedule end
    const lastChord = accompaniment.chords[accompaniment.chords.length - 1];
    const endTime = now + ((lastChord.time + lastChord.duration) * beatDuration);
    
    const endEventId = Tone.Transport.scheduleOnce(() => {
      setIsPlaying(false);
      setCurrentChordIndex(-1);
    }, endTime);
    
    scheduledEventsRef.current.push(endEventId);

    Tone.Transport.start();
  }, [accompaniment]);

  const handleStop = useCallback(() => {
    // Clear scheduled events
    scheduledEventsRef.current.forEach((eventId) => {
      Tone.Transport.clear(eventId);
    });
    scheduledEventsRef.current = [];

    Tone.Transport.stop();
    Tone.Transport.cancel();

    if (synthRef.current) {
      synthRef.current.releaseAll();
    }

    setIsPlaying(false);
    setCurrentChordIndex(-1);
  }, []);

  const handleRegenerate = useCallback(() => {
    if (exercise) {
      setIsGenerating(true);
      setTimeout(() => {
        const newAccompaniment = generateAccompaniment({
          melody: exercise.notes,
          key: exercise.metadata.key,
          style,
          tempo: exercise.metadata.tempo,
        });
        setAccompaniment(newAccompaniment);
        setIsGenerating(false);
      }, 300);
    }
  }, [exercise, style]);

  const styles: AccompanimentStyle[] = ['classical', 'jazz', 'pop', 'minimal'];

  return (
    <Card className={className}>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Piano className="h-5 w-5" />
            <span>Accompaniment</span>
          </div>
          {accompaniment && (
            <Badge variant="outline">{accompaniment.key}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!exercise ? (
          <div className="text-center py-8 text-muted-foreground">
            <Music2 className="h-12 w-12 mx-auto mb-4" />
            <p>Generate an exercise to create accompaniment</p>
          </div>
        ) : (
          <>
            {/* Style Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Style</label>
              <div className="grid grid-cols-2 gap-2">
                {styles.map((s) => (
                  <Button
                    key={s}
                    variant={style === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStyle(s)}
                    disabled={isPlaying}
                    className="justify-start"
                  >
                    <span className="truncate">{STYLE_DESCRIPTIONS[s].name}</span>
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {STYLE_DESCRIPTIONS[style].description}
              </p>
            </div>

            <Separator />

            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Volume
                </label>
                <span className="text-sm text-muted-foreground">{volume}%</span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={(v) => setVolume(v[0])}
                min={0}
                max={100}
                step={5}
              />
            </div>

            <Separator />

            {/* Chord Display */}
            {accompaniment && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Chord Progression</label>
                <div className="flex flex-wrap gap-2">
                  {accompaniment.chords.slice(0, 8).map((chord, i) => (
                    <Badge
                      key={i}
                      variant={currentChordIndex === i ? 'default' : 'outline'}
                      className={`transition-all ${
                        currentChordIndex === i ? 'scale-110' : ''
                      }`}
                    >
                      {chord.chord}
                    </Badge>
                  ))}
                  {accompaniment.chords.length > 8 && (
                    <Badge variant="outline">+{accompaniment.chords.length - 8}</Badge>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={isPlaying || isGenerating}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : accompaniment ? 'Regenerate' : 'Generate'}
              </Button>
              {isPlaying ? (
                <Button
                  variant="secondary"
                  onClick={handleStop}
                  className="flex-1 gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={handlePlay}
                  disabled={!accompaniment || isGenerating}
                  className="flex-1 gap-2"
                >
                  <Play className="h-4 w-4" />
                  Play
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
