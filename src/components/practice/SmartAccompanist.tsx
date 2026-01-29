'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Square,
  Mic,
  MicOff,
  Music2,
  Timer,
  Gauge,
  Settings2,
  Volume2,
  Radio,
} from 'lucide-react';
import {
  ScoreFollower,
  getScoreFollower,
  disposeScoreFollower,
  ScorePosition,
  ScoreNote,
  createScoreFromNotes,
  AccompanimentOptions,
} from '@/lib/ai/score-follower-agent';

interface SmartAccompanistProps {
  soloNotes?: ScoreNote[];
  accompanimentNotes?: ScoreNote[];
  onPositionChange?: (position: ScorePosition) => void;
}

// Demo scores for testing
const DEMO_SCORES = {
  twinkle: createScoreFromNotes(
    // Twinkle Twinkle solo line
    ['A4:1', 'A4:1', 'E5:1', 'E5:1', 'F#5:1', 'F#5:1', 'E5:2',
     'D5:1', 'D5:1', 'C#5:1', 'C#5:1', 'B4:1', 'B4:1', 'A4:2'],
    // Simple accompaniment
    ['A3:2', 'E3:2', 'D3:2', 'A3:2', 'D3:2', 'E3:2', 'A3:2']
  ),
  scale: createScoreFromNotes(
    // A major scale
    ['A4:1', 'B4:1', 'C#5:1', 'D5:1', 'E5:1', 'F#5:1', 'G#5:1', 'A5:1',
     'A5:1', 'G#5:1', 'F#5:1', 'E5:1', 'D5:1', 'C#5:1', 'B4:1', 'A4:1'],
    // Drone accompaniment
    ['A2:4', 'E3:4', 'A2:4', 'E3:4']
  ),
};

