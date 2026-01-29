'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PieceAnalysis,
  DifficultSection,
  UploadStatus,
  PracticedSection,
  SavedPiece,
} from '@/types/piece-analysis';
import type { Exercise } from '@/types';

interface PieceAnalysisStore {
  // Upload state
  uploadedFile: File | null;
  uploadStatus: UploadStatus;
  
  // Current analysis
  currentAnalysis: PieceAnalysis | null;
  selectedSection: DifficultSection | null;
  
  // Saved pieces (persisted)
  savedPieces: SavedPiece[];
  
  // Generated exercises for sections
  sectionExercises: Map<string, Exercise>;
  
  // Actions - Upload
  setUploadedFile: (file: File | null) => void;
  setUploadStatus: (status: UploadStatus) => void;
  uploadAndAnalyzePiece: (file: File) => Promise<PieceAnalysis | null>;
  
  // Actions - Analysis
  setCurrentAnalysis: (analysis: PieceAnalysis | null) => void;
  selectSection: (section: DifficultSection | null) => void;
  
  // Actions - Saved Pieces
  savePiece: (analysis: PieceAnalysis) => void;
  removePiece: (pieceId: string) => void;
  loadPiece: (pieceId: string) => void;
  toggleFavorite: (pieceId: string) => void;
  updatePieceNotes: (pieceId: string, notes: string) => void;
  
  // Actions - Practice Tracking
  markSectionPracticed: (pieceId: string, sectionId: string, duration: number, rating?: number, notes?: string) => void;
  
  // Actions - Exercise Generation
  generateExerciseForSection: (section: DifficultSection) => Promise<Exercise | null>;
  getSectionExercise: (sectionId: string) => Exercise | undefined;
  
  // Utilities
  reset: () => void;
}

const initialUploadStatus: UploadStatus = {
  state: 'idle',
  progress: 0,
  message: '',
};

const initialState = {
  uploadedFile: null,
  uploadStatus: initialUploadStatus,
  currentAnalysis: null,
  selectedSection: null,
  savedPieces: [] as SavedPiece[],
  sectionExercises: new Map<string, Exercise>(),
};

