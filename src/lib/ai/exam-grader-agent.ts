'use client';

import type { TechniqueAnalysis } from '@/stores/video-store';

// Exam grade definitions (ABRSM-inspired)
export type ExamGrade = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const GRADE_NAMES: Record<ExamGrade, string> = {
  0: 'Initial',
  1: 'Grade 1',
  2: 'Grade 2',
  3: 'Grade 3',
  4: 'Grade 4',
  5: 'Grade 5',
  6: 'Grade 6',
  7: 'Grade 7',
  8: 'Grade 8',
};

export const GRADE_LEVELS: Record<ExamGrade, string> = {
  0: 'Beginner',
  1: 'Elementary',
  2: 'Elementary+',
  3: 'Intermediate-',
  4: 'Intermediate',
  5: 'Intermediate+',
  6: 'Advanced-',
  7: 'Advanced',
  8: 'Advanced+',
};

// Component types in an exam
export type ExamComponentType = 'scales' | 'piece' | 'sight_reading' | 'aural' | 'technique';

// Result types
export type ExamResult = 'fail' | 'pass' | 'merit' | 'distinction';

export interface ExamComponentConfig {
  type: ExamComponentType;
  title: string;
  maxScore: number;
  weight: number; // Percentage of total score
  description: string;
}

// Exam structure configuration per grade
export const EXAM_STRUCTURE: Record<ExamGrade, ExamComponentConfig[]> = {
  0: [
    { type: 'scales', title: 'Open Strings', maxScore: 20, weight: 0.20, description: 'Play open strings with good tone' },
    { type: 'piece', title: 'Simple Melody', maxScore: 40, weight: 0.40, description: 'Play a simple prepared piece' },
    { type: 'aural', title: 'Rhythm Echo', maxScore: 20, weight: 0.20, description: 'Clap back simple rhythms' },
    { type: 'technique', title: 'Posture Check', maxScore: 20, weight: 0.20, description: 'Demonstrate good violin hold' },
  ],
  1: [
    { type: 'scales', title: 'G Major Scale', maxScore: 20, weight: 0.20, description: 'One octave G major scale' },
    { type: 'piece', title: 'Prepared Piece', maxScore: 35, weight: 0.35, description: 'Grade 1 repertoire piece' },
    { type: 'sight_reading', title: 'Sight Reading', maxScore: 15, weight: 0.15, description: 'Simple melody in first position' },
    { type: 'aural', title: 'Aural Tests', maxScore: 15, weight: 0.15, description: 'Interval and rhythm recognition' },
    { type: 'technique', title: 'Technique Assessment', maxScore: 15, weight: 0.15, description: 'Bow hold and posture' },
  ],
  2: [
    { type: 'scales', title: 'Scales & Arpeggios', maxScore: 20, weight: 0.20, description: 'G, D major scales and arpeggios' },
    { type: 'piece', title: 'Prepared Piece', maxScore: 35, weight: 0.35, description: 'Grade 2 repertoire piece' },
    { type: 'sight_reading', title: 'Sight Reading', maxScore: 15, weight: 0.15, description: 'Melody with basic dynamics' },
    { type: 'aural', title: 'Aural Tests', maxScore: 15, weight: 0.15, description: 'Melodic and rhythmic recognition' },
    { type: 'technique', title: 'Technique Assessment', maxScore: 15, weight: 0.15, description: 'Bow distribution and tone' },
  ],
  3: [
    { type: 'scales', title: 'Scales & Arpeggios', maxScore: 20, weight: 0.20, description: 'Major and minor scales, two octaves' },
    { type: 'piece', title: 'Prepared Piece', maxScore: 35, weight: 0.35, description: 'Grade 3 repertoire with dynamics' },
    { type: 'sight_reading', title: 'Sight Reading', maxScore: 15, weight: 0.15, description: 'Introduction to slurs' },
    { type: 'aural', title: 'Aural Tests', maxScore: 15, weight: 0.15, description: 'Chord recognition and memory' },
    { type: 'technique', title: 'Technique Assessment', maxScore: 15, weight: 0.15, description: 'Shifting preparation' },
  ],
  4: [
    { type: 'scales', title: 'Scales & Arpeggios', maxScore: 20, weight: 0.20, description: 'Three-octave scales, positions 1-3' },
    { type: 'piece', title: 'Prepared Piece', maxScore: 35, weight: 0.35, description: 'Grade 4 repertoire with vibrato' },
    { type: 'sight_reading', title: 'Sight Reading', maxScore: 15, weight: 0.15, description: 'Multiple positions' },
    { type: 'aural', title: 'Aural Tests', maxScore: 15, weight: 0.15, description: 'Modulation and cadences' },
    { type: 'technique', title: 'Technique Assessment', maxScore: 15, weight: 0.15, description: 'Vibrato and shifting' },
  ],
  5: [
    { type: 'scales', title: 'Scales & Arpeggios', maxScore: 20, weight: 0.20, description: 'All keys, three octaves' },
    { type: 'piece', title: 'Prepared Piece', maxScore: 35, weight: 0.35, description: 'Expressive Grade 5 piece' },
    { type: 'sight_reading', title: 'Sight Reading', maxScore: 15, weight: 0.15, description: 'Complex rhythms and keys' },
    { type: 'aural', title: 'Aural Tests', maxScore: 15, weight: 0.15, description: 'Stylistic features' },
    { type: 'technique', title: 'Technique Assessment', maxScore: 15, weight: 0.15, description: 'Expression and control' },
  ],
  6: [
    { type: 'scales', title: 'Scales & Arpeggios', maxScore: 20, weight: 0.20, description: 'Dominant and diminished 7ths' },
    { type: 'piece', title: 'Prepared Piece', maxScore: 35, weight: 0.35, description: 'Advanced repertoire' },
    { type: 'sight_reading', title: 'Sight Reading', maxScore: 15, weight: 0.15, description: 'Double stops introduction' },
    { type: 'aural', title: 'Aural Tests', maxScore: 15, weight: 0.15, description: 'Complex harmonic analysis' },
    { type: 'technique', title: 'Technique Assessment', maxScore: 15, weight: 0.15, description: 'Advanced bow techniques' },
  ],
  7: [
    { type: 'scales', title: 'Scales & Arpeggios', maxScore: 20, weight: 0.20, description: 'Chromatic scales, double stops' },
    { type: 'piece', title: 'Prepared Piece', maxScore: 35, weight: 0.35, description: 'Virtuosic repertoire' },
    { type: 'sight_reading', title: 'Sight Reading', maxScore: 15, weight: 0.15, description: 'Complex passages' },
    { type: 'aural', title: 'Aural Tests', maxScore: 15, weight: 0.15, description: 'Advanced ear training' },
    { type: 'technique', title: 'Technique Assessment', maxScore: 15, weight: 0.15, description: 'Virtuosic techniques' },
  ],
  8: [
    { type: 'scales', title: 'Scales & Arpeggios', maxScore: 20, weight: 0.20, description: 'Concert-level scales' },
    { type: 'piece', title: 'Prepared Piece', maxScore: 35, weight: 0.35, description: 'Concert-level repertoire' },
    { type: 'sight_reading', title: 'Sight Reading', maxScore: 15, weight: 0.15, description: 'Professional sight reading' },
    { type: 'aural', title: 'Aural Tests', maxScore: 15, weight: 0.15, description: 'Professional ear training' },
    { type: 'technique', title: 'Technique Assessment', maxScore: 15, weight: 0.15, description: 'Concert-level technique' },
  ],
};

