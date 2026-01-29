import type { ExerciseFocus } from '@/types';

export interface SightReadingExercise {
  id: string;
  musicXML: string;
  difficulty: number;
  features: {
    rhythmComplexity: number; // 1-5
    noteRange: { low: string; high: string };
    accidentals: number;
    keyChanges: boolean;
    timeSignatureChanges: boolean;
  };
  studyTime: number; // seconds to study before playing
  notes: Array<{
    pitch: string;
    duration: number;
    startTime: number;
    frequency: number;
  }>;
}

export interface SightReadingResult {
  exerciseId: string;
  accuracy: number;
  hesitations: number;
  completionTime: number;
  firstAttemptScore: number;
}

export interface SightReadingStats {
  totalAttempts: number;
  averageAccuracy: number;
  currentLevel: number;
  streak: number;
}

// Difficulty parameters for sight-reading
const DIFFICULTY_PARAMS = {
  1: {
    noteRange: { low: 'G3', high: 'D5' },
    rhythms: ['whole', 'half', 'quarter'],
    accidentals: 0,
    measures: 12,
    studyTime: 45,
  },
  2: {
    noteRange: { low: 'G3', high: 'E5' },
    rhythms: ['whole', 'half', 'quarter', 'eighth'],
    accidentals: 1,
    measures: 12,
    studyTime: 40,
  },
  3: {
    noteRange: { low: 'G3', high: 'A5' },
    rhythms: ['half', 'quarter', 'eighth'],
    accidentals: 2,
    measures: 16,
    studyTime: 45,
  },
  4: {
    noteRange: { low: 'G3', high: 'A5' },
    rhythms: ['quarter', 'eighth', 'dotted-quarter'],
    accidentals: 3,
    measures: 16,
    studyTime: 35,
  },
  5: {
    noteRange: { low: 'G3', high: 'D6' },
    rhythms: ['quarter', 'eighth', 'sixteenth', 'dotted-quarter'],
    accidentals: 4,
    measures: 16,
    studyTime: 30,
  },
};

// Simple scale patterns for generating exercises
const SCALE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const KEYS = ['C', 'G', 'D', 'A', 'F', 'Bb', 'Eb'];

// All valid violin notes in chromatic order (G3 to D6 for practical range)
// Violin's lowest note is G3 (open G string), not C3!
const VIOLIN_CHROMATIC_NOTES = [
  // Octave 3 (violin starts at G3, not C3!)
  'G3', 'A3', 'B3',
  // Octave 4 (full octave)
  'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  // Octave 5 (full octave)
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
  // Octave 6 (advanced - up to seventh position)
  'C6', 'D6', 'E6',
];

