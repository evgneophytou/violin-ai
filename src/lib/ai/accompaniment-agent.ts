import type { Note } from '@/types';

export type AccompanimentStyle = 'classical' | 'jazz' | 'pop' | 'minimal';

export interface ChordEvent {
  time: number; // in beats
  duration: number;
  chord: string; // e.g., "Cmaj", "Am7"
  notes: string[]; // e.g., ["C3", "E3", "G3"]
  velocity: number;
}

export interface AccompanimentRequest {
  melody: Note[];
  key: string;
  style: AccompanimentStyle;
  tempo: number;
}

export interface GeneratedAccompaniment {
  chords: ChordEvent[];
  style: AccompanimentStyle;
  key: string;
  tempo: number;
}

// Chord definitions
const CHORD_NOTES: Record<string, number[]> = {
  'maj': [0, 4, 7],      // Root, major 3rd, perfect 5th
  'min': [0, 3, 7],      // Root, minor 3rd, perfect 5th
  'dim': [0, 3, 6],      // Root, minor 3rd, diminished 5th
  'aug': [0, 4, 8],      // Root, major 3rd, augmented 5th
  '7': [0, 4, 7, 10],    // Dominant 7th
  'maj7': [0, 4, 7, 11], // Major 7th
  'min7': [0, 3, 7, 10], // Minor 7th
};

// Scale degrees to chord quality (in major key)
const DIATONIC_CHORDS: Record<number, string> = {
  0: 'maj',  // I
  1: 'min',  // ii
  2: 'min',  // iii
  3: 'maj',  // IV
  4: 'maj',  // V (or 7)
  5: 'min',  // vi
  6: 'dim',  // vii°
};

// Common chord progressions
const PROGRESSIONS: Record<AccompanimentStyle, number[][]> = {
  classical: [
    [0, 3, 4, 0],     // I-IV-V-I
    [0, 5, 3, 4],     // I-vi-IV-V
    [0, 4, 5, 3, 0],  // I-V-vi-IV-I
  ],
  jazz: [
    [0, 5, 1, 4],     // I-vi-ii-V
    [0, 6, 1, 4],     // I-vii-ii-V
    [0, 3, 1, 4, 0],  // I-IV-ii-V-I
  ],
  pop: [
    [0, 4, 5, 3],     // I-V-vi-IV (very common)
    [0, 3, 4, 0],     // I-IV-V-I
    [5, 3, 0, 4],     // vi-IV-I-V
  ],
  minimal: [
    [0, 3],           // I-IV
    [0, 4],           // I-V
    [0, 5],           // I-vi
  ],
};

// Note names to semitones from C
const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

const SEMITONE_TO_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Generate accompaniment for a melody
export const generateAccompaniment = (
  request: AccompanimentRequest
): GeneratedAccompaniment => {
  const { melody, key, style, tempo } = request;
  
  // Get key root
  const keyRoot = NOTE_TO_SEMITONE[key.replace(/m$/, '')] || 0;
  const isMinor = key.endsWith('m');
  
  // Calculate total duration
  const totalBeats = melody.length > 0
    ? melody[melody.length - 1].startTime + melody[melody.length - 1].duration
    : 16;
  
  // Select a progression for the style
  const progressions = PROGRESSIONS[style];
  const progression = progressions[Math.floor(Math.random() * progressions.length)];
  
  // Generate chords based on style
  const chords: ChordEvent[] = [];
  const beatsPerChord = getBeatsPerChord(style, totalBeats);
  
  let currentBeat = 0;
  let progressionIndex = 0;
  
  while (currentBeat < totalBeats) {
    const degree = progression[progressionIndex % progression.length];
    const chordQuality = isMinor ? getMinorChordQuality(degree) : DIATONIC_CHORDS[degree];
    const chordRoot = (keyRoot + getScaleDegreeOffset(degree, isMinor)) % 12;
    
    const chord = createChord(chordRoot, chordQuality, style);
    
    chords.push({
      time: currentBeat,
      duration: beatsPerChord,
      chord: `${SEMITONE_TO_NOTE[chordRoot]}${chordQuality}`,
      notes: chord,
      velocity: getChordVelocity(style, progressionIndex),
    });
    
    currentBeat += beatsPerChord;
    progressionIndex++;
  }
  
  return {
    chords,
    style,
    key,
    tempo,
  };
};

function getBeatsPerChord(style: AccompanimentStyle, totalBeats: number): number {
  switch (style) {
    case 'classical':
      return Math.min(4, totalBeats / 4);
    case 'jazz':
      return 2; // More frequent chord changes
    case 'pop':
      return 4;
    case 'minimal':
      return Math.min(8, totalBeats / 2);
    default:
      return 4;
  }
}

function getMinorChordQuality(degree: number): string {
  // Natural minor chord qualities
  const minorChords: Record<number, string> = {
    0: 'min', // i
    1: 'dim', // ii°
    2: 'maj', // III
    3: 'min', // iv
    4: 'min', // v (or maj for harmonic minor)
    5: 'maj', // VI
    6: 'maj', // VII
  };
  return minorChords[degree] || 'min';
}

function getScaleDegreeOffset(degree: number, isMinor: boolean): number {
  // Major scale intervals: W W H W W W H (in semitones: 0, 2, 4, 5, 7, 9, 11)
  const majorOffsets = [0, 2, 4, 5, 7, 9, 11];
  // Natural minor: W H W W H W W (in semitones: 0, 2, 3, 5, 7, 8, 10)
  const minorOffsets = [0, 2, 3, 5, 7, 8, 10];
  
  const offsets = isMinor ? minorOffsets : majorOffsets;
  return offsets[degree % 7];
}

function createChord(root: number, quality: string, style: AccompanimentStyle): string[] {
  const intervals = CHORD_NOTES[quality] || CHORD_NOTES['maj'];
  const octave = style === 'minimal' ? 3 : 2; // Lower octave for fuller sound
  
  return intervals.map((interval) => {
    const note = (root + interval) % 12;
    const noteOctave = octave + Math.floor((root + interval) / 12);
    return `${SEMITONE_TO_NOTE[note]}${noteOctave}`;
  });
}

function getChordVelocity(style: AccompanimentStyle, index: number): number {
  switch (style) {
    case 'classical':
      // Accent on beat 1
      return index % 4 === 0 ? 80 : 60;
    case 'jazz':
      // Varied dynamics
      return 50 + Math.random() * 30;
    case 'pop':
      return 70;
    case 'minimal':
      return 50;
    default:
      return 70;
  }
}

// Get chord name from notes
export const getChordName = (notes: string[]): string => {
  if (notes.length === 0) return '';
  
  // Simple chord detection (just return the bass note + type for now)
  const bassNote = notes[0].replace(/[0-9]/g, '');
  return bassNote;
};

// Style descriptions for UI
export const STYLE_DESCRIPTIONS: Record<AccompanimentStyle, { name: string; description: string }> = {
  classical: {
    name: 'Classical',
    description: 'Block chords with traditional progressions',
  },
  jazz: {
    name: 'Jazz',
    description: 'Seventh chords with jazzy voicings',
  },
  pop: {
    name: 'Pop',
    description: 'Modern chord progressions',
  },
  minimal: {
    name: 'Minimal',
    description: 'Sparse, simple accompaniment',
  },
};
