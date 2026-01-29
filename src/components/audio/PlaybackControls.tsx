'use client';

import { Button } from '@/components/ui/button';
import { Play, Square, Mic, MicOff, RefreshCw, SkipForward } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  isRecording: boolean;
  isGenerating: boolean;
  isAnalyzing: boolean;
  hasExercise: boolean;
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  onStopRecording: () => void;
  onGenerate: () => void;
  onNext: () => void;
}

export const PlaybackControls = ({
  isPlaying,
  isRecording,
  isGenerating,
  isAnalyzing,
  hasExercise,
  onPlay,
  onStop,
  onRecord,
  onStopRecording,
  onGenerate,
  onNext,
}: PlaybackControlsProps) => {
  const isDisabled = isGenerating || isAnalyzing;

  return (
    <div className="flex items-center justify-center gap-3 p-4">
      {/* Generate/Regenerate button */}
      <Button
        variant="outline"
        size="lg"
        onClick={onGenerate}
        disabled={isDisabled || isPlaying || isRecording}
        className="gap-2"
        aria-label={hasExercise ? 'Regenerate exercise' : 'Generate exercise'}
      >
        <RefreshCw className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
        {isGenerating ? 'Generating...' : hasExercise ? 'New Exercise' : 'Generate'}
      </Button>

      {/* Play/Stop button */}
      {isPlaying ? (
        <Button
          variant="secondary"
          size="lg"
          onClick={onStop}
          disabled={isDisabled}
          className="gap-2"
          aria-label="Stop playback"
        >
          <Square className="h-5 w-5" />
          Stop
        </Button>
      ) : (
        <Button
          variant="default"
          size="lg"
          onClick={onPlay}
          disabled={isDisabled || !hasExercise || isRecording}
          className="gap-2"
          aria-label="Play exercise"
        >
          <Play className="h-5 w-5" />
          Play
        </Button>
      )}

      {/* Record/Stop Recording button */}
      {isRecording ? (
        <Button
          variant="destructive"
          size="lg"
          onClick={onStopRecording}
          disabled={isDisabled}
          className="gap-2 animate-pulse"
          aria-label="Stop recording"
        >
          <MicOff className="h-5 w-5" />
          Stop Recording
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="lg"
          onClick={onRecord}
          disabled={isDisabled || !hasExercise || isPlaying}
          className="gap-2"
          aria-label="Start recording"
        >
          <Mic className="h-5 w-5" />
          Record
        </Button>
      )}

      {/* Next Exercise button */}
      <Button
        variant="outline"
        size="lg"
        onClick={onNext}
        disabled={isDisabled || !hasExercise || isPlaying || isRecording}
        className="gap-2"
        aria-label="Next exercise"
      >
        <SkipForward className="h-5 w-5" />
        Next
      </Button>

      {/* Status indicator */}
      {isAnalyzing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Analyzing...
        </div>
      )}
    </div>
  );
};
