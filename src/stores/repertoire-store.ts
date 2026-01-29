'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PieceMetadata,
  UserSkillProfile,
  RepertoireRecommendation,
  LearningPath,
  generateRecommendations,
  generateLearningPath,
  searchPieces,
  PIECE_DATABASE,
} from '@/lib/ai/repertoire-agent';

// Piece progress status
export type PieceStatus = 'not_started' | 'learning' | 'practicing' | 'polishing' | 'mastered';

// User's progress on a piece
export interface UserPieceProgress {
  pieceId: string;
  status: PieceStatus;
  startedAt?: string;
  masteredAt?: string;
  currentMovement: number;
  practiceTime: number; // minutes
  lastPracticed?: string;
  notes?: string;
  rating?: number; // User's own difficulty rating 1-5
}

interface RepertoireState {
  // User skill profile
  skillProfile: UserSkillProfile;
  
  // User's piece progress
  pieceProgress: Record<string, UserPieceProgress>;
  
  // Current recommendations
  recommendations: RepertoireRecommendation[];
  
  // Active learning paths
  learningPaths: LearningPath[];
  
  // Browsing state
  selectedPiece: PieceMetadata | null;
  searchFilters: {
    difficulty?: { min?: number; max?: number };
    era?: string[];
    style?: string[];
    techniques?: string[];
    composer?: string;
    hasAccompaniment?: boolean;
  };
  searchResults: PieceMetadata[];
  
  // Actions
  updateSkillProfile: (updates: Partial<UserSkillProfile>) => void;
  setMasteredTechnique: (technique: string) => void;
  setLearningTechnique: (technique: string) => void;
  removeTechnique: (technique: string) => void;
  
  // Piece progress actions
  startPiece: (pieceId: string) => void;
  updatePieceProgress: (pieceId: string, updates: Partial<UserPieceProgress>) => void;
  setPieceStatus: (pieceId: string, status: PieceStatus) => void;
  addPracticeTime: (pieceId: string, minutes: number) => void;
  setPieceNotes: (pieceId: string, notes: string) => void;
  
  // Recommendation actions
  refreshRecommendations: (options?: {
    count?: number;
    includeStretches?: boolean;
    focusTechniques?: string[];
  }) => void;
  
  // Learning path actions
  createLearningPath: (goal: {
    targetPiece?: string;
    targetTechnique?: string;
    targetLevel?: number;
    timeframeWeeks?: number;
  }) => void;
  removeLearningPath: (index: number) => void;
  
  // Browse actions
  selectPiece: (piece: PieceMetadata | null) => void;
  setSearchFilters: (filters: RepertoireState['searchFilters']) => void;
  search: () => void;
  clearSearch: () => void;
  
  // Stats
  getStats: () => {
    totalPieces: number;
    inProgress: number;
    mastered: number;
    totalPracticeTime: number;
    currentLevel: number;
  };
}

// Default skill profile for new users
const DEFAULT_SKILL_PROFILE: UserSkillProfile = {
  level: 3,
  masteredTechniques: ['first_position', 'detache', 'legato'],
  learningTechniques: ['third_position', 'shifting', 'staccato'],
  preferredEras: [],
  preferredStyles: [],
  recentPieces: [],
  strengths: [],
  weaknesses: [],
};

