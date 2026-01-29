'use client';

import type { ExamGrade } from './exam-grader-agent';

// Aural test types
export type AuralTestType = 'interval' | 'rhythm' | 'melody' | 'chord' | 'pitch_matching';

export interface AuralTest {
  id: string;
  type: AuralTestType;
  grade: ExamGrade;
  question: string;
  options: AuralOption[];
  correctAnswerIndex: number;
  audioSequence: AudioSequence;
  points: number;
}

export interface AuralOption {
  id: string;
  label: string;
  value: string;
}

export interface AudioSequence {
  notes: AudioNote[];
  tempo: number;
  instrument?: string;
}

export interface AudioNote {
  pitch: string; // e.g., 'C4', 'G#5'
  duration: number; // in beats
  velocity?: number; // 0-127
}

// Musical intervals
const INTERVALS = {
  unison: { semitones: 0, name: 'Unison' },
  minor2nd: { semitones: 1, name: 'Minor 2nd' },
  major2nd: { semitones: 2, name: 'Major 2nd' },
  minor3rd: { semitones: 3, name: 'Minor 3rd' },
  major3rd: { semitones: 4, name: 'Major 3rd' },
  perfect4th: { semitones: 5, name: 'Perfect 4th' },
  tritone: { semitones: 6, name: 'Tritone' },
  perfect5th: { semitones: 7, name: 'Perfect 5th' },
  minor6th: { semitones: 8, name: 'Minor 6th' },
  major6th: { semitones: 9, name: 'Major 6th' },
  minor7th: { semitones: 10, name: 'Minor 7th' },
  major7th: { semitones: 11, name: 'Major 7th' },
  octave: { semitones: 12, name: 'Octave' },
};

// Intervals introduced at each grade
const GRADE_INTERVALS: Record<ExamGrade, string[]> = {
  0: ['unison', 'octave'],
  1: ['major2nd', 'major3rd', 'perfect5th'],
  2: ['minor2nd', 'minor3rd', 'perfect4th'],
  3: ['major6th', 'minor6th'],
  4: ['major7th', 'minor7th'],
  5: ['tritone'],
  6: ['minor2nd', 'major2nd', 'minor3rd', 'major3rd', 'perfect4th', 'tritone', 'perfect5th', 'minor6th', 'major6th', 'minor7th', 'major7th', 'octave'],
  7: ['minor2nd', 'major2nd', 'minor3rd', 'major3rd', 'perfect4th', 'tritone', 'perfect5th', 'minor6th', 'major6th', 'minor7th', 'major7th', 'octave'],
  8: ['minor2nd', 'major2nd', 'minor3rd', 'major3rd', 'perfect4th', 'tritone', 'perfect5th', 'minor6th', 'major6th', 'minor7th', 'major7th', 'octave'],
};

// Get all intervals up to a grade
const getIntervalsForGrade = (grade: ExamGrade): string[] => {
  const allIntervals = new Set<string>();
  for (let g = 0; g <= grade; g++) {
    GRADE_INTERVALS[g as ExamGrade].forEach((i) => allIntervals.add(i));
  }
  return Array.from(allIntervals);
};

// Chord types
const CHORDS = {
  major: { name: 'Major', intervals: [0, 4, 7] },
  minor: { name: 'Minor', intervals: [0, 3, 7] },
  diminished: { name: 'Diminished', intervals: [0, 3, 6] },
  augmented: { name: 'Augmented', intervals: [0, 4, 8] },
  dominant7: { name: 'Dominant 7th', intervals: [0, 4, 7, 10] },
  major7: { name: 'Major 7th', intervals: [0, 4, 7, 11] },
  minor7: { name: 'Minor 7th', intervals: [0, 3, 7, 10] },
};

// Chords by grade
const GRADE_CHORDS: Record<ExamGrade, string[]> = {
  0: [],
  1: ['major', 'minor'],
  2: ['major', 'minor'],
  3: ['major', 'minor', 'diminished'],
  4: ['major', 'minor', 'diminished', 'augmented'],
  5: ['major', 'minor', 'diminished', 'augmented', 'dominant7'],
  6: ['major', 'minor', 'diminished', 'augmented', 'dominant7', 'major7', 'minor7'],
  7: ['major', 'minor', 'diminished', 'augmented', 'dominant7', 'major7', 'minor7'],
  8: ['major', 'minor', 'diminished', 'augmented', 'dominant7', 'major7', 'minor7'],
};