// Pass thresholds
export const PASS_THRESHOLDS = {
  fail: 0,
  pass: 65,
  merit: 80,
  distinction: 90,
};

// Determine result from score
export const determineResult = (percentage: number): ExamResult => {
  if (percentage >= PASS_THRESHOLDS.distinction) return 'distinction';
  if (percentage >= PASS_THRESHOLDS.merit) return 'merit';
  if (percentage >= PASS_THRESHOLDS.pass) return 'pass';
  return 'fail';
};

// Exam attempt interface
export interface ExamAttempt {
  id: string;
  userId: string;
  grade: ExamGrade;
  status: 'in_progress' | 'completed' | 'graded';
  components: ExamComponentResult[];
  totalScore: number;
  maxScore: number;
  percentage: number;
  result: ExamResult;
  startedAt: Date;
  completedAt?: Date;
}

// Component result interface
export interface ExamComponentResult {
  type: ExamComponentType;
  title: string;
  maxScore: number;
  score: number;
  percentage: number;
  feedback: string;
  details?: ComponentAnalysisDetails;
}

// Analysis details can vary by component type
export interface ComponentAnalysisDetails {
  pitchAccuracy?: number;
  rhythmAccuracy?: number;
  toneQuality?: number;
  dynamics?: number;
  articulation?: number;
  intonation?: number;
  technique?: TechniqueAnalysis;
  auralScore?: {
    intervals: number;
    rhythms: number;
    melodies: number;
    chords: number;
  };
}