export const SmartAccompanist = ({
  soloNotes,
  accompanimentNotes,
  onPositionChange,
}: SmartAccompanistProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState<ScorePosition>({
    beat: 0,
    measure: 1,
    confidence: 0,
    tempo: 120,
  });
  const [detectedNote, setDetectedNote] = useState<string>('');
  const [options, setOptions] = useState<AccompanimentOptions>({
    mode: 'follow',
    baseTempo: 120,
    instrument: 'piano',
    volume: 0.7,
    countIn: true,
  });
  const [selectedDemo, setSelectedDemo] = useState<keyof typeof DEMO_SCORES | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const scoreFollowerRef = useRef<ScoreFollower | null>(null);

  useEffect(() => {
    setIsMounted(true);
    
    return () => {
      if (scoreFollowerRef.current) {
        scoreFollowerRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    scoreFollowerRef.current = getScoreFollower();
    scoreFollowerRef.current.setOptions(options);
    
    // Load provided score or demo
    if (soloNotes && accompanimentNotes) {
      scoreFollowerRef.current.loadScore(soloNotes, accompanimentNotes);
    }
    
    scoreFollowerRef.current.setCallbacks({
      onPositionUpdate: (pos) => {
        setPosition(pos);
        onPositionChange?.(pos);
      },
      onPitchDetected: (frequency, note) => {
        setDetectedNote(note);
      },
    });
    
    return () => {
      disposeScoreFollower();
    };
  }, [isMounted]);

  const handleLoadDemo = (demo: keyof typeof DEMO_SCORES) => {
    if (!scoreFollowerRef.current) return;
    
    const { solo, accompaniment } = DEMO_SCORES[demo];
    scoreFollowerRef.current.loadScore(solo, accompaniment);
    setSelectedDemo(demo);
  };

  const handleStartListening = async () => {
    if (!scoreFollowerRef.current) return;
    
    try {
      await scoreFollowerRef.current.startListening();
      setIsListening(true);
    } catch (error) {
      console.error('Failed to start listening:', error);
    }
  };

  const handleStopListening = () => {
    if (!scoreFollowerRef.current) return;
    
    scoreFollowerRef.current.stopListening();
    setIsListening(false);
  };

  const handlePlayStrict = async () => {
    if (!scoreFollowerRef.current) return;
    
    try {
      setIsPlaying(true);
      await scoreFollowerRef.current.playStrict();
    } catch (error) {
      console.error('Failed to play:', error);
    }
  };

  const handleStop = () => {
    if (!scoreFollowerRef.current) return;
    
    scoreFollowerRef.current.stop();
    setIsListening(false);
    setIsPlaying(false);
  };

  const handleReset = () => {
    if (!scoreFollowerRef.current) return;
    
    scoreFollowerRef.current.reset();
    setPosition({ beat: 0, measure: 1, confidence: 0, tempo: options.baseTempo });
  };

  const handleModeChange = (mode: AccompanimentOptions['mode']) => {
    setOptions(prev => ({ ...prev, mode }));
    scoreFollowerRef.current?.setOptions({ mode });
  };

  const handleTempoChange = (tempo: number) => {
    setOptions(prev => ({ ...prev, baseTempo: tempo }));
    scoreFollowerRef.current?.setOptions({ baseTempo: tempo });
  };

  const handleVolumeChange = (volume: number) => {
    setOptions(prev => ({ ...prev, volume }));
    scoreFollowerRef.current?.setOptions({ volume });
  };

  if (!isMounted) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading accompanist...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Controls */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Music2 className="h-5 w-5" />
              Smart Accompanist
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Display */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Measure</p>
              <p className="text-xl font-bold">{position.measure}</p>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Beat</p>
              <p className="text-xl font-bold">{Math.floor(position.beat % 4) + 1}</p>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Tempo</p>
              <p className="text-xl font-bold">{Math.round(position.tempo)}</p>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Confidence</p>
              <p className="text-xl font-bold">{Math.round(position.confidence * 100)}%</p>
            </div>
          </div>

          {/* Detected Note */}
          {isListening && detectedNote && (
            <div className="text-center p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Detected</p>
              <p className="text-3xl font-bold text-primary">{detectedNote}</p>
            </div>
          )}

          {/* Mode Selection */}
          <div className="flex gap-2">
            {(['strict', 'follow', 'conductor'] as const).map((mode) => (
              <Button
                key={mode}
                variant={options.mode === mode ? 'default' : 'outline'}
                size="sm"
                className="flex-1 capitalize"
                onClick={() => handleModeChange(mode)}
              >
                {mode === 'strict' && <Timer className="h-4 w-4 mr-1" />}
                {mode === 'follow' && <Radio className="h-4 w-4 mr-1" />}
                {mode === 'conductor' && <Gauge className="h-4 w-4 mr-1" />}
                {mode}
              </Button>
            ))}
          </div>

          {/* Main Controls */}
          <div className="flex gap-2">
            {options.mode === 'strict' ? (
              <Button
                onClick={isPlaying ? handleStop : handlePlayStrict}
                className="flex-1"
                variant={isPlaying ? 'destructive' : 'default'}
              >
                {isPlaying ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={isListening ? handleStopListening : handleStartListening}
                className="flex-1"
                variant={isListening ? 'destructive' : 'default'}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Start Listening
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tempo */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Base Tempo</label>
                <span className="text-sm text-muted-foreground">{options.baseTempo} BPM</span>
              </div>
              <Slider
                value={[options.baseTempo]}
                onValueChange={([value]) => handleTempoChange(value)}
                min={40}
                max={200}
                step={1}
              />
            </div>

            {/* Volume */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Volume2 className="h-4 w-4" />
                  Volume
                </label>
                <span className="text-sm text-muted-foreground">{Math.round(options.volume * 100)}%</span>
              </div>
              <Slider
                value={[options.volume]}
                onValueChange={([value]) => handleVolumeChange(value)}
                min={0}
                max={1}
                step={0.1}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Selection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Demo Pieces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {Object.keys(DEMO_SCORES).map((demo) => (
              <Button
                key={demo}
                variant={selectedDemo === demo ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLoadDemo(demo as keyof typeof DEMO_SCORES)}
                className="capitalize"
              >
                {demo}
              </Button>
            ))}
          </div>
          {selectedDemo && (
            <p className="text-sm text-muted-foreground mt-2">
              Loaded: {selectedDemo} - {DEMO_SCORES[selectedDemo].solo.length} notes
            </p>
          )}
        </CardContent>
      </Card>

      {/* Mode Descriptions */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">Strict</Badge>
              <p className="text-muted-foreground">Plays accompaniment at fixed tempo. Practice with consistent timing.</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">Follow</Badge>
              <p className="text-muted-foreground">Listens to your playing and follows your tempo in real-time.</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">Conductor</Badge>
              <p className="text-muted-foreground">You lead with tempo changes, accompaniment follows with slight delay.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartAccompanist;