export const useRepertoireStore = create<RepertoireState>()(
  persist(
    (set, get) => ({
      // Initial state
      skillProfile: DEFAULT_SKILL_PROFILE,
      pieceProgress: {},
      recommendations: [],
      learningPaths: [],
      selectedPiece: null,
      searchFilters: {},
      searchResults: [],

      // Skill profile actions
      updateSkillProfile: (updates) => {
        set((state) => ({
          skillProfile: { ...state.skillProfile, ...updates },
        }));
        // Refresh recommendations when profile changes
        get().refreshRecommendations();
      },

      setMasteredTechnique: (technique) => {
        set((state) => ({
          skillProfile: {
            ...state.skillProfile,
            masteredTechniques: state.skillProfile.masteredTechniques.includes(technique)
              ? state.skillProfile.masteredTechniques
              : [...state.skillProfile.masteredTechniques, technique],
            learningTechniques: state.skillProfile.learningTechniques.filter(t => t !== technique),
          },
        }));
      },

      setLearningTechnique: (technique) => {
        set((state) => ({
          skillProfile: {
            ...state.skillProfile,
            learningTechniques: state.skillProfile.learningTechniques.includes(technique)
              ? state.skillProfile.learningTechniques
              : [...state.skillProfile.learningTechniques, technique],
          },
        }));
      },

      removeTechnique: (technique) => {
        set((state) => ({
          skillProfile: {
            ...state.skillProfile,
            masteredTechniques: state.skillProfile.masteredTechniques.filter(t => t !== technique),
            learningTechniques: state.skillProfile.learningTechniques.filter(t => t !== technique),
          },
        }));
      },

      // Piece progress actions
      startPiece: (pieceId) => {
        set((state) => ({
          pieceProgress: {
            ...state.pieceProgress,
            [pieceId]: {
              pieceId,
              status: 'learning',
              startedAt: new Date().toISOString(),
              currentMovement: 1,
              practiceTime: 0,
            },
          },
          skillProfile: {
            ...state.skillProfile,
            recentPieces: [pieceId, ...state.skillProfile.recentPieces.filter(id => id !== pieceId)].slice(0, 10),
          },
        }));
      },

      updatePieceProgress: (pieceId, updates) => {
        set((state) => ({
          pieceProgress: {
            ...state.pieceProgress,
            [pieceId]: {
              ...state.pieceProgress[pieceId],
              ...updates,
              lastPracticed: new Date().toISOString(),
            },
          },
        }));
      },

      setPieceStatus: (pieceId, status) => {
        set((state) => {
          const progress = state.pieceProgress[pieceId] || {
            pieceId,
            currentMovement: 1,
            practiceTime: 0,
          };
          
          return {
            pieceProgress: {
              ...state.pieceProgress,
              [pieceId]: {
                ...progress,
                status,
                masteredAt: status === 'mastered' ? new Date().toISOString() : progress.masteredAt,
                startedAt: progress.startedAt || new Date().toISOString(),
              },
            },
          };
        });
      },

      addPracticeTime: (pieceId, minutes) => {
        set((state) => {
          const progress = state.pieceProgress[pieceId];
          if (!progress) return state;
          
          return {
            pieceProgress: {
              ...state.pieceProgress,
              [pieceId]: {
                ...progress,
                practiceTime: progress.practiceTime + minutes,
                lastPracticed: new Date().toISOString(),
              },
            },
          };
        });
      },

      setPieceNotes: (pieceId, notes) => {
        set((state) => {
          const progress = state.pieceProgress[pieceId];
          if (!progress) return state;
          
          return {
            pieceProgress: {
              ...state.pieceProgress,
              [pieceId]: {
                ...progress,
                notes,
              },
            },
          };
        });
      },

      // Recommendation actions
      refreshRecommendations: (options = {}) => {
        const state = get();
        const excludePieces = Object.keys(state.pieceProgress).filter(
          id => state.pieceProgress[id].status === 'mastered'
        );
        
        const recommendations = generateRecommendations(state.skillProfile, {
          ...options,
          excludePieces,
        });
        
        set({ recommendations });
      },

      // Learning path actions
      createLearningPath: (goal) => {
        const path = generateLearningPath(get().skillProfile, goal);
        set((state) => ({
          learningPaths: [...state.learningPaths, path],
        }));
      },

      removeLearningPath: (index) => {
        set((state) => ({
          learningPaths: state.learningPaths.filter((_, i) => i !== index),
        }));
      },

      // Browse actions
      selectPiece: (piece) => {
        set({ selectedPiece: piece });
      },

      setSearchFilters: (filters) => {
        set({ searchFilters: filters });
      },

      search: () => {
        const { searchFilters } = get();
        const results = searchPieces(searchFilters);
        set({ searchResults: results });
      },

      clearSearch: () => {
        set({ searchFilters: {}, searchResults: [] });
      },

      // Stats
      getStats: () => {
        const state = get();
        const progressEntries = Object.values(state.pieceProgress);
        
        return {
          totalPieces: PIECE_DATABASE.length,
          inProgress: progressEntries.filter(p => 
            ['learning', 'practicing', 'polishing'].includes(p.status)
          ).length,
          mastered: progressEntries.filter(p => p.status === 'mastered').length,
          totalPracticeTime: progressEntries.reduce((sum, p) => sum + p.practiceTime, 0),
          currentLevel: state.skillProfile.level,
        };
      },
    }),
    {
      name: 'violin-ai-repertoire',
      partialize: (state) => ({
        skillProfile: state.skillProfile,
        pieceProgress: state.pieceProgress,
        learningPaths: state.learningPaths,
      }),
    }
  )
);
