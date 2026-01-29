'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAudioAnalyzer, disposeAudioAnalyzer } from '@/lib/audio/audio-analyzer';
import type { DetectedPitch } from '@/types';

interface UseAudioCaptureReturn {
  isInitialized: boolean;
  isRecording: boolean;
  currentPitch: DetectedPitch | null;
  recordedAudio: Blob | null;
  error: string | null;
  volume: number;
  initialize: () => Promise<void>;
  startRecording: () => void;
  stopRecording: () => void;
  startPitchDetection: () => void;
  stopPitchDetection: () => void;
  dispose: () => void;
}

export const useAudioCapture = (): UseAudioCaptureReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<DetectedPitch | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const initialize = useCallback(async () => {
    try {
      setError(null);
      const analyzer = getAudioAnalyzer();
      await analyzer.initialize();
      
      analyzer.setOnPitchDetected((pitch) => {
        setCurrentPitch(pitch);
      });
      
      analyzer.setOnRecordingComplete((blob) => {
        setRecordedAudio(blob);
        setIsRecording(false);
      });
      
      setIsInitialized(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize audio';
      setError(message);
      setIsInitialized(false);
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!isInitialized) {
      setError('Audio not initialized');
      return;
    }
    
    const analyzer = getAudioAnalyzer();
    analyzer.startRecording();
    analyzer.startPitchDetection();
    setIsRecording(true);
    setRecordedAudio(null);
    
    // Start volume monitoring
    volumeIntervalRef.current = setInterval(() => {
      setVolume(analyzer.getVolume());
    }, 50);
  }, [isInitialized]);

  const stopRecording = useCallback(() => {
    const analyzer = getAudioAnalyzer();
    analyzer.stopRecording();
    analyzer.stopPitchDetection();
    setIsRecording(false);
    setCurrentPitch(null);
    
    // Stop volume monitoring
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    setVolume(0);
  }, []);

  const startPitchDetection = useCallback(() => {
    if (!isInitialized) {
      setError('Audio not initialized');
      return;
    }
    
    const analyzer = getAudioAnalyzer();
    analyzer.startPitchDetection();
    
    // Start volume monitoring
    volumeIntervalRef.current = setInterval(() => {
      setVolume(analyzer.getVolume());
    }, 50);
  }, [isInitialized]);

  const stopPitchDetection = useCallback(() => {
    const analyzer = getAudioAnalyzer();
    analyzer.stopPitchDetection();
    setCurrentPitch(null);
    
    // Stop volume monitoring
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    setVolume(0);
  }, []);

  const dispose = useCallback(() => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    disposeAudioAnalyzer();
    setIsInitialized(false);
    setIsRecording(false);
    setCurrentPitch(null);
    setRecordedAudio(null);
    setVolume(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

  return {
    isInitialized,
    isRecording,
    currentPitch,
    recordedAudio,
    error,
    volume,
    initialize,
    startRecording,
    stopRecording,
    startPitchDetection,
    stopPitchDetection,
    dispose,
  };
};
