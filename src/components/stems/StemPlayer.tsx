'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  SplitSquareVertical,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
  Music,
  Piano,
  Download,
  RotateCcw,
} from 'lucide-react';

interface Stem {
  name: string;
  audioUrl: string;
  volume: number;
  muted: boolean;
  icon: React.ReactNode;
}

interface StemPlayerProps {
  className?: string;
}

export const StemPlayer = ({ className }: StemPlayerProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stems, setStems] = useState<Stem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync audio elements
  useEffect(() => {
    if (stems.length === 0) return;

    const handleTimeUpdate = () => {
      if (audioRefs.current[0]) {
        setCurrentTime(audioRefs.current[0].currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (audioRefs.current[0]) {
        setDuration(audioRefs.current[0].duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audioRefs.current.forEach((audio) => {
        if (audio) audio.currentTime = 0;
      });
    };

    audioRefs.current.forEach((audio, i) => {
      if (audio) {
        if (i === 0) {
          audio.addEventListener('timeupdate', handleTimeUpdate);
          audio.addEventListener('loadedmetadata', handleLoadedMetadata);
          audio.addEventListener('ended', handleEnded);
        }
      }
    });

    return () => {
      audioRefs.current.forEach((audio, i) => {
        if (audio && i === 0) {
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('ended', handleEnded);
        }
      });
    };
  }, [stems]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/stem-separation', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Failed to process audio');
      }

      const result = await response.json();
      setProgress(100);

      if (result.status === 'failed') {
        throw new Error(result.message || 'Stem separation failed');
      }

      // Create stems
      const newStems: Stem[] = [
        {
          name: 'Violin',
          audioUrl: result.violin,
          volume: 100,
          muted: false,
          icon: <Music className="h-4 w-4" />,
        },
        {
          name: 'Accompaniment',
          audioUrl: result.accompaniment,
          volume: 100,
          muted: false,
          icon: <Piano className="h-4 w-4" />,
        },
      ];

      if (result.other) {
        newStems.push({
          name: 'Other',
          audioUrl: result.other,
          volume: 100,
          muted: false,
          icon: <SplitSquareVertical className="h-4 w-4" />,
        });
      }

      setStems(newStems);
      
      // Show message if in demo mode
      if (result.message) {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      audioRefs.current.forEach((audio) => audio?.pause());
    } else {
      // Sync all audio elements to the same time
      const time = audioRefs.current[0]?.currentTime || 0;
      audioRefs.current.forEach((audio) => {
        if (audio) {
          audio.currentTime = time;
          audio.play();
        }
      });
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    const time = (value[0] / 100) * duration;
    audioRefs.current.forEach((audio) => {
      if (audio) audio.currentTime = time;
    });
    setCurrentTime(time);
  }, [duration]);

  const handleVolumeChange = useCallback((index: number, value: number[]) => {
    setStems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], volume: value[0] };
      return updated;
    });

    if (audioRefs.current[index]) {
      audioRefs.current[index].volume = value[0] / 100;
    }
  }, []);

  const handleToggleMute = useCallback((index: number) => {
    setStems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], muted: !updated[index].muted };
      return updated;
    });

    if (audioRefs.current[index]) {
      audioRefs.current[index].muted = !audioRefs.current[index].muted;
    }
  }, []);

  const handleDownload = useCallback((stem: Stem) => {
    const a = document.createElement('a');
    a.href = stem.audioUrl;
    a.download = `${stem.name.toLowerCase()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleReset = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    });
    audioRefs.current = [];
    setStems([]);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={className}>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SplitSquareVertical className="h-5 w-5" />
            <span>Stem Separation</span>
          </div>
          {stems.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stems.length === 0 ? (
          <>
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isProcessing ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              {isProcessing ? (
                <div className="space-y-4">
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                  <p className="text-sm font-medium">Processing audio...</p>
                  <Progress value={progress} className="w-full max-w-xs mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    Separating stems with AI
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-2">
                    Upload audio to separate stems
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supports MP3, WAV, WebM
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Choose File
                  </Button>
                </>
              )}
            </div>

            {error && (
              <p className="text-sm text-center text-amber-500">{error}</p>
            )}
          </>
        ) : (
          <>
            {/* Hidden audio elements */}
            {stems.map((stem, i) => (
              <audio
                key={stem.name}
                ref={(el) => {
                  if (el) audioRefs.current[i] = el;
                }}
                src={stem.audioUrl}
                preload="metadata"
              />
            ))}

            {/* Playback Controls */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePlayPause}
                  className="h-10 w-10"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
                <div className="flex-1">
                  <Slider
                    value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                    onValueChange={handleSeek}
                    max={100}
                    step={0.1}
                  />
                </div>
                <span className="text-xs text-muted-foreground min-w-[80px] text-right font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>

            <Separator />

            {/* Stem Mixers */}
            <div className="space-y-4">
              {stems.map((stem, index) => (
                <div key={stem.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {stem.icon}
                      <span className="text-sm font-medium">{stem.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleMute(index)}
                        className="h-8 w-8"
                      >
                        {stem.muted ? (
                          <VolumeX className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(stem)}
                        className="h-8 w-8"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[stem.muted ? 0 : stem.volume]}
                      onValueChange={(v) => handleVolumeChange(index, v)}
                      max={100}
                      className="flex-1"
                      disabled={stem.muted}
                    />
                    <span className="text-xs text-muted-foreground w-8">
                      {stem.muted ? 0 : stem.volume}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-xs text-center text-amber-500">{error}</p>
            )}

            {/* Tips */}
            <div className="text-xs text-muted-foreground text-center">
              <p>Mute the violin stem to practice with backing track</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
