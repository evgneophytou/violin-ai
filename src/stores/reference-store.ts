'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface ReferenceRecording {
  id: string;
  title: string;
  artist: string;
  pieceId?: string;
  pieceName?: string;
  description?: string;
  source: 'youtube' | 'spotify' | 'imslp' | 'upload' | 'local';
  url?: string;
  audioData?: string; // Base64 for local uploads
  duration?: number; // seconds
  createdAt: string;
  isFavorite: boolean;
  tags: string[];
}

export interface WaveformData {
  peaks: number[];
  duration: number;
  sampleRate: number;
}

export interface ComparisonSession {
  id: string;
  referenceId: string;
  userRecordingId?: string;
  userAudioData?: string;
  startTime: number;
  endTime: number;
  loopStart?: number;
  loopEnd?: number;
  playbackSpeed: number;
  notes?: string;
  createdAt: string;
}

interface ReferenceStoreState {
  // Reference recordings
  recordings: ReferenceRecording[];
  selectedRecording: ReferenceRecording | null;
  
  // Waveform data cache
  waveformCache: Record<string, WaveformData>;
  
  // Comparison state
  comparisonSession: ComparisonSession | null;
  isPlaying: boolean;
  currentTime: number;
  playbackSpeed: number;
  isLooping: boolean;
  loopStart: number;
  loopEnd: number;
  
  // Volume controls
  referenceVolume: number;
  userVolume: number;
  isMuted: boolean;
  
  // Actions
  addRecording: (recording: Omit<ReferenceRecording, 'id' | 'createdAt'>) => void;
  updateRecording: (id: string, updates: Partial<ReferenceRecording>) => void;
  deleteRecording: (id: string) => void;
  selectRecording: (recording: ReferenceRecording | null) => void;
  toggleFavorite: (id: string) => void;
  
  // Waveform actions
  setWaveformData: (id: string, data: WaveformData) => void;
  getWaveformData: (id: string) => WaveformData | null;
  
  // Playback actions
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setLooping: (looping: boolean) => void;
  setLoopRange: (start: number, end: number) => void;
  
  // Volume actions
  setReferenceVolume: (volume: number) => void;
  setUserVolume: (volume: number) => void;
  toggleMute: () => void;
  
  // Comparison actions
  startComparison: (referenceId: string, userAudioData?: string) => void;
  endComparison: () => void;
  saveComparisonNotes: (notes: string) => void;
  
  // Search/filter
  searchRecordings: (query: string) => ReferenceRecording[];
  getRecordingsByPiece: (pieceId: string) => ReferenceRecording[];
  getFavorites: () => ReferenceRecording[];
}

// Generate unique ID
const generateId = () => `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useReferenceStore = create<ReferenceStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      recordings: [],
      selectedRecording: null,
      waveformCache: {},
      comparisonSession: null,
      isPlaying: false,
      currentTime: 0,
      playbackSpeed: 1,
      isLooping: false,
      loopStart: 0,
      loopEnd: 0,
      referenceVolume: 0.7,
      userVolume: 0.7,
      isMuted: false,

      // Recording actions
      addRecording: (recording) => {
        const newRecording: ReferenceRecording = {
          ...recording,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        
        set((state) => ({
          recordings: [...state.recordings, newRecording],
        }));
      },

      updateRecording: (id, updates) => {
        set((state) => ({
          recordings: state.recordings.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      deleteRecording: (id) => {
        set((state) => ({
          recordings: state.recordings.filter((r) => r.id !== id),
          selectedRecording: state.selectedRecording?.id === id ? null : state.selectedRecording,
        }));
      },

      selectRecording: (recording) => {
        set({ selectedRecording: recording });
      },

      toggleFavorite: (id) => {
        set((state) => ({
          recordings: state.recordings.map((r) =>
            r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
          ),
        }));
      },

      // Waveform actions
      setWaveformData: (id, data) => {
        set((state) => ({
          waveformCache: { ...state.waveformCache, [id]: data },
        }));
      },

      getWaveformData: (id) => {
        return get().waveformCache[id] || null;
      },

      // Playback actions
      setPlaying: (playing) => set({ isPlaying: playing }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
      setLooping: (looping) => set({ isLooping: looping }),
      setLoopRange: (start, end) => set({ loopStart: start, loopEnd: end }),

      // Volume actions
      setReferenceVolume: (volume) => set({ referenceVolume: volume }),
      setUserVolume: (volume) => set({ userVolume: volume }),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

      // Comparison actions
      startComparison: (referenceId, userAudioData) => {
        const reference = get().recordings.find((r) => r.id === referenceId);
        if (!reference) return;

        const session: ComparisonSession = {
          id: generateId(),
          referenceId,
          userAudioData,
          startTime: 0,
          endTime: reference.duration || 0,
          playbackSpeed: 1,
          createdAt: new Date().toISOString(),
        };

        set({
          comparisonSession: session,
          selectedRecording: reference,
          currentTime: 0,
          playbackSpeed: 1,
        });
      },

      endComparison: () => {
        set({
          comparisonSession: null,
          isPlaying: false,
          currentTime: 0,
        });
      },

      saveComparisonNotes: (notes) => {
        set((state) => ({
          comparisonSession: state.comparisonSession
            ? { ...state.comparisonSession, notes }
            : null,
        }));
      },

      // Search/filter
      searchRecordings: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().recordings.filter(
          (r) =>
            r.title.toLowerCase().includes(lowerQuery) ||
            r.artist.toLowerCase().includes(lowerQuery) ||
            r.pieceName?.toLowerCase().includes(lowerQuery) ||
            r.tags.some((t) => t.toLowerCase().includes(lowerQuery))
        );
      },

      getRecordingsByPiece: (pieceId) => {
        return get().recordings.filter((r) => r.pieceId === pieceId);
      },

      getFavorites: () => {
        return get().recordings.filter((r) => r.isFavorite);
      },
    }),
    {
      name: 'violin-ai-references',
      partialize: (state) => ({
        recordings: state.recordings,
        waveformCache: state.waveformCache,
      }),
    }
  )
);

// Waveform generation utility
export const generateWaveform = async (
  audioData: string | ArrayBuffer,
  numPeaks: number = 200
): Promise<WaveformData> => {
  const audioContext = new AudioContext();
  
  let arrayBuffer: ArrayBuffer;
  if (typeof audioData === 'string') {
    // Convert base64 to ArrayBuffer
    const base64 = audioData.split(',')[1] || audioData;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    arrayBuffer = bytes.buffer;
  } else {
    arrayBuffer = audioData;
  }
  
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0);
  
  const samplesPerPeak = Math.floor(channelData.length / numPeaks);
  const peaks: number[] = [];
  
  for (let i = 0; i < numPeaks; i++) {
    const start = i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, channelData.length);
    
    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    
    peaks.push(max);
  }
  
  audioContext.close();
  
  return {
    peaks,
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
  };
};
