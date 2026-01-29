'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPlaybackService, disposePlaybackService } from '@/lib/audio/playback';
import type { Note, LoopConfig } from '@/types';

interface UsePlaybackReturn {
  isInitialized: boolean;
  isPlaying: boolean;
  currentNoteIndex: number;
  error: string | null;
  // Core playback
  initialize: () => Promise<void>;
  play: (notes: Note[], tempo?: number) => Promise<void>;
  stop: () => void;
  playNote: (pitch: string, duration?: number) => Promise<void>;
  dispose: () => void;
  // Slow practice mode
  tempoPercent: number;
  setTempoPercent: (percent: number) => void;
  effectiveTempo: number;
  loopConfig: LoopConfig | null;
  setLoop: (config: LoopConfig | null) => void;
  clearLoop: () => void;
  loopCount: number;
}

export const usePlayback = (): UsePlaybackReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  
  // Slow practice mode state
  const [tempoPercent, setTempoPercentState] = useState(100);
  const [effectiveTempo, setEffectiveTempo] = useState(120);
  const [loopConfig, setLoopConfigState] = useState<LoopConfig | null>(null);
  const [loopCount, setLoopCount] = useState(0);
  
  const playbackServiceRef = useRef<ReturnType<typeof getPlaybackService> | null>(null);

  const initialize = useCallback(async () => {
    try {
      setError(null);
      const service = getPlaybackService();
      playbackServiceRef.current = service;
      
      await service.initialize();
      
      service.setOnNotePlay((index) => {
        setCurrentNoteIndex(index);
      });
      
      service.setOnPlaybackComplete(() => {
        setIsPlaying(false);
        setCurrentNoteIndex(-1);
      });
      
      service.setOnLoopComplete(() => {
        setLoopCount(service.getLoopCount());
      });
      
      setIsInitialized(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize playback';
      setError(message);
      setIsInitialized(false);
    }
  }, []);

  const play = useCallback(async (notes: Note[], tempo: number = 120) => {
    if (!playbackServiceRef.current) {
      await initialize();
    }
    
    if (!playbackServiceRef.current) {
      setError('Playback service not available');
      return;
    }
    
    // Ensure callbacks are set up (they may have been lost on re-render)
    playbackServiceRef.current.setOnNotePlay((index) => {
      setCurrentNoteIndex(index);
    });
    
    playbackServiceRef.current.setOnPlaybackComplete(() => {
      setIsPlaying(false);
      setCurrentNoteIndex(-1);
    });
    
    try {
      setError(null);
      setIsPlaying(true);
      setLoopCount(0);
      setCurrentNoteIndex(loopConfig?.enabled ? loopConfig.startNoteIndex : 0);
      setEffectiveTempo(playbackServiceRef.current.getEffectiveTempo());
      await playbackServiceRef.current.playNotes(notes, tempo);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to play notes';
      setError(message);
      setIsPlaying(false);
      setCurrentNoteIndex(-1);
    }
  }, [initialize, loopConfig]);

  const stop = useCallback(() => {
    if (playbackServiceRef.current) {
      playbackServiceRef.current.stop();
    }
    setIsPlaying(false);
    setCurrentNoteIndex(-1);
  }, []);

  const playNote = useCallback(async (pitch: string, duration: number = 0.5) => {
    if (!playbackServiceRef.current) {
      await initialize();
    }
    
    if (playbackServiceRef.current) {
      await playbackServiceRef.current.playNote(pitch, duration);
    }
  }, [initialize]);

  const dispose = useCallback(() => {
    disposePlaybackService();
    playbackServiceRef.current = null;
    setIsInitialized(false);
    setIsPlaying(false);
    setCurrentNoteIndex(-1);
    setTempoPercentState(100);
    setLoopConfigState(null);
    setLoopCount(0);
  }, []);

  // Slow practice mode methods
  const setTempoPercent = useCallback((percent: number) => {
    const clampedPercent = Math.max(25, Math.min(100, percent));
    setTempoPercentState(clampedPercent);
    if (playbackServiceRef.current) {
      playbackServiceRef.current.setTempoPercent(clampedPercent);
      setEffectiveTempo(playbackServiceRef.current.getEffectiveTempo());
    }
  }, []);

  const setLoop = useCallback((config: LoopConfig | null) => {
    setLoopConfigState(config);
    setLoopCount(0);
    if (playbackServiceRef.current) {
      playbackServiceRef.current.setLoop(config);
    }
  }, []);

  const clearLoop = useCallback(() => {
    setLoopConfigState(null);
    setLoopCount(0);
    if (playbackServiceRef.current) {
      playbackServiceRef.current.clearLoop();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

  return {
    isInitialized,
    isPlaying,
    currentNoteIndex,
    error,
    // Core playback
    initialize,
    play,
    stop,
    playNote,
    dispose,
    // Slow practice mode
    tempoPercent,
    setTempoPercent,
    effectiveTempo,
    loopConfig,
    setLoop,
    clearLoop,
    loopCount,
  };
};