// Grade scales for different components
interface GradeRequirements {
  scales: string[];
  tempoRange: [number, number];
  techniques: string[];
  noteRange: { min: string; max: string };
}

export const GRADE_REQUIREMENTS: Record<ExamGrade, GradeRequirements> = {
  0: {
    scales: ['Open strings'],
    tempoRange: [60, 80],
    techniques: ['Whole bows', 'Detaché'],
    noteRange: { min: 'G3', max: 'E4' },
  },
  1: {
    scales: ['G major', 'D major'],
    tempoRange: [70, 90],
    techniques: ['Legato', 'Simple slurs'],
    noteRange: { min: 'G3', max: 'B4' },
  },
  2: {
    scales: ['G major', 'D major', 'A major', 'E minor'],
    tempoRange: [80, 100],
    techniques: ['Slurs', 'Staccato'],
    noteRange: { min: 'G3', max: 'D5' },
  },
  3: {
    scales: ['All major (1 oct)', 'A minor', 'E minor', 'D minor'],
    tempoRange: [90, 110],
    techniques: ['Shifting to 3rd position', 'Dynamics'],
    noteRange: { min: 'G3', max: 'G5' },
  },
  4: {
    scales: ['Major scales (2 oct)', 'Harmonic minor'],
    tempoRange: [100, 120],
    techniques: ['Vibrato', 'Positions 1-3'],
    noteRange: { min: 'G3', max: 'A5' },
  },
  5: {
    scales: ['All major/minor (3 oct)', 'Arpeggios'],
    tempoRange: [110, 130],
    techniques: ['All positions', 'Expressive vibrato'],
    noteRange: { min: 'G3', max: 'C6' },
  },
  6: {
    scales: ['Dominant 7ths', 'Diminished 7ths'],
    tempoRange: [120, 140],
    techniques: ['Double stops', 'Advanced bow techniques'],
    noteRange: { min: 'G3', max: 'E6' },
  },
  7: {
    scales: ['Chromatic', 'Double-stop scales'],
    tempoRange: [130, 150],
    techniques: ['Harmonics', 'Spiccato', 'Ricochet'],
    noteRange: { min: 'G3', max: 'G6' },
  },
  8: {
    scales: ['Concert scales', 'Octaves'],
    tempoRange: [140, 160],
    techniques: ['Full virtuosic repertoire'],
    noteRange: { min: 'G3', max: 'B6' },
  },
};

// Generate exam for a specific grade
export const generateExam = (grade: ExamGrade, userId: string): ExamAttempt => {
  const structure = EXAM_STRUCTURE[grade];
  
  const components: ExamComponentResult[] = structure.map((config) => ({
    type: config.type,
    title: config.title,
    maxScore: config.maxScore,
    score: 0,
    percentage: 0,
    feedback: '',
  }));

  const maxScore = structure.reduce((sum, c) => sum + c.maxScore, 0);

  return {
    id: generateId(),
    userId,
    grade,
    status: 'in_progress',
    components,
    totalScore: 0,
    maxScore,
    percentage: 0,
    result: 'fail',
    startedAt: new Date(),
  };
};

