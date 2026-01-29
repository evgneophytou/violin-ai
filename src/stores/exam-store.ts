'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ExamGrade,
  ExamAttempt,
  ExamComponentResult,
  ExamResult,
} from '@/lib/ai/exam-grader-agent';
import type { AuralTest } from '@/lib/ai/aural-test-agent';

export type ExamPhase = 
  | 'select_grade'
  | 'scales'
  | 'piece'
  | 'sight_reading'
  | 'aural'
  | 'technique'
  | 'reviewing'
  | 'completed';

interface ExamState {
  // Current exam
  currentExam: ExamAttempt | null;
  currentPhase: ExamPhase;
  
  // Component states
  currentComponentIndex: number;
  componentResults: Map<string, ExamComponentResult>;
  
  // Aural tests
  auralTests: AuralTest[];
  auralAnswers: number[];
  currentAuralIndex: number;
  
  // Recordings
  scalesRecording: Blob | null;
  pieceRecording: Blob | null;
  sightReadingRecording: Blob | null;
  
  // History
  examHistory: ExamAttempt[];
  
  // Actions
  startExam: (exam: ExamAttempt) => void;
  setPhase: (phase: ExamPhase) => void;
  setAuralTests: (tests: AuralTest[]) => void;
  submitAuralAnswer: (answer: number) => void;
  nextAuralTest: () => void;
  setComponentResult: (type: string, result: ExamComponentResult) => void;
  setRecording: (type: 'scales' | 'piece' | 'sight_reading', blob: Blob) => void;
  completeExam: (result: ExamResult, totalScore: number, feedback: string) => void;
  addToHistory: (exam: ExamAttempt) => void;
  reset: () => void;
}

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentExam: null,
      currentPhase: 'select_grade',
      currentComponentIndex: 0,
      componentResults: new Map(),
      auralTests: [],
      auralAnswers: [],
      currentAuralIndex: 0,
      scalesRecording: null,
      pieceRecording: null,
      sightReadingRecording: null,
      examHistory: [],

      // Actions
      startExam: (exam) => set({
        currentExam: exam,
        currentPhase: 'scales',
        currentComponentIndex: 0,
        componentResults: new Map(),
        auralTests: [],
        auralAnswers: [],
        currentAuralIndex: 0,
        scalesRecording: null,
        pieceRecording: null,
        sightReadingRecording: null,
      }),

      setPhase: (phase) => set({ currentPhase: phase }),

      setAuralTests: (tests) => set({
        auralTests: tests,
        auralAnswers: [],
        currentAuralIndex: 0,
      }),

      submitAuralAnswer: (answer) => {
        const { auralAnswers } = get();
        set({ auralAnswers: [...auralAnswers, answer] });
      },

      nextAuralTest: () => {
        const { currentAuralIndex, auralTests } = get();
        if (currentAuralIndex < auralTests.length - 1) {
          set({ currentAuralIndex: currentAuralIndex + 1 });
        }
      },

      setComponentResult: (type, result) => {
        const { componentResults } = get();
        const newResults = new Map(componentResults);
        newResults.set(type, result);
        set({ componentResults: newResults });
      },

      setRecording: (type, blob) => {
        switch (type) {
          case 'scales':
            set({ scalesRecording: blob });
            break;
          case 'piece':
            set({ pieceRecording: blob });
            break;
          case 'sight_reading':
            set({ sightReadingRecording: blob });
            break;
        }
      },

      completeExam: (result, totalScore, feedback) => {
        const { currentExam, componentResults, examHistory } = get();
        if (!currentExam) return;

        const completedExam: ExamAttempt = {
          ...currentExam,
          status: 'graded',
          result,
          totalScore,
          percentage: Math.round((totalScore / currentExam.maxScore) * 100),
          components: Array.from(componentResults.values()),
          completedAt: new Date(),
        };

        set({
          currentExam: completedExam,
          currentPhase: 'completed',
          examHistory: [...examHistory, completedExam],
        });
      },

      addToHistory: (exam) => {
        const { examHistory } = get();
        set({ examHistory: [...examHistory, exam] });
      },

      reset: () => set({
        currentExam: null,
        currentPhase: 'select_grade',
        currentComponentIndex: 0,
        componentResults: new Map(),
        auralTests: [],
        auralAnswers: [],
        currentAuralIndex: 0,
        scalesRecording: null,
        pieceRecording: null,
        sightReadingRecording: null,
      }),
    }),
    {
      name: 'violin-ai-exam',
      partialize: (state) => ({
        examHistory: state.examHistory,
      }),
    }
  )
);

// Helper to get exam statistics
export const getExamStats = (history: ExamAttempt[]) => {
  if (history.length === 0) return null;

  const passed = history.filter((e) => e.result !== 'fail').length;
  const distinctions = history.filter((e) => e.result === 'distinction').length;
  const merits = history.filter((e) => e.result === 'merit').length;
  const avgScore = history.reduce((sum, e) => sum + e.percentage, 0) / history.length;

  const highestGrade = Math.max(...history.filter((e) => e.result !== 'fail').map((e) => e.grade));

  return {
    totalExams: history.length,
    passed,
    passRate: Math.round((passed / history.length) * 100),
    distinctions,
    merits,
    avgScore: Math.round(avgScore),
    highestGrade: highestGrade >= 0 ? highestGrade : null,
  };
};