// Generate a sight-reading exercise
export const generateSightReadingExercise = (
  difficulty: number,
  avoidPatterns?: string[]
): SightReadingExercise => {
  const level = Math.min(5, Math.max(1, difficulty)) as 1 | 2 | 3 | 4 | 5;
  const params = DIFFICULTY_PARAMS[level];
  
  // Select a random key
  const key = KEYS[Math.floor(Math.random() * Math.min(level + 1, KEYS.length))];
  
  // Generate notes
  const notes = generateRandomNotes(params, key);
  
  // Create MusicXML
  const musicXML = createMusicXML(notes, key, params.measures);
  
  return {
    id: `sr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    musicXML,
    difficulty: level,
    features: {
      rhythmComplexity: Math.min(5, level),
      noteRange: params.noteRange,
      accidentals: params.accidentals,
      keyChanges: false,
      timeSignatureChanges: false,
    },
    studyTime: params.studyTime,
    notes,
  };
};

function generateRandomNotes(
  params: typeof DIFFICULTY_PARAMS[1],
  key: string
): SightReadingExercise['notes'] {
  const notes: SightReadingExercise['notes'] = [];
  const beatsPerMeasure = 4;
  const totalBeats = params.measures * beatsPerMeasure;
  
  let currentBeat = 0;
  
  while (currentBeat < totalBeats) {
    // Calculate position within the current measure
    const beatInMeasure = currentBeat % beatsPerMeasure;
    const remainingInMeasure = beatsPerMeasure - beatInMeasure;
    
    // Filter rhythms to only those that fit within the current measure
    const validRhythms = params.rhythms.filter(
      (r) => rhythmToDuration(r) <= remainingInMeasure
    );
    
    let duration: number;
    
    if (validRhythms.length > 0) {
      // Pick a random rhythm from valid options
      const rhythm = validRhythms[Math.floor(Math.random() * validRhythms.length)];
      duration = rhythmToDuration(rhythm);
    } else {
      // No rhythm fits - use the largest duration that fits the remaining space
      // This handles edge cases like 0.5 beats remaining
      duration = findLargestFittingDuration(remainingInMeasure);
    }
    
    // Pick a random note within range
    const pitch = getRandomPitch(params.noteRange, key);
    
    notes.push({
      pitch,
      duration,
      startTime: currentBeat,
      frequency: pitchToFrequency(pitch),
    });
    
    currentBeat += duration;
  }
  
  return notes;
}

function findLargestFittingDuration(remainingBeats: number): number {
  // Available durations in descending order
  const allDurations = [4, 3, 2, 1.5, 1, 0.5, 0.25];
  
  for (const dur of allDurations) {
    if (dur <= remainingBeats) {
      return dur;
    }
  }
  
  // Fallback to smallest duration
  return 0.25;
}

function rhythmToDuration(rhythm: string): number {
  const durations: Record<string, number> = {
    'whole': 4,
    'half': 2,
    'quarter': 1,
    'eighth': 0.5,
    'sixteenth': 0.25,
    'dotted-quarter': 1.5,
    'dotted-half': 3,
  };
  return durations[rhythm] || 1;
}

// Get scale notes for a given key (diatonic notes only)
function getScaleNotes(key: string): string[] {
  const scales: Record<string, string[]> = {
    'C':  ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    'G':  ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
    'D':  ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
    'A':  ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
    'F':  ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
    'Bb': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
    'Eb': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
  };
  return scales[key] || scales['C'];
}

function getRandomPitch(range: { low: string; high: string }, key: string): string {
  // Get indices for the range boundaries in the chromatic note array
  const lowIndex = VIOLIN_CHROMATIC_NOTES.indexOf(range.low);
  const highIndex = VIOLIN_CHROMATIC_NOTES.indexOf(range.high);
  
  // Handle invalid ranges by defaulting to full range
  const effectiveLowIndex = lowIndex >= 0 ? lowIndex : 0;
  const effectiveHighIndex = highIndex >= 0 ? highIndex : VIOLIN_CHROMATIC_NOTES.length - 1;
  
  // Get notes within the valid range
  const notesInRange = VIOLIN_CHROMATIC_NOTES.slice(effectiveLowIndex, effectiveHighIndex + 1);
  
  // Filter notes to only those that belong to the key's scale
  const scaleNotes = getScaleNotes(key);
  const validNotes = notesInRange.filter((note) => {
    const noteName = note.replace(/[0-9]/g, '');
    return scaleNotes.includes(noteName);
  });
  
  // If no valid notes found (shouldn't happen), fall back to notes in range
  if (validNotes.length === 0) {
    return notesInRange[Math.floor(Math.random() * notesInRange.length)];
  }
  
  // Pick a random note from valid options
  return validNotes[Math.floor(Math.random() * validNotes.length)];
}

function pitchToFrequency(pitch: string): number {
  // Base frequencies for octave 4 (A4 = 440 Hz standard)
  // Includes sharps and flats (enharmonic equivalents)
  const noteFreqs: Record<string, number> = {
    'C': 261.63, 'C#': 277.18, 'Db': 277.18,
    'D': 293.66, 'D#': 311.13, 'Eb': 311.13,
    'E': 329.63,
    'F': 349.23, 'F#': 369.99, 'Gb': 369.99,
    'G': 392.00, 'G#': 415.30, 'Ab': 415.30,
    'A': 440.00, 'A#': 466.16, 'Bb': 466.16,
    'B': 493.88,
  };
  
  // Extract note name (may include # or b) and octave
  const noteName = pitch.replace(/[0-9]/g, '');
  const octave = parseInt(pitch.slice(-1)) || 4;
  const baseFreq = noteFreqs[noteName] || 440;
  
  return baseFreq * Math.pow(2, octave - 4);
}

function createMusicXML(
  notes: SightReadingExercise['notes'],
  key: string,
  measures: number
): string {
  const divisions = 4; // divisions per quarter note
  const beatsPerMeasure = 4;
  
  // Build measures content
  let allMeasures = '';
  
  for (let measureNum = 1; measureNum <= measures; measureNum++) {
    // Get notes for this measure
    const measureStartBeat = (measureNum - 1) * beatsPerMeasure;
    const measureEndBeat = measureNum * beatsPerMeasure;
    const measureNotes = notes.filter(
      (n) => n.startTime >= measureStartBeat && n.startTime < measureEndBeat
    );
    
    // Build notes XML for this measure
    let notesXML = '';
    for (const note of measureNotes) {
      const duration = Math.round(note.duration * divisions);
      const type = durationToType(note.duration);
      const step = note.pitch.replace(/[0-9]/g, '').charAt(0);
      const octave = note.pitch.slice(-1);
      
      notesXML += `
        <note>
          <pitch>
            <step>${step}</step>
            <octave>${octave}</octave>
          </pitch>
          <duration>${duration}</duration>
          <type>${type}</type>
        </note>`;
    }
    
    // First measure includes attributes
    if (measureNum === 1) {
      allMeasures += `
    <measure number="1">
      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>${getKeyFifths(key)}</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>${notesXML}
    </measure>`;
    } else {
      allMeasures += `
    <measure number="${measureNum}">${notesXML}
    </measure>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>Sight-Reading Exercise</work-title>
  </work>
  <part-list>
    <score-part id="P1">
      <part-name>Violin</part-name>
    </score-part>
  </part-list>
  <part id="P1">${allMeasures}
  </part>
</score-partwise>`;
}

function durationToType(duration: number): string {
  if (duration >= 4) return 'whole';
  if (duration >= 2) return 'half';
  if (duration >= 1) return 'quarter';
  if (duration >= 0.5) return 'eighth';
  return 'sixteenth';
}

function getKeyFifths(key: string): number {
  const fifths: Record<string, number> = {
    'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5,
    'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4,
  };
  return fifths[key] || 0;
}

// Calculate sight-reading score
export const calculateSightReadingScore = (
  expectedNotes: SightReadingExercise['notes'],
  accuracy: number,
  hesitations: number,
  completionTime: number,
  studyTime: number
): number => {
  let score = accuracy;
  
  // Penalize hesitations
  score -= hesitations * 5;
  
  // Bonus for quick completion (relative to study time)
  if (completionTime < studyTime * 2) {
    score += 5;
  }
  
  return Math.max(0, Math.min(100, score));
};

// Suggest next difficulty based on performance
export const suggestNextDifficulty = (
  currentDifficulty: number,
  recentScores: number[]
): number => {
  if (recentScores.length < 3) return currentDifficulty;
  
  const avgScore = recentScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
  
  if (avgScore >= 85 && currentDifficulty < 5) {
    return currentDifficulty + 1;
  } else if (avgScore < 60 && currentDifficulty > 1) {
    return currentDifficulty - 1;
  }
  
  return currentDifficulty;
};