// Note names for pitch conversion
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Convert note name to MIDI number
const noteToMidi = (note: string): number => {
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return 60; // Default to middle C
  
  const [, name, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const noteIndex = NOTE_NAMES.indexOf(name);
  
  return (octave + 1) * 12 + noteIndex;
};

// Convert MIDI number to note name
const midiToNote = (midi: number): string => {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
};

// Generate a random note within a range
const randomNote = (minMidi: number, maxMidi: number): string => {
  const midi = minMidi + Math.floor(Math.random() * (maxMidi - minMidi + 1));
  return midiToNote(midi);
};

// Rhythm patterns by difficulty
const RHYTHM_PATTERNS: Record<number, number[][]> = {
  // Grade 0-1: Simple patterns (quarter notes)
  1: [
    [1, 1, 1, 1],
    [2, 1, 1],
    [1, 1, 2],
    [2, 2],
  ],
  // Grade 2-3: Add eighth notes
  2: [
    [0.5, 0.5, 1, 1, 1],
    [1, 0.5, 0.5, 1, 1],
    [1, 1, 0.5, 0.5, 1],
    [0.5, 0.5, 0.5, 0.5, 1, 1],
  ],
  // Grade 4-5: Add dotted rhythms and syncopation
  3: [
    [1.5, 0.5, 1, 1],
    [0.5, 1.5, 1, 1],
    [1, 0.5, 0.5, 0.5, 0.5, 1],
    [0.5, 1, 0.5, 1, 1],
  ],
  // Grade 6-8: Complex patterns
  4: [
    [0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 1, 1],
    [1.5, 0.25, 0.25, 0.5, 0.5, 1],
    [0.5, 0.25, 0.25, 1, 0.5, 0.5, 1],
    [0.75, 0.25, 0.5, 0.5, 1, 1],
  ],
};

// Get rhythm difficulty level from grade
const getRhythmDifficulty = (grade: ExamGrade): number => {
  if (grade <= 1) return 1;
  if (grade <= 3) return 2;
  if (grade <= 5) return 3;
  return 4;
};

// Generate interval test
export const generateIntervalTest = (grade: ExamGrade): AuralTest => {
  const availableIntervals = getIntervalsForGrade(grade);
  const intervalKey = availableIntervals[Math.floor(Math.random() * availableIntervals.length)];
  const interval = INTERVALS[intervalKey as keyof typeof INTERVALS];

  // Random root note in violin range
  const rootMidi = 55 + Math.floor(Math.random() * 20); // G3 to D5
  const rootNote = midiToNote(rootMidi);
  const secondNote = midiToNote(rootMidi + interval.semitones);

  // Generate wrong answer options
  const wrongIntervals = availableIntervals
    .filter((i) => i !== intervalKey)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const options: AuralOption[] = [
    { id: intervalKey, label: interval.name, value: intervalKey },
    ...wrongIntervals.map((i) => ({
      id: i,
      label: INTERVALS[i as keyof typeof INTERVALS].name,
      value: i,
    })),
  ].sort(() => Math.random() - 0.5);

  const correctAnswerIndex = options.findIndex((o) => o.id === intervalKey);

  return {
    id: generateId(),
    type: 'interval',
    grade,
    question: 'Identify this interval:',
    options,
    correctAnswerIndex,
    audioSequence: {
      notes: [
        { pitch: rootNote, duration: 1 },
        { pitch: secondNote, duration: 1 },
      ],
      tempo: 60,
    },
    points: grade >= 5 ? 3 : grade >= 3 ? 2 : 1,
  };
};

// Generate rhythm test
export const generateRhythmTest = (grade: ExamGrade): AuralTest => {
  const difficulty = getRhythmDifficulty(grade);
  const patterns = RHYTHM_PATTERNS[difficulty];
  const correctPattern = patterns[Math.floor(Math.random() * patterns.length)];

  // Generate similar but different patterns for wrong answers
  const wrongPatterns: number[][] = [];
  while (wrongPatterns.length < 3) {
    const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
    const modified = [...randomPattern];
    // Slightly modify the pattern
    if (modified.length > 2) {
      const swapIdx = Math.floor(Math.random() * (modified.length - 1));
      [modified[swapIdx], modified[swapIdx + 1]] = [modified[swapIdx + 1], modified[swapIdx]];
    }
    const patternStr = modified.join(',');
    if (patternStr !== correctPattern.join(',') && !wrongPatterns.some((p) => p.join(',') === patternStr)) {
      wrongPatterns.push(modified);
    }
  }

  // Format patterns as readable strings
  const formatPattern = (pattern: number[]): string => {
    return pattern.map((d) => {
      if (d === 0.25) return '♬';
      if (d === 0.5) return '♪';
      if (d === 0.75) return '♪.';
      if (d === 1) return '♩';
      if (d === 1.5) return '♩.';
      if (d === 2) return '𝅗𝅥';
      return String(d);
    }).join(' ');
  };

  const correctLabel = formatPattern(correctPattern);
  const options: AuralOption[] = [
    { id: 'correct', label: correctLabel, value: correctPattern.join(',') },
    ...wrongPatterns.map((p, i) => ({
      id: `wrong${i}`,
      label: formatPattern(p),
      value: p.join(','),
    })),
  ].sort(() => Math.random() - 0.5);

  const correctAnswerIndex = options.findIndex((o) => o.id === 'correct');

  // Convert pattern to audio notes (using a single pitch for rhythm)
  const pitch = 'A4';
  const audioNotes: AudioNote[] = correctPattern.map((duration) => ({
    pitch,
    duration,
    velocity: 100,
  }));

  return {
    id: generateId(),
    type: 'rhythm',
    grade,
    question: 'Which rhythm pattern did you hear?',
    options,
    correctAnswerIndex,
    audioSequence: {
      notes: audioNotes,
      tempo: grade >= 4 ? 100 : 80,
    },
    points: difficulty,
  };
};

// Generate melody recognition test
export const generateMelodyTest = (grade: ExamGrade): AuralTest => {
  const numNotes = grade <= 2 ? 4 : grade <= 5 ? 6 : 8;
  const tempo = grade <= 3 ? 80 : 100;

  // Generate a simple melody
  const rootMidi = 60; // Middle C
  const scale = [0, 2, 4, 5, 7, 9, 11, 12]; // Major scale intervals

  const melody: number[] = [0]; // Start on root
  for (let i = 1; i < numNotes; i++) {
    const prevNote = melody[i - 1];
    const possibleMoves = scale.filter(
      (n) => Math.abs(n - prevNote) <= 4 && n >= 0 && n <= 12
    );
    const nextNote = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    melody.push(nextNote);
  }

  // Generate wrong melodies (variations)
  const wrongMelodies: number[][] = [];
  for (let w = 0; w < 3; w++) {
    const wrong = [...melody];
    // Change 1-2 notes
    const changeCount = 1 + Math.floor(Math.random() * 2);
    for (let c = 0; c < changeCount; c++) {
      const idx = 1 + Math.floor(Math.random() * (wrong.length - 1));
      const current = wrong[idx];
      const alternatives = scale.filter((n) => n !== current && Math.abs(n - current) <= 4);
      if (alternatives.length > 0) {
        wrong[idx] = alternatives[Math.floor(Math.random() * alternatives.length)];
      }
    }
    wrongMelodies.push(wrong);
  }

  // Convert to note names for display
  const melodyToString = (m: number[]): string => {
    return m.map((n) => {
      const noteNames = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti', 'Do\''];
      const scaleIdx = scale.indexOf(n);
      return scaleIdx >= 0 ? noteNames[scaleIdx] : '?';
    }).join(' ');
  };

  const options: AuralOption[] = [
    { id: 'correct', label: melodyToString(melody), value: melody.join(',') },
    ...wrongMelodies.map((m, i) => ({
      id: `wrong${i}`,
      label: melodyToString(m),
      value: m.join(','),
    })),
  ].sort(() => Math.random() - 0.5);

  const correctAnswerIndex = options.findIndex((o) => o.id === 'correct');

  // Convert to audio notes
  const audioNotes: AudioNote[] = melody.map((interval) => ({
    pitch: midiToNote(rootMidi + interval),
    duration: 1,
    velocity: 80,
  }));

  return {
    id: generateId(),
    type: 'melody',
    grade,
    question: 'Identify the melody you heard:',
    options,
    correctAnswerIndex,
    audioSequence: {
      notes: audioNotes,
      tempo,
    },
    points: numNotes >= 6 ? 3 : 2,
  };
};

