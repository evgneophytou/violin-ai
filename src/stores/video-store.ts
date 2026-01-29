'use client';

import { create } from 'zustand';
import type { PoseResult } from '@/lib/video/pose-types';

export interface TechniqueAnalysis {
  posture: PostureAnalysis;
  bowArm: BowArmAnalysis;
  leftHand: LeftHandAnalysis;
  violinPosition: ViolinPositionAnalysis;
  overallScore: number;
  suggestions: string[];
  timestamp: number;
}

export interface PostureAnalysis {
  shoulderTension: 'relaxed' | 'moderate' | 'tense';
  shoulderLevel: number; // -1 to 1 (left low to right low)
  spineAlignment: number; // 0-100
  headPosition: 'correct' | 'tilted_left' | 'tilted_right' | 'forward';
  score: number;
}

export interface BowArmAnalysis {
  elbowHeight: 'correct' | 'too_high' | 'too_low';
  wristAngle: number; // degrees
  bowStraightness: number; // 0-100 (100 = perfectly straight)
  bowDistribution: 'tip' | 'upper' | 'middle' | 'lower' | 'frog';
  strokeDirection: 'up' | 'down' | 'stationary';
  score: number;
}

export interface LeftHandAnalysis {
  position: number; // 1-7 for positions
  fingerCurvature: 'good' | 'flat' | 'collapsed';
  wristAngle: number;
  thumbPosition: 'correct' | 'too_high' | 'too_low';
  score: number;
}

export interface ViolinPositionAnalysis {
  chinContact: boolean;
  scrollHeight: 'correct' | 'too_high' | 'too_low';
  violinAngle: number; // degrees from horizontal
  stability: number; // 0-100
  score: number;
}

interface VideoAnalysisState {
  // Detection state
  isDetectorReady: boolean;
  isAnalyzing: boolean;
  isCameraActive: boolean;
  
  // Current pose data
  currentPose: PoseResult | null;
  
  // Analysis results
  currentAnalysis: TechniqueAnalysis | null;
  analysisHistory: TechniqueAnalysis[];
  
  // Tracking data for temporal analysis
  wristPositionHistory: Array<{ x: number; y: number; timestamp: number }>;
  
  // Settings
  showOverlay: boolean;
  showSkeleton: boolean;
  analysisInterval: number; // ms between analyses
  
  // Actions
  setDetectorReady: (ready: boolean) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setCameraActive: (active: boolean) => void;
  setCurrentPose: (pose: PoseResult | null) => void;
  setCurrentAnalysis: (analysis: TechniqueAnalysis | null) => void;
  addAnalysisToHistory: (analysis: TechniqueAnalysis) => void;
  addWristPosition: (x: number, y: number) => void;
  clearWristHistory: () => void;
  setShowOverlay: (show: boolean) => void;
  setShowSkeleton: (show: boolean) => void;
  setAnalysisInterval: (interval: number) => void;
  reset: () => void;
}

const MAX_WRIST_HISTORY = 100;
const MAX_ANALYSIS_HISTORY = 50;

export const useVideoStore = create<VideoAnalysisState>((set, get) => ({
  // Initial state
  isDetectorReady: false,
  isAnalyzing: false,
  isCameraActive: false,
  currentPose: null,
  currentAnalysis: null,
  analysisHistory: [],
  wristPositionHistory: [],
  showOverlay: true,
  showSkeleton: true,
  analysisInterval: 100,

  // Actions
  setDetectorReady: (ready) => set({ isDetectorReady: ready }),
  
  setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
  
  setCameraActive: (active) => set({ isCameraActive: active }),
  
  setCurrentPose: (pose) => set({ currentPose: pose }),
  
  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
  
  addAnalysisToHistory: (analysis) => {
    const history = get().analysisHistory;
    const newHistory = [...history, analysis].slice(-MAX_ANALYSIS_HISTORY);
    set({ analysisHistory: newHistory });
  },
  
  addWristPosition: (x, y) => {
    const history = get().wristPositionHistory;
    const newHistory = [
      ...history,
      { x, y, timestamp: Date.now() },
    ].slice(-MAX_WRIST_HISTORY);
    set({ wristPositionHistory: newHistory });
  },
  
  clearWristHistory: () => set({ wristPositionHistory: [] }),
  
  setShowOverlay: (show) => set({ showOverlay: show }),
  
  setShowSkeleton: (show) => set({ showSkeleton: show }),
  
  setAnalysisInterval: (interval) => set({ analysisInterval: interval }),
  
  reset: () => set({
    isAnalyzing: false,
    isCameraActive: false,
    currentPose: null,
    currentAnalysis: null,
    analysisHistory: [],
    wristPositionHistory: [],
  }),
}));

// Helper to get average analysis scores over recent history
export const getAverageScores = (history: TechniqueAnalysis[]): {
  posture: number;
  bowArm: number;
  leftHand: number;
  violinPosition: number;
  overall: number;
} | null => {
  if (history.length === 0) return null;
  
  const sum = history.reduce(
    (acc, analysis) => ({
      posture: acc.posture + analysis.posture.score,
      bowArm: acc.bowArm + analysis.bowArm.score,
      leftHand: acc.leftHand + analysis.leftHand.score,
      violinPosition: acc.violinPosition + analysis.violinPosition.score,
      overall: acc.overall + analysis.overallScore,
    }),
    { posture: 0, bowArm: 0, leftHand: 0, violinPosition: 0, overall: 0 }
  );
  
  const count = history.length;
  return {
    posture: Math.round(sum.posture / count),
    bowArm: Math.round(sum.bowArm / count),
    leftHand: Math.round(sum.leftHand / count),
    violinPosition: Math.round(sum.violinPosition / count),
    overall: Math.round(sum.overall / count),
  };
};
