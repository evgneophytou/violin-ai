// Core types for Violin AI application

// Re-export piece analysis types
export * from './piece-analysis';

export interface Note {
  pitch: string; // e.g., "A4", "G#5"
  frequency: number; // Hz
  duration: number; // in beats
  startTime: number; // in beats
  velocity?: number; // 0-127
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface PitchAnalysis {
  accuracy: number; // 0-100%
  sharpNotes: Note[];
  flatNotes: Note[];
  averageDeviation: number; // in cents
  suggestions: string[];
}

export interface RhythmAnalysis {
  accuracy: number; // 0-100%
  rushingTendency: boolean;
  draggingTendency: boolean;
  problemAreas: TimeRange[];
  tempoConsistency: number; // 0-100%
  suggestions: string[];
}

export interface DynamicsAnalysis {
  followedMarkings: boolean;
  dynamicRange: { min: number; max: number };
  crescendoControl: number; // 0-100%
  diminuendoControl: number; // 0-100%
  suggestions: string[];
}

export interface PhrasingAnalysis {
  breathMarks: boolean;
  musicalLine: string;
  legato: number; // 0-100%
  articulation: number; // 0-100%
  suggestions: string[];
}

export interface PerformanceAnalysis {
  pitch: PitchAnalysis;
  rhythm: RhythmAnalysis;
  dynamics: DynamicsAnalysis;
  phrasing: PhrasingAnalysis;
  overallScore: number; // 0-100
  encouragement: string;
  nextFocus: string;
  timestamp: number;
}

export interface ExerciseMetadata {
  id: string;
  title: string;
  difficulty: number; // 1-10
  focus: ExerciseFocus;
  key: string;
  timeSignature: string;
  tempo: number;
  measures: number;
  noteRange: { low: string; high: string };
  techniques: string[];
}

export type ExerciseFocus = 'scales' | 'arpeggios' | 'bowing' | 'intonation' | 'rhythm' | 'mixed';

export interface Exercise {
  metadata: ExerciseMetadata;
  musicXML: string;
  notes: Note[];
}

export interface SessionState {
  currentExercise: Exercise | null;
  difficulty: number;
  performanceHistory: PerformanceAnalysis[];
  isRecording: boolean;
  isPlaying: boolean;
  isAnalyzing: boolean;
  currentPitch: DetectedPitch | null;
  audioContext: AudioContext | null;
}

export interface DetectedPitch {
  frequency: number;
  note: string;
  octave: number;
  cents: number; // deviation from perfect pitch
  clarity: number; // 0-1 confidence
}

export interface GenerateExerciseRequest {
  difficulty: number;
  focus: ExerciseFocus;
  key?: string;
  timeSignature?: string;
  previousFeedback?: PerformanceAnalysis;
}

export interface GenerateExerciseResponse {
  exercise: Exercise;
}

export interface AnalyzePerformanceRequest {
  audioBlob: Blob;
  expectedNotes: Note[];
  exerciseMetadata: ExerciseMetadata;
}

export interface AnalyzePerformanceResponse {
  analysis: PerformanceAnalysis;
}

export interface DifficultyAdjustment {
  newDifficulty: number;
  reason: string;
  focusAreas: ExerciseFocus[];
}

// Slow Practice Mode Types
export interface LoopConfig {
  startMeasure: number;
  endMeasure: number;
  startNoteIndex: number;
  endNoteIndex: number;
  enabled: boolean;
}

export interface SlowPracticeConfig {
  tempoPercent: number; // 25-100
  loop: LoopConfig | null;
  autoIncrease: boolean;
  increaseAmount: number; // percentage to increase each loop (e.g., 5)
  targetTempoPercent: number; // target tempo to reach
}

export interface SlowPracticeState {
  config: SlowPracticeConfig;
  currentLoopCount: number;
  isSlowPracticeMode: boolean;
}

// Practice Coach Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface CoachContext {
  currentExercise?: ExerciseMetadata;
  recentPerformance?: PerformanceAnalysis;
  userLevel: number;
  practiceHistory?: { focus: string; avgScore: number }[];
}

export interface PracticeCoachRequest {
  message: string;
  context: CoachContext;
  conversationHistory: ChatMessage[];
}

export interface PracticeCoachResponse {
  message: string;
}

// Recording Studio Types
export interface Recording {
  id: string;
  title: string;
  audioData: string; // Base64 or blob URL
  duration: number; // seconds
  exerciseId?: string;
  exerciseTitle?: string;
  createdAt: number;
  notes?: string;
  tags?: string[];
  isFavorite?: boolean;
}

export interface RecordingTake {
  id: string;
  audioBlob: Blob;
  audioUrl: string;
  duration: number;
  timestamp: number;
}

export interface StudioState {
  isRecording: boolean;
  currentTake: RecordingTake | null;
  takes: RecordingTake[];
  savedRecordings: Recording[];
  selectedRecordingId: string | null;
}

// Journal Types
export interface JournalEntry {
  id: string;
  date: number;
  content: string;
  mood?: number; // 1-5
  energy?: number; // 1-5
  goals?: string[];
  recordingIds?: string[];
  practiceMinutes?: number;
  aiSummary?: string;
  createdAt: number;
  updatedAt: number;
}

// Music Theory Types
export type TheoryTopic = 'scales' | 'intervals' | 'keys' | 'rhythm' | 'dynamics' | 'articulation' | 'chords';

export interface TheoryLesson {
  id: string;
  topic: TheoryTopic;
  title: string;
  content: string;
  examples: TheoryExample[];
  keyTakeaways: string[];
  relatedTopics: TheoryTopic[];
}

export interface TheoryExample {
  description: string;
  notation?: string; // Simple text notation (e.g., "C D E F G A B C")
  audioDescription?: string;
}

export interface TheoryQuiz {
  id: string;
  topic: TheoryTopic;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: number; // 1-3
}

export interface TheoryProgress {
  topicsCompleted: TheoryTopic[];
  quizzesCompleted: number;
  quizzesCorrect: number;
  currentStreak: number;
}
