// Types for Piece Upload and AI Analysis Feature

import { Exercise, Note } from './index';

// Challenge severity levels
export type ChallengeSeverity = 'minor' | 'moderate' | 'significant';

// Challenge categories
export type ChallengeCategory = 'technique' | 'intonation' | 'bowing' | 'rhythm' | 'mixed';

// Technical challenge types
export type TechniqueChallengeType =
  | 'position_shift'
  | 'string_crossing'
  | 'double_stop'
  | 'chord'
  | 'vibrato'
  | 'trill'
  | 'mordent'
  | 'turn'
  | 'fast_passage'
  | 'wide_interval'
  | 'harmonic'
  | 'pizzicato'
  | 'col_legno'
  | 'sul_ponticello'
  | 'sul_tasto'
  | 'glissando'
  | 'portamento';

// Bowing technique types
export type BowingTechniqueType =
  | 'detache'
  | 'legato'
  | 'staccato'
  | 'spiccato'
  | 'martele'
  | 'ricochet'
  | 'tremolo'
  | 'col_legno'
  | 'sautille'
  | 'flying_staccato'
  | 'hooked_bowing'
  | 'slur'
  | 'string_crossing';

// Individual challenge within a section
export interface Challenge {
  type: TechniqueChallengeType | BowingTechniqueType | string;
  description: string;
  measureNumbers: number[];
  severity: ChallengeSeverity;
  specificNotes?: string[]; // e.g., ["m.5 beat 2: G#5", "m.7 beat 1: A5"]
}

// Measure range for a section
export interface MeasureRange {
  start: number;
  end: number;
}

// A difficult section identified in the piece
export interface DifficultSection {
  id: string;
  measureRange: MeasureRange;
  difficultyScore: number; // 1-10
  category: ChallengeCategory;
  challenges: Challenge[];
  suggestions: string[];
  practiceExercise?: Exercise;
  musicXMLFragment?: string; // MusicXML for just this section
}

// Summary of techniques required in the piece
export interface TechniqueSummary {
  positions: number[]; // e.g., [1, 3, 5] for 1st, 3rd, 5th positions
  highestPosition: number;
  stringsCovered: ('G' | 'D' | 'A' | 'E')[];
  requiredTechniques: TechniqueChallengeType[];
  bowingTechniques: BowingTechniqueType[];
  dynamicRange: { min: string; max: string }; // e.g., "pp" to "ff"
  tempoChanges: boolean;
  keyChanges: boolean;
  meterChanges: boolean;
}

// Practice plan item
export interface PracticePlanItem {
  id: string;
  sectionId: string;
  description: string;
  duration: number; // suggested minutes
  priority: 'high' | 'medium' | 'low';
  focusAreas: string[];
  tips: string[];
}

// Overall practice plan for the piece
export interface PracticePlan {
  totalEstimatedTime: number; // minutes
  items: PracticePlanItem[];
  warmUpSuggestions: string[];
  dailyPracticeOrder: string[]; // section IDs in recommended practice order
}

// Section structure in the piece (musical form)
export interface PieceSection {
  name: string; // e.g., "Introduction", "Theme A", "Development"
  measureRange: MeasureRange;
  keySignature?: string;
  tempo?: number;
  character?: string; // e.g., "Allegro vivace", "Cantabile"
}

// Full piece analysis result
export interface PieceAnalysis {
  id: string;
  title: string;
  composer?: string;
  opus?: string;
  movement?: string;
  overallDifficulty: number; // 1-10
  gradeLevel?: string; // e.g., "ABRSM Grade 6", "RCM Level 8"
  keySignature: string;
  timeSignature: string;
  tempo?: number;
  totalMeasures: number;
  estimatedDuration?: number; // seconds
  structure: PieceSection[];
  difficultSections: DifficultSection[];
  techniqueSummary: TechniqueSummary;
  practicePlan: PracticePlan;
  musicXML?: string;
  analyzedAt: number;
}

// Request to analyze a piece
export interface AnalyzePieceRequest {
  file: File;
}

// Response from piece analysis API
export interface AnalyzePieceResponse {
  analysis: PieceAnalysis;
}

// Vision API extracted music data (for PDF/image processing)
export interface ExtractedMusicData {
  title?: string;
  composer?: string;
  keySignature?: string;
  timeSignature?: string;
  tempo?: number;
  measures: ExtractedMeasure[];
  articulations: string[];
  dynamics: string[];
  technicalMarkings: string[];
}

// Extracted measure from vision API
export interface ExtractedMeasure {
  measureNumber: number;
  notes: ExtractedNote[];
  dynamics?: string;
  articulations?: string[];
  bowings?: string[];
  tempoChange?: number;
  keyChange?: string;
}

// Extracted note from vision API
export interface ExtractedNote {
  pitch: string; // e.g., "A4", "G#5"
  duration: string; // e.g., "quarter", "eighth", "half"
  articulation?: string;
  dynamic?: string;
  fingering?: string;
  bowing?: string; // up-bow, down-bow
  string?: string; // G, D, A, E
  position?: number;
}

// Intonation-specific analysis
export interface IntonationAnalysis {
  problematicIntervals: {
    interval: string; // e.g., "minor 2nd", "augmented 4th"
    measureNumbers: number[];
    notes: string[];
    suggestion: string;
  }[];
  positionShifts: {
    fromPosition: number;
    toPosition: number;
    measureNumber: number;
    notes: string[];
    suggestion: string;
  }[];
  doubleStops: {
    interval: string;
    measureNumber: number;
    notes: string[];
    intonationTip: string;
  }[];
  enharmonicAwareness: {
    note: string;
    context: string;
    measureNumber: number;
    suggestion: string;
  }[];
}

// Bowing-specific analysis
export interface BowingAnalysis {
  bowStrokes: {
    type: BowingTechniqueType;
    measureNumbers: number[];
    count: number;
  }[];
  stringCrossings: {
    strings: string; // e.g., "G-D", "A-E"
    measureNumbers: number[];
    difficulty: ChallengeSeverity;
    suggestion: string;
  }[];
  bowDistribution: {
    measureRange: MeasureRange;
    challenge: string;
    suggestion: string;
  }[];
  dynamics: {
    marking: string;
    measureNumber: number;
    bowingConsideration: string;
  }[];
}

// Technical analysis result
export interface TechnicalAnalysis {
  overallTechnicalDifficulty: number;
  leftHandChallenges: Challenge[];
  rightHandChallenges: Challenge[];
  coordinationChallenges: Challenge[];
  expressionChallenges: Challenge[];
  recommendations: string[];
}

// Upload status tracking
export interface UploadStatus {
  state: 'idle' | 'uploading' | 'processing' | 'analyzing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  error?: string;
}

// Practiced section tracking
export interface PracticedSection {
  sectionId: string;
  practicedAt: number;
  duration: number; // minutes
  notes?: string;
  selfRating?: number; // 1-5
}

// Saved piece with practice history
export interface SavedPiece {
  id: string;
  analysis: PieceAnalysis;
  uploadedAt: number;
  lastPracticedAt?: number;
  totalPracticeTime: number; // minutes
  practicedSections: PracticedSection[];
  personalNotes?: string;
  isFavorite: boolean;
}
