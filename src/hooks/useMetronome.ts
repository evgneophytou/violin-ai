'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  getMetronome, 
  disposeMetronome, 
  TapTempo,
  type Subdivision,
  type TimeSignature,
  type MetronomeConfig
} from '@/lib/audio/metronome';

interface UseMetronomeReturn {
  isPlaying: boolean;
  currentBeat: number;
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  volume: number;
  accentFirst: boolean;
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => Promise<void>;
  setBPM: (bpm: number) => void;
  setTimeSignature: (ts: TimeSignature) => void;
  setSubdivision: (sub: Subdivision) => void;
  setVolume: (vol: number) => void;
  setAccentFirst: (accent: boolean) => void;
  tapTempo: () => void;
  incrementBPM: (amount?: number) => void;
  decrementBPM: (amount?: number) => void;
}

export const useMetronome = (): UseMetronomeReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [config, setConfig] = useState<MetronomeConfig>({
    bpm: 120,
    timeSignature: '4/4',
    subdivision: 'quarter',
    accentFirst: true,
    volume: 0.8,
  });
  
  const tapTempoRef = useRef<TapTempo>(new TapTempo());

  useEffect(() => {
    const metronome = getMetronome();
    
    metronome.setOnBeatCallback((beat, _isAccent) => {
      setCurrentBeat(beat);
    });

    return () => {
      disposeMetronome();
    };
  }, []);

  const start = useCallback(async () => {
    const metronome = getMetronome();
    await metronome.start();
    setIsPlaying(true);
  }, []);

  const stop = useCallback(() => {
    const metronome = getMetronome();
    metronome.stop();
    setIsPlaying(false);
    setCurrentBeat(0);
  }, []);

  const toggle = useCallback(async () => {
    if (isPlaying) {
      stop();
    } else {
      await start();
    }
  }, [isPlaying, start, stop]);

  const setBPM = useCallback((bpm: number) => {
    const metronome = getMetronome();
    metronome.setBPM(bpm);
    setConfig(prev => ({ ...prev, bpm }));
  }, []);

  const setTimeSignature = useCallback((timeSignature: TimeSignature) => {
    const metronome = getMetronome();
    metronome.setTimeSignature(timeSignature);
    setConfig(prev => ({ ...prev, timeSignature }));
    setCurrentBeat(0);
  }, []);

  const setSubdivision = useCallback((subdivision: Subdivision) => {
    const metronome = getMetronome();
    metronome.setSubdivision(subdivision);
    setConfig(prev => ({ ...prev, subdivision }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const metronome = getMetronome();
    metronome.setVolume(volume);
    setConfig(prev => ({ ...prev, volume }));
  }, []);

  const setAccentFirst = useCallback((accentFirst: boolean) => {
    const metronome = getMetronome();
    metronome.setAccentFirst(accentFirst);
    setConfig(prev => ({ ...prev, accentFirst }));
  }, []);

  const tapTempo = useCallback(() => {
    const bpm = tapTempoRef.current.tap();
    if (bpm !== null) {
      setBPM(bpm);
    }
  }, [setBPM]);

  const incrementBPM = useCallback((amount: number = 1) => {
    setBPM(config.bpm + amount);
  }, [config.bpm, setBPM]);

  const decrementBPM = useCallback((amount: number = 1) => {
    setBPM(config.bpm - amount);
  }, [config.bpm, setBPM]);

  return {
    isPlaying,
    currentBeat,
    bpm: config.bpm,
    timeSignature: config.timeSignature,
    subdivision: config.subdivision,
    volume: config.volume,
    accentFirst: config.accentFirst,
    start,
    stop,
    toggle,
    setBPM,
    setTimeSignature,
    setSubdivision,
    setVolume,
    setAccentFirst,
    tapTempo,
    incrementBPM,
    decrementBPM,
  };
};
