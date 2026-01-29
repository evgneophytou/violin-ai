'use client';

import { create } from 'zustand';
import type { JournalEntry } from '@/types';

interface JournalStore {
  // State
  entries: JournalEntry[];
  selectedEntryId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setEntries: (entries: JournalEntry[]) => void;
  addEntry: (entry: JournalEntry) => void;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => void;
  removeEntry: (id: string) => void;
  selectEntry: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useJournalStore = create<JournalStore>((set, get) => ({
  // Initial state
  entries: [],
  selectedEntryId: null,
  isLoading: false,
  error: null,
  
  // Actions
  setEntries: (entries) => set({ entries }),
  
  addEntry: (entry) => {
    set((state) => ({
      entries: [entry, ...state.entries],
      selectedEntryId: entry.id,
    }));
  },
  
  updateEntry: (id, updates) => {
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.id === id ? { ...entry, ...updates, updatedAt: Date.now() } : entry
      ),
    }));
  },
  
  removeEntry: (id) => {
    const { entries, selectedEntryId } = get();
    set({
      entries: entries.filter((entry) => entry.id !== id),
      selectedEntryId: selectedEntryId === id ? null : selectedEntryId,
    });
  },
  
  selectEntry: (id) => set({ selectedEntryId: id }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
}));

// Helper to create a new journal entry
export const createJournalEntry = (
  content: string,
  options?: {
    mood?: number;
    energy?: number;
    goals?: string[];
    recordingIds?: string[];
    practiceMinutes?: number;
  }
): Omit<JournalEntry, 'id'> => {
  const now = Date.now();
  return {
    date: now,
    content,
    mood: options?.mood,
    energy: options?.energy,
    goals: options?.goals,
    recordingIds: options?.recordingIds,
    practiceMinutes: options?.practiceMinutes,
    createdAt: now,
    updatedAt: now,
  };
};

// Mood and energy labels
export const MOOD_LABELS = ['😞', '😕', '😐', '🙂', '😊'] as const;
export const ENERGY_LABELS = ['🔋', '🪫', '⚡', '💪', '🔥'] as const;

export const getMoodLabel = (mood: number): string => {
  return MOOD_LABELS[Math.min(Math.max(mood - 1, 0), 4)];
};

export const getEnergyLabel = (energy: number): string => {
  return ENERGY_LABELS[Math.min(Math.max(energy - 1, 0), 4)];
};