// Generate chord identification test
export const generateChordTest = (grade: ExamGrade): AuralTest => {
  const availableChords = GRADE_CHORDS[grade];
  if (availableChords.length === 0) {
    // Fall back to interval test for early grades
    return generateIntervalTest(grade);
  }

  const chordKey = availableChords[Math.floor(Math.random() * availableChords.length)];
  const chord = CHORDS[chordKey as keyof typeof CHORDS];

  // Random root note
  const rootMidi = 48 + Math.floor(Math.random() * 12); // C3 to B3
  const rootNote = midiToNote(rootMidi);

  // Generate wrong answer options
  const wrongChords = availableChords
    .filter((c) => c !== chordKey)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const options: AuralOption[] = [
    { id: chordKey, label: chord.name, value: chordKey },
    ...wrongChords.map((c) => ({
      id: c,
      label: CHORDS[c as keyof typeof CHORDS].name,
      value: c,
    })),
  ].sort(() => Math.random() - 0.5);

  const correctAnswerIndex = options.findIndex((o) => o.id === chordKey);

  // Create chord notes
  const audioNotes: AudioNote[] = chord.intervals.map((interval) => ({
    pitch: midiToNote(rootMidi + interval),
    duration: 2,
    velocity: 80,
  }));

  return {
    id: generateId(),
    type: 'chord',
    grade,
    question: 'Identify this chord:',
    options,
    correctAnswerIndex,
    audioSequence: {
      notes: audioNotes,
      tempo: 60,
    },
    points: chord.intervals.length > 3 ? 3 : 2,
  };
};

