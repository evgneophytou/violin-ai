'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage, CoachContext } from '@/types';

interface CoachStore {
  // State
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  
  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastAssistantMessage: (content: string) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  clearMessages: () => void;
  clearError: () => void;
}

const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useCoachStore = create<CoachStore>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: [],
      isLoading: false,
      error: null,
      isOpen: false,
      
      // Actions
      addMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: generateMessageId(),
          timestamp: Date.now(),
        };
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },
      
      updateLastAssistantMessage: (content) => {
        set((state) => {
          const messages = [...state.messages];
          const lastIndex = messages.length - 1;
          if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
            messages[lastIndex] = {
              ...messages[lastIndex],
              content,
            };
          }
          return { messages };
        });
      },
      
      setIsLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      setIsOpen: (open) => set({ isOpen: open }),
      
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      
      clearMessages: () => set({ messages: [] }),
      
      clearError: () => set({ error: null }),
    }),
    {
      name: 'coach-chat-storage',
      partialize: (state) => ({
        messages: state.messages.slice(-50), // Keep last 50 messages
      }),
    }
  )
);

// Helper hook to get context from session
export const buildCoachContext = (
  difficulty: number,
  currentExercise?: { metadata: { title: string; key: string; tempo: number; focus: string; difficulty: number; techniques: string[] } } | null,
  currentAnalysis?: { overallScore: number; pitch: { accuracy: number; suggestions: string[] }; rhythm: { accuracy: number; suggestions: string[] }; nextFocus: string } | null,
  performanceHistory?: { overallScore: number }[]
): CoachContext => {
  const context: CoachContext = {
    userLevel: difficulty,
  };
  
  if (currentExercise) {
    context.currentExercise = {
      id: '',
      title: currentExercise.metadata.title,
      key: currentExercise.metadata.key,
      tempo: currentExercise.metadata.tempo,
      focus: currentExercise.metadata.focus as CoachContext['currentExercise'] extends { focus: infer F } ? F : never,
      difficulty: currentExercise.metadata.difficulty,
      techniques: currentExercise.metadata.techniques,
      timeSignature: '',
      measures: 0,
      noteRange: { low: '', high: '' },
    };
  }
  
  if (currentAnalysis) {
    context.recentPerformance = {
      overallScore: currentAnalysis.overallScore,
      pitch: {
        accuracy: currentAnalysis.pitch.accuracy,
        suggestions: currentAnalysis.pitch.suggestions,
        sharpNotes: [],
        flatNotes: [],
        averageDeviation: 0,
      },
      rhythm: {
        accuracy: currentAnalysis.rhythm.accuracy,
        suggestions: currentAnalysis.rhythm.suggestions,
        rushingTendency: false,
        draggingTendency: false,
        problemAreas: [],
        tempoConsistency: 0,
      },
      dynamics: {
        followedMarkings: true,
        dynamicRange: { min: 0, max: 100 },
        crescendoControl: 0,
        diminuendoControl: 0,
        suggestions: [],
      },
      phrasing: {
        breathMarks: true,
        musicalLine: '',
        legato: 0,
        articulation: 0,
        suggestions: [],
      },
      encouragement: '',
      nextFocus: currentAnalysis.nextFocus,
      timestamp: Date.now(),
    };
  }
  
  if (performanceHistory?.length) {
    // Group by focus and calculate averages (simplified)
    context.practiceHistory = [
      {
        focus: 'overall',
        avgScore: Math.round(
          performanceHistory.reduce((sum, p) => sum + p.overallScore, 0) / performanceHistory.length
        ),
      },
    ];
  }
  
  return context;
};
