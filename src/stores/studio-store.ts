'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Recording, RecordingTake } from '@/types';

interface StudioStore {
  // Recording state
  isRecording: boolean;
  recordingDuration: number;
  
  // Takes (temporary recordings in current session)
  takes: RecordingTake[];
  selectedTakeId: string | null;
  
  // Saved recordings
  savedRecordings: Recording[];
  selectedRecordingId: string | null;
  
  // Actions - Recording
  setIsRecording: (isRecording: boolean) => void;
  setRecordingDuration: (duration: number) => void;
  
  // Actions - Takes
  addTake: (take: RecordingTake) => void;
  removeTake: (takeId: string) => void;
  selectTake: (takeId: string | null) => void;
  clearTakes: () => void;
  
  // Actions - Saved Recordings
  addRecording: (recording: Recording) => void;
  updateRecording: (id: string, updates: Partial<Recording>) => void;
  removeRecording: (id: string) => void;
  selectRecording: (id: string | null) => void;
  toggleFavorite: (id: string) => void;
}

const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useStudioStore = create<StudioStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isRecording: false,
      recordingDuration: 0,
      takes: [],
      selectedTakeId: null,
      savedRecordings: [],
      selectedRecordingId: null,
      
      // Recording actions
      setIsRecording: (isRecording) => set({ isRecording }),
      setRecordingDuration: (duration) => set({ recordingDuration: duration }),
      
      // Take actions
      addTake: (take) => {
        set((state) => ({
          takes: [...state.takes, take],
          selectedTakeId: take.id,
        }));
      },
      
      removeTake: (takeId) => {
        const { takes, selectedTakeId } = get();
        const takeToRemove = takes.find((t) => t.id === takeId);
        if (takeToRemove?.audioUrl) {
          URL.revokeObjectURL(takeToRemove.audioUrl);
        }
        set({
          takes: takes.filter((t) => t.id !== takeId),
          selectedTakeId: selectedTakeId === takeId ? null : selectedTakeId,
        });
      },
      
      selectTake: (takeId) => set({ selectedTakeId: takeId }),
      
      clearTakes: () => {
        const { takes } = get();
        takes.forEach((take) => {
          if (take.audioUrl) {
            URL.revokeObjectURL(take.audioUrl);
          }
        });
        set({ takes: [], selectedTakeId: null });
      },
      
      // Recording actions
      addRecording: (recording) => {
        set((state) => ({
          savedRecordings: [recording, ...state.savedRecordings],
          selectedRecordingId: recording.id,
        }));
      },
      
      updateRecording: (id, updates) => {
        set((state) => ({
          savedRecordings: state.savedRecordings.map((rec) =>
            rec.id === id ? { ...rec, ...updates } : rec
          ),
        }));
      },
      
      removeRecording: (id) => {
        const { savedRecordings, selectedRecordingId } = get();
        set({
          savedRecordings: savedRecordings.filter((rec) => rec.id !== id),
          selectedRecordingId: selectedRecordingId === id ? null : selectedRecordingId,
        });
      },
      
      selectRecording: (id) => set({ selectedRecordingId: id }),
      
      toggleFavorite: (id) => {
        set((state) => ({
          savedRecordings: state.savedRecordings.map((rec) =>
            rec.id === id ? { ...rec, isFavorite: !rec.isFavorite } : rec
          ),
        }));
      },
    }),
    {
      name: 'studio-recordings-storage',
      partialize: (state) => ({
        savedRecordings: state.savedRecordings.slice(0, 100), // Keep last 100 recordings
      }),
    }
  )
);

// Helper to convert blob to base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper to convert base64 to blob
export const base64ToBlob = (base64: string): Blob => {
  const parts = base64.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'audio/webm';
  const bstr = atob(parts[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
};

// Helper to create a take from a blob
export const createTakeFromBlob = (blob: Blob, duration: number): RecordingTake => {
  return {
    id: generateId(),
    audioBlob: blob,
    audioUrl: URL.createObjectURL(blob),
    duration,
    timestamp: Date.now(),
  };
};

// Helper to create a recording from a take
export const createRecordingFromTake = async (
  take: RecordingTake,
  title: string,
  exerciseId?: string,
  exerciseTitle?: string,
  notes?: string
): Promise<Recording> => {
  const audioData = await blobToBase64(take.audioBlob);
  return {
    id: generateId(),
    title,
    audioData,
    duration: take.duration,
    exerciseId,
    exerciseTitle,
    createdAt: Date.now(),
    notes,
    tags: [],
    isFavorite: false,
  };
};
