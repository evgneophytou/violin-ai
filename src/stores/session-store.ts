'use client';

import { create } from 'zustand';
import type {
  Exercise,
  PerformanceAnalysis,
  DetectedPitch,
  ExerciseFocus,
} from '@/types';

interface SessionStore {
  // Exercise state
  currentExercise: Exercise | null;
  difficulty: number;
  focus: ExerciseFocus;
  
  // Performance tracking
  performanceHistory: PerformanceAnalysis[];
  currentAnalysis: PerformanceAnalysis | null;
  
  // Audio state
  isRecording: boolean;
  isPlaying: boolean;
  isAnalyzing: boolean;
  isGenerating: boolean;
  currentPitch: DetectedPitch | null;
  recordedAudio: Blob | null;
  
  // Actions
  setCurrentExercise: (exercise: Exercise | null) => void;
  setDifficulty: (difficulty: number) => void;
  setFocus: (focus: ExerciseFocus) => void;
  addPerformanceAnalysis: (analysis: PerformanceAnalysis) => void;
  setCurrentAnalysis: (analysis: PerformanceAnalysis | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setCurrentPitch: (pitch: DetectedPitch | null) => void;
  setRecordedAudio: (audio: Blob | null) => void;
  resetSession: () => void;
}

const initialState = {
  currentExercise: null,
  difficulty: 3,
  focus: 'scales' as ExerciseFocus,
  performanceHistory: [],
  currentAnalysis: null,
  isRecording: false,
  isPlaying: false,
  isAnalyzing: false,
  isGenerating: false,
  currentPitch: null,
  recordedAudio: null,
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,
  
  setCurrentExercise: (exercise) => set({ currentExercise: exercise }),
  
  setDifficulty: (difficulty) => set({ difficulty: Math.max(1, Math.min(10, difficulty)) }),
  
  setFocus: (focus) => set({ focus }),
  
  addPerformanceAnalysis: (analysis) =>
    set((state) => ({
      performanceHistory: [...state.performanceHistory, analysis],
    })),
  
  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
  
  setIsRecording: (isRecording) => set({ isRecording }),
  
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  
  setCurrentPitch: (pitch) => set({ currentPitch: pitch }),
  
  setRecordedAudio: (audio) => set({ recordedAudio: audio }),
  
  resetSession: () => set(initialState),
}));
