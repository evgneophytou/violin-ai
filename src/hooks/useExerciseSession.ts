'use client';

import { useState, useCallback, useRef } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { usePlayback } from '@/hooks/usePlayback';
import { 
  adjustDifficulty, 
  createInitialDifficultyState,
  suggestNextExercise,
  type DifficultyState 
} from '@/lib/ai/difficulty-agent';
import { FEATURES, EVENTS, trackEvent } from '@/lib/analytics/tracking';
import type { 
  Exercise, 
  PerformanceAnalysis, 
  ExerciseFocus,
  DifficultyAdjustment,
  LoopConfig
} from '@/types';

export const useExerciseSession = () => {
  const store = useSessionStore();
  const audioCapture = useAudioCapture();
  const playback = usePlayback();
  
  const [difficultyState, setDifficultyState] = useState<DifficultyState>(
    createInitialDifficultyState(store.difficulty)
  );
  const [lastAdjustment, setLastAdjustment] = useState<DifficultyAdjustment | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const detectedPitchesRef = useRef<Array<{ pitch: string; cents: number; clarity: number }>>([]);

  // Initialize audio systems
  const initializeAudio = useCallback(async () => {
    try {
      setError(null);
      await audioCapture.initialize();
      await playback.initialize();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize audio';
      setError(message);
    }
  }, [audioCapture, playback]);

  // Generate a new exercise
  const generateExercise = useCallback(async () => {
    store.setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          difficulty: store.difficulty,
          focus: store.focus,
          previousFeedback: store.currentAnalysis,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate exercise');
      }
      
      const data = await response.json();
      store.setCurrentExercise(data.exercise);
      store.setCurrentAnalysis(null);
      
      // Track exercise generation
      trackEvent(EVENTS.EXERCISE_GENERATED, FEATURES.PRACTICE, {
        difficulty: store.difficulty,
        focus: store.focus,
        success: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate exercise';
      setError(message);
      
      // Track generation failure
      trackEvent(EVENTS.EXERCISE_GENERATED, FEATURES.PRACTICE, {
        difficulty: store.difficulty,
        focus: store.focus,
        success: false,
        error_type: 'generation_failed',
      });
    } finally {
      store.setIsGenerating(false);
    }
  }, [store]);

  // Play the current exercise
  const playExercise = useCallback(async () => {
    if (!store.currentExercise) {
      setError('No exercise to play. Generate one first.');
      return;
    }
    
    if (!store.currentExercise.notes || store.currentExercise.notes.length === 0) {
      setError('Exercise has no playable notes. Try regenerating.');
      return;
    }
    
    // Initialize playback if not already done
    if (!playback.isInitialized) {
      try {
        await playback.initialize();
      } catch (err) {
        setError('Failed to initialize audio playback. Please try again.');
        return;
      }
    }
    
    setError(null);
    try {
      // Track exercise play
      trackEvent(EVENTS.EXERCISE_PLAYED, FEATURES.PRACTICE, {
        difficulty: store.difficulty,
        focus: store.focus,
        tempo: store.currentExercise.metadata.tempo,
      });
      
      // playback.isPlaying will be set to true by the playback hook
      await playback.play(
        store.currentExercise.notes,
        store.currentExercise.metadata.tempo
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to play exercise';
      setError(message);
    }
  }, [store, playback]);

  // Stop playback
  const stopPlayback = useCallback(() => {
    playback.stop();
    // playback.isPlaying will be set to false by the stop call
  }, [playback]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!store.currentExercise) {
      setError('No exercise to record. Generate one first.');
      return;
    }
    
    // Try to initialize audio if not already done
    if (!audioCapture.isInitialized) {
      try {
        await audioCapture.initialize();
      } catch (err) {
        setError('Microphone access required. Please click "Enable Microphone" and allow access.');
        return;
      }
    }
    
    if (!audioCapture.isInitialized) {
      setError('Microphone access required. Please click "Enable Microphone" and allow access.');
      return;
    }
    
    setError(null);
    detectedPitchesRef.current = [];
    store.setIsRecording(true);
    audioCapture.startRecording();
    
    // Track recording start
    trackEvent(EVENTS.RECORDING_STARTED, FEATURES.PRACTICE, {
      difficulty: store.difficulty,
      focus: store.focus,
    });
  }, [audioCapture, store]);

  // Stop recording and analyze
  const stopRecording = useCallback(async () => {
    audioCapture.stopRecording();
    store.setIsRecording(false);
    
    // Track recording stop
    trackEvent(EVENTS.RECORDING_STOPPED, FEATURES.PRACTICE, {
      difficulty: store.difficulty,
      focus: store.focus,
    });
    
    // Wait a bit for the recording to finalize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!audioCapture.recordedAudio || !store.currentExercise) {
      return;
    }
    
    store.setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioCapture.recordedAudio, 'recording.webm');
      formData.append('expectedNotes', JSON.stringify(store.currentExercise.notes));
      formData.append('metadata', JSON.stringify(store.currentExercise.metadata));
      
      const response = await fetch('/api/analyze-performance', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze performance');
      }
      
      const data = await response.json();
      const analysis: PerformanceAnalysis = data.analysis;
      
      // Update store
      store.setCurrentAnalysis(analysis);
      store.addPerformanceAnalysis(analysis);
      
      // Track performance analysis
      trackEvent(EVENTS.PERFORMANCE_ANALYZED, FEATURES.PRACTICE, {
        difficulty: store.difficulty,
        focus: store.focus,
        score: analysis.overallScore,
        success: true,
      });
      
      // Adjust difficulty
      const adjustment = adjustDifficulty(difficultyState, analysis);
      setLastAdjustment(adjustment);
      
      if (adjustment.newDifficulty !== difficultyState.currentLevel) {
        // Track difficulty change
        trackEvent(EVENTS.DIFFICULTY_CHANGED, FEATURES.PRACTICE, {
          level: difficultyState.currentLevel,
          difficulty: adjustment.newDifficulty,
        });
        
        store.setDifficulty(adjustment.newDifficulty);
        setDifficultyState(prev => ({
          ...prev,
          currentLevel: adjustment.newDifficulty,
          focusAreas: adjustment.focusAreas,
        }));
      } else {
        setDifficultyState(prev => ({
          ...prev,
          focusAreas: adjustment.focusAreas,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze performance';
      setError(message);
    } finally {
      store.setIsAnalyzing(false);
    }
  }, [audioCapture, store, difficultyState]);

  // Generate next exercise with adaptive adjustments
  const nextExercise = useCallback(async () => {
    const suggestion = suggestNextExercise(difficultyState, store.currentAnalysis || undefined);
    
    store.setDifficulty(suggestion.difficulty);
    store.setFocus(suggestion.focus);
    
    await generateExercise();
  }, [difficultyState, store, generateExercise]);

  // Update difficulty manually
  const setDifficulty = useCallback((level: number) => {
    store.setDifficulty(level);
    setDifficultyState(prev => ({
      ...prev,
      currentLevel: level,
    }));
  }, [store]);

  // Update focus manually
  const setFocus = useCallback((focus: ExerciseFocus) => {
    store.setFocus(focus);
  }, [store]);

  // Update current pitch from audio capture
  const updateCurrentPitch = useCallback(() => {
    if (audioCapture.currentPitch) {
      store.setCurrentPitch(audioCapture.currentPitch);
      detectedPitchesRef.current.push({
        pitch: audioCapture.currentPitch.note,
        cents: audioCapture.currentPitch.cents,
        clarity: audioCapture.currentPitch.clarity,
      });
    } else {
      store.setCurrentPitch(null);
    }
  }, [audioCapture.currentPitch, store]);

  return {
    // State
    currentExercise: store.currentExercise,
    difficulty: store.difficulty,
    focus: store.focus,
    isPlaying: playback.isPlaying,
    isRecording: store.isRecording,
    isGenerating: store.isGenerating,
    isAnalyzing: store.isAnalyzing,
    currentPitch: audioCapture.currentPitch,
    currentNoteIndex: playback.currentNoteIndex,
    currentAnalysis: store.currentAnalysis,
    performanceHistory: store.performanceHistory,
    lastAdjustment,
    volume: audioCapture.volume,
    error: error || audioCapture.error || playback.error,
    isAudioInitialized: audioCapture.isInitialized,
    
    // Slow Practice Mode
    tempoPercent: playback.tempoPercent,
    setTempoPercent: playback.setTempoPercent,
    effectiveTempo: playback.effectiveTempo,
    loopConfig: playback.loopConfig,
    setLoop: playback.setLoop,
    clearLoop: playback.clearLoop,
    loopCount: playback.loopCount,
    
    // Actions
    initializeAudio,
    generateExercise,
    playExercise,
    stopPlayback,
    startRecording,
    stopRecording,
    nextExercise,
    setDifficulty,
    setFocus,
    updateCurrentPitch,
  };
};