// Grade a single component
export const gradeComponent = (
  type: ExamComponentType,
  grade: ExamGrade,
  performance: {
    pitchAccuracy?: number;
    rhythmAccuracy?: number;
    dynamicsScore?: number;
    phrasingScore?: number;
    techniqueAnalysis?: TechniqueAnalysis;
    auralAnswers?: { correct: number; total: number };
  }
): ExamComponentResult => {
  const config = EXAM_STRUCTURE[grade].find((c) => c.type === type);
  if (!config) {
    throw new Error(`Invalid component type: ${type}`);
  }

  let score = 0;
  let feedback = '';
  const details: ComponentAnalysisDetails = {};

  switch (type) {
    case 'scales':
    case 'piece':
    case 'sight_reading': {
      const pitchAcc = performance.pitchAccuracy ?? 70;
      const rhythmAcc = performance.rhythmAccuracy ?? 70;
      const dynamics = performance.dynamicsScore ?? 70;
      const phrasing = performance.phrasingScore ?? 70;

      details.pitchAccuracy = pitchAcc;
      details.rhythmAccuracy = rhythmAcc;
      details.dynamics = dynamics;

      // Weight: pitch 35%, rhythm 35%, dynamics 15%, phrasing 15%
      const rawScore = (pitchAcc * 0.35 + rhythmAcc * 0.35 + dynamics * 0.15 + phrasing * 0.15);
      score = Math.round((rawScore / 100) * config.maxScore);

      feedback = generateMusicFeedback(pitchAcc, rhythmAcc, dynamics, phrasing, type);
      break;
    }

    case 'technique': {
      if (performance.techniqueAnalysis) {
        details.technique = performance.techniqueAnalysis;
        score = Math.round((performance.techniqueAnalysis.overallScore / 100) * config.maxScore);
        feedback = generateTechniqueFeedback(performance.techniqueAnalysis);
      } else {
        score = Math.round(config.maxScore * 0.7); // Default to 70%
        feedback = 'Technique assessment not available.';
      }
      break;
    }

    case 'aural': {
      if (performance.auralAnswers) {
        const percentage = (performance.auralAnswers.correct / performance.auralAnswers.total) * 100;
        score = Math.round((percentage / 100) * config.maxScore);
        feedback = generateAuralFeedback(percentage);
      } else {
        score = Math.round(config.maxScore * 0.7);
        feedback = 'Aural test results pending.';
      }
      break;
    }
  }

  const percentage = (score / config.maxScore) * 100;

  return {
    type,
    title: config.title,
    maxScore: config.maxScore,
    score,
    percentage: Math.round(percentage),
    feedback,
    details,
  };
};

// Calculate final exam result
export const calculateExamResult = (components: ExamComponentResult[]): {
  totalScore: number;
  maxScore: number;
  percentage: number;
  result: ExamResult;
  overallFeedback: string;
} => {
  const totalScore = components.reduce((sum, c) => sum + c.score, 0);
  const maxScore = components.reduce((sum, c) => sum + c.maxScore, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);
  const result = determineResult(percentage);

  const overallFeedback = generateOverallFeedback(components, percentage, result);

  return {
    totalScore,
    maxScore,
    percentage,
    result,
    overallFeedback,
  };
};

// Generate feedback for music components
const generateMusicFeedback = (
  pitch: number,
  rhythm: number,
  dynamics: number,
  phrasing: number,
  type: string
): string => {
  const parts: string[] = [];

  if (pitch >= 90) parts.push('Excellent intonation throughout.');
  else if (pitch >= 75) parts.push('Good pitch accuracy with minor deviations.');
  else if (pitch >= 60) parts.push('Some pitch accuracy issues need attention.');
  else parts.push('Significant work needed on intonation.');

  if (rhythm >= 90) parts.push('Rock-solid rhythmic accuracy.');
  else if (rhythm >= 75) parts.push('Good rhythmic control overall.');
  else if (rhythm >= 60) parts.push('Some rhythmic inconsistencies noted.');
  else parts.push('Rhythm needs more practice with metronome.');

  if (type !== 'scales') {
    if (dynamics >= 80) parts.push('Beautiful dynamic range and expression.');
    else if (dynamics >= 60) parts.push('Try to incorporate more dynamic contrast.');
    else parts.push('Work on adding dynamics to bring the music to life.');
  }

  return parts.join(' ');
};