export const usePieceAnalysisStore = create<PieceAnalysisStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Upload actions
      setUploadedFile: (file) => set({ uploadedFile: file }),
      
      setUploadStatus: (status) => set({ uploadStatus: status }),
      
      uploadAndAnalyzePiece: async (file) => {
        set({
          uploadedFile: file,
          uploadStatus: {
            state: 'uploading',
            progress: 10,
            message: 'Uploading file...',
          },
        });

        try {
          // Update status to processing
          set({
            uploadStatus: {
              state: 'processing',
              progress: 30,
              message: 'Processing file...',
            },
          });

          const formData = new FormData();
          formData.append('file', file);

          // Update status to analyzing
          set({
            uploadStatus: {
              state: 'analyzing',
              progress: 50,
              message: 'Analyzing music with AI...',
            },
          });

          const response = await fetch('/api/analyze-piece', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to analyze piece');
          }

          const data = await response.json();
          const analysis = data.analysis as PieceAnalysis;

          set({
            currentAnalysis: analysis,
            uploadStatus: {
              state: 'complete',
              progress: 100,
              message: 'Analysis complete!',
            },
          });

          return analysis;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set({
            uploadStatus: {
              state: 'error',
              progress: 0,
              message: 'Analysis failed',
              error: errorMessage,
            },
          });
          return null;
        }
      },

      // Analysis actions
      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
      
      selectSection: (section) => set({ selectedSection: section }),

      // Saved pieces actions
      savePiece: (analysis) => {
        const { savedPieces } = get();
        
        // Check if already saved
        const existingIndex = savedPieces.findIndex((p) => p.id === analysis.id);
        
        const savedPiece: SavedPiece = {
          id: analysis.id,
          analysis,
          uploadedAt: Date.now(),
          totalPracticeTime: 0,
          practicedSections: [],
          isFavorite: false,
        };

        if (existingIndex >= 0) {
          // Update existing
          const updated = [...savedPieces];
          updated[existingIndex] = {
            ...updated[existingIndex],
            analysis,
          };
          set({ savedPieces: updated });
        } else {
          // Add new
          set({ savedPieces: [...savedPieces, savedPiece] });
        }
      },
      
      removePiece: (pieceId) => {
        const { savedPieces } = get();
        set({
          savedPieces: savedPieces.filter((p) => p.id !== pieceId),
        });
      },
      
      loadPiece: (pieceId) => {
        const { savedPieces } = get();
        const piece = savedPieces.find((p) => p.id === pieceId);
        if (piece) {
          set({
            currentAnalysis: piece.analysis,
            uploadStatus: {
              state: 'complete',
              progress: 100,
              message: 'Loaded from saved pieces',
            },
          });
        }
      },
      
      toggleFavorite: (pieceId) => {
        const { savedPieces } = get();
        set({
          savedPieces: savedPieces.map((p) =>
            p.id === pieceId ? { ...p, isFavorite: !p.isFavorite } : p
          ),
        });
      },
      
      updatePieceNotes: (pieceId, notes) => {
        const { savedPieces } = get();
        set({
          savedPieces: savedPieces.map((p) =>
            p.id === pieceId ? { ...p, personalNotes: notes } : p
          ),
        });
      },

      // Practice tracking
      markSectionPracticed: (pieceId, sectionId, duration, rating, notes) => {
        const { savedPieces } = get();
        
        const practicedSection: PracticedSection = {
          sectionId,
          practicedAt: Date.now(),
          duration,
          selfRating: rating,
          notes,
        };

        set({
          savedPieces: savedPieces.map((p) => {
            if (p.id !== pieceId) return p;
            
            return {
              ...p,
              lastPracticedAt: Date.now(),
              totalPracticeTime: p.totalPracticeTime + duration,
              practicedSections: [...p.practicedSections, practicedSection],
            };
          }),
        });
      },

      // Exercise generation
      generateExerciseForSection: async (section) => {
        const { sectionExercises, currentAnalysis } = get();
        
        // Check cache first
        const cached = sectionExercises.get(section.id);
        if (cached) return cached;

        try {
          // Use the existing generate-exercise API with section-specific parameters
          const response = await fetch('/api/generate-exercise', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              difficulty: Math.min(10, section.difficultyScore + 1),
              focus: section.category === 'bowing' ? 'bowing' : 
                     section.category === 'rhythm' ? 'rhythm' :
                     section.category === 'intonation' ? 'intonation' : 'mixed',
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to generate exercise');
          }

          const data = await response.json();
          const exercise = data.exercise as Exercise;

          // Update exercise title to reference the section
          exercise.metadata.title = `Practice: ${currentAnalysis?.title || 'Section'} (m. ${section.measureRange.start}-${section.measureRange.end})`;

          // Cache the exercise
          const newMap = new Map(sectionExercises);
          newMap.set(section.id, exercise);
          set({ sectionExercises: newMap });

          return exercise;
        } catch (error) {
          console.error('Failed to generate section exercise:', error);
          return null;
        }
      },
      
      getSectionExercise: (sectionId) => {
        return get().sectionExercises.get(sectionId);
      },

      // Reset
      reset: () => {
        set({
          ...initialState,
          savedPieces: get().savedPieces, // Preserve saved pieces
        });
      },
    }),
    {
      name: 'piece-analysis-storage',
      partialize: (state) => ({
        savedPieces: state.savedPieces,
      }),
    }
  )
);

// Selectors for common queries
export const selectSavedPiecesCount = (state: PieceAnalysisStore) => state.savedPieces.length;
export const selectFavoritePieces = (state: PieceAnalysisStore) => 
  state.savedPieces.filter((p) => p.isFavorite);
export const selectRecentPieces = (state: PieceAnalysisStore, limit: number = 5) =>
  [...state.savedPieces]
    .sort((a, b) => (b.lastPracticedAt || b.uploadedAt) - (a.lastPracticedAt || a.uploadedAt))
    .slice(0, limit);
