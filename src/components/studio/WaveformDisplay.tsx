'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface WaveformDisplayProps {
  audioUrl: string | null;
  duration: number;
  isCompact?: boolean;
  showControls?: boolean;
  onTimeUpdate?: (time: number) => void;
}

export const WaveformDisplay = ({
  audioUrl,
  duration,
  isCompact = false,
  showControls = true,
  onTimeUpdate,
}: WaveformDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Analyze audio and generate waveform data
  const analyzeAudio = useCallback(async (url: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Get the audio data from the first channel
      const rawData = audioBuffer.getChannelData(0);
      
      // Number of samples to show (bars in the waveform)
      const samples = isCompact ? 50 : 100;
      const blockSize = Math.floor(rawData.length / samples);
      const filteredData: number[] = [];
      
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[i * blockSize + j]);
        }
        filteredData.push(sum / blockSize);
      }
      
      // Normalize the data
      const maxVal = Math.max(...filteredData);
      const normalizedData = filteredData.map((val) => val / maxVal);
      
      setWaveformData(normalizedData);
      audioContext.close();
    } catch (error) {
      console.error('Error analyzing audio:', error);
      // Generate placeholder waveform
      setWaveformData(Array(isCompact ? 50 : 100).fill(0).map(() => Math.random() * 0.5 + 0.25));
    } finally {
      setIsLoading(false);
    }
  }, [isCompact]);

  // Draw waveform on canvas
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    // Set canvas size accounting for device pixel ratio
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / waveformData.length;
    const barGap = 2;
    const progressPercent = duration > 0 ? currentTime / duration : 0;

    waveformData.forEach((value, index) => {
      const barHeight = value * (height - 8);
      const x = index * barWidth;
      const y = (height - barHeight) / 2;
      
      // Determine if this bar is before or after the playhead
      const barProgress = index / waveformData.length;
      const isPlayed = barProgress <= progressPercent;
      
      ctx.fillStyle = isPlayed 
        ? 'hsl(var(--primary))' 
        : 'hsl(var(--muted-foreground) / 0.3)';
      
      ctx.beginPath();
      ctx.roundRect(x + barGap / 2, y, barWidth - barGap, barHeight, 2);
      ctx.fill();
    });

    // Draw playhead
    if (duration > 0) {
      const playheadX = progressPercent * width;
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [waveformData, currentTime, duration]);

  // Load audio and analyze when URL changes
  useEffect(() => {
    if (audioUrl) {
      analyzeAudio(audioUrl);
      
      // Create audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
        onTimeUpdate?.(audio.currentTime);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
      
      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, [audioUrl, analyzeAudio, onTimeUpdate]);

  // Draw waveform when data changes
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Animation loop for smooth updates
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        drawWaveform();
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, drawWaveform]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleReset = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.pause();
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const handleSeek = useCallback((values: number[]) => {
    if (!audioRef.current || !duration) return;
    const newTime = (values[0] / 100) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      {/* Waveform Canvas */}
      <div 
        className={`relative bg-muted/30 rounded-lg overflow-hidden ${
          isCompact ? 'h-12' : 'h-24'
        }`}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <canvas 
            ref={canvasRef} 
            className="w-full h-full cursor-pointer"
            onClick={(e) => {
              if (!audioRef.current || !duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percent = x / rect.width;
              const newTime = percent * duration;
              audioRef.current.currentTime = newTime;
              setCurrentTime(newTime);
            }}
            role="slider"
            aria-label="Audio waveform"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            tabIndex={0}
            onKeyDown={(e) => {
              if (!audioRef.current || !duration) return;
              if (e.key === 'ArrowLeft') {
                const newTime = Math.max(0, currentTime - 5);
                audioRef.current.currentTime = newTime;
                setCurrentTime(newTime);
              } else if (e.key === 'ArrowRight') {
                const newTime = Math.min(duration, currentTime + 5);
                audioRef.current.currentTime = newTime;
                setCurrentTime(newTime);
              } else if (e.key === ' ') {
                e.preventDefault();
                handlePlayPause();
              }
            }}
          />
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePlayPause}
            disabled={!audioUrl}
            className="h-8 w-8"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            disabled={!audioUrl}
            className="h-8 w-8"
            aria-label="Reset to start"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <div className="flex-1">
            <Slider
              value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              disabled={!audioUrl}
              aria-label="Seek"
            />
          </div>

          <span className="text-xs text-muted-foreground min-w-[60px] text-right font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
};