// Generate feedback for technique component
const generateTechniqueFeedback = (analysis: TechniqueAnalysis): string => {
  const parts: string[] = [];

  // Posture
  if (analysis.posture.score >= 80) {
    parts.push('Excellent posture maintained throughout.');
  } else if (analysis.posture.score >= 60) {
    parts.push('Good posture overall, with some areas to improve.');
    if (analysis.posture.shoulderTension === 'tense') {
      parts.push('Try to relax your shoulders more.');
    }
  } else {
    parts.push('Posture needs attention.');
    if (analysis.posture.headPosition !== 'correct') {
      parts.push('Keep your head in a more neutral position.');
    }
  }

  // Bow arm
  if (analysis.bowArm.score >= 80) {
    parts.push('Excellent bow control.');
  } else if (analysis.bowArm.bowStraightness < 70) {
    parts.push('Work on keeping the bow straight and parallel to the bridge.');
  }

  // Left hand
  if (analysis.leftHand.score < 70) {
    parts.push('Left hand technique needs practice.');
  }

  return parts.join(' ');
};

// Generate feedback for aural tests
const generateAuralFeedback = (percentage: number): string => {
  if (percentage >= 90) return 'Outstanding ear training skills demonstrated.';
  if (percentage >= 80) return 'Strong aural skills with excellent recognition.';
  if (percentage >= 70) return 'Good aural recognition. Continue practicing ear training.';
  if (percentage >= 60) return 'Satisfactory aural skills. More ear training practice recommended.';
  return 'Aural skills need significant development. Regular ear training exercises recommended.';
};

// Generate overall exam feedback
const generateOverallFeedback = (
  components: ExamComponentResult[],
  percentage: number,
  result: ExamResult
): string => {
  const resultMessages: Record<ExamResult, string> = {
    distinction: 'Congratulations! An outstanding performance demonstrating excellent musicianship.',
    merit: 'Well done! A strong performance showing good musical understanding.',
    pass: 'Congratulations on passing! Continue working on the areas highlighted for improvement.',
    fail: 'Unfortunately, the required standard was not met this time. Focus on the feedback provided and try again.',
  };

  let feedback = resultMessages[result];

  // Find strongest and weakest areas
  const sorted = [...components].sort((a, b) => b.percentage - a.percentage);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  if (strongest.percentage - weakest.percentage > 20) {
    feedback += ` Your strongest area was ${strongest.title.toLowerCase()} (${strongest.percentage}%).`;
    feedback += ` Focus more practice on ${weakest.title.toLowerCase()} (${weakest.percentage}%).`;
  }

  return feedback;
};

// Utility to generate a simple ID
const generateId = (): string => {
  return `exam_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Get recommended grade based on user's level
export const getRecommendedGrade = (userLevel: number): ExamGrade => {
  // Map user level (1-10+) to exam grades (0-8)
  if (userLevel <= 1) return 0;
  if (userLevel <= 2) return 1;
  if (userLevel <= 3) return 2;
  if (userLevel <= 4) return 3;
  if (userLevel <= 5) return 4;
  if (userLevel <= 6) return 5;
  if (userLevel <= 7) return 6;
  if (userLevel <= 8) return 7;
  return 8;
};

// Check if user is ready for an exam grade
export const checkExamReadiness = (
  userLevel: number,
  recentScores: number[],
  grade: ExamGrade
): { ready: boolean; message: string } => {
  const recommendedGrade = getRecommendedGrade(userLevel);
  const avgScore = recentScores.length > 0
    ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    : 0;

  if (grade > recommendedGrade + 1) {
    return {
      ready: false,
      message: `This grade may be too advanced. We recommend starting with ${GRADE_NAMES[recommendedGrade]}.`,
    };
  }

  if (avgScore < 70 && grade > 0) {
    return {
      ready: false,
      message: 'Practice more until you consistently score above 70% before attempting this exam.',
    };
  }

  return {
    ready: true,
    message: `You appear ready for ${GRADE_NAMES[grade]}. Good luck!`,
  };
};