// Generate a full set of aural tests for an exam
export interface AuralTestSet {
  tests: AuralTest[];
  totalPoints: number;
}

export const generateAuralTestSet = (grade: ExamGrade): AuralTestSet => {
  const tests: AuralTest[] = [];

  // Number and types of tests based on grade
  if (grade <= 1) {
    tests.push(generateIntervalTest(grade));
    tests.push(generateIntervalTest(grade));
    tests.push(generateRhythmTest(grade));
  } else if (grade <= 3) {
    tests.push(generateIntervalTest(grade));
    tests.push(generateRhythmTest(grade));
    tests.push(generateMelodyTest(grade));
    tests.push(generateChordTest(grade));
  } else if (grade <= 5) {
    tests.push(generateIntervalTest(grade));
    tests.push(generateIntervalTest(grade));
    tests.push(generateRhythmTest(grade));
    tests.push(generateMelodyTest(grade));
    tests.push(generateChordTest(grade));
  } else {
    // Grades 6-8: Full range of tests
    tests.push(generateIntervalTest(grade));
    tests.push(generateIntervalTest(grade));
    tests.push(generateRhythmTest(grade));
    tests.push(generateRhythmTest(grade));
    tests.push(generateMelodyTest(grade));
    tests.push(generateChordTest(grade));
  }

  const totalPoints = tests.reduce((sum, t) => sum + t.points, 0);

  return { tests, totalPoints };
};

// Score an aural test set
export const scoreAuralTests = (
  tests: AuralTest[],
  answers: number[]
): { correct: number; total: number; points: number; maxPoints: number } => {
  let correct = 0;
  let points = 0;
  let maxPoints = 0;

  for (let i = 0; i < tests.length; i++) {
    maxPoints += tests[i].points;
    if (answers[i] === tests[i].correctAnswerIndex) {
      correct++;
      points += tests[i].points;
    }
  }

  return {
    correct,
    total: tests.length,
    points,
    maxPoints,
  };
};

// Utility to generate ID
const generateId = (): string => {
  return `aural_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Playback configuration for audio synthesis
export interface PlaybackConfig {
  instrument: 'piano' | 'violin' | 'synth';
  volume: number;
  playTogether: boolean; // For chords
}

// Default playback configuration
export const DEFAULT_PLAYBACK: PlaybackConfig = {
  instrument: 'piano',
  volume: 0.7,
  playTogether: false,
};
