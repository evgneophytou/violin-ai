// Technique Analysis Agent - Analyzes technical challenges in violin pieces

import type {
  TechnicalAnalysis,
  Challenge,
  ExtractedMusicData,
  TechniqueChallengeType,
  ChallengeSeverity,
} from '@/types/piece-analysis';
import type { Note } from '@/types';

// Note frequency lookup for position estimation
const NOTE_FREQUENCIES: Record<string, number> = {
  'G3': 196, 'G#3': 207.65, 'Ab3': 207.65, 'A3': 220, 'A#3': 233.08, 'Bb3': 233.08,
  'B3': 246.94, 'C4': 261.63, 'C#4': 277.18, 'Db4': 277.18, 'D4': 293.66,
  'D#4': 311.13, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99,
  'Gb4': 369.99, 'G4': 392, 'G#4': 415.30, 'Ab4': 415.30, 'A4': 440,
  'A#4': 466.16, 'Bb4': 466.16, 'B4': 493.88, 'C5': 523.25, 'C#5': 554.37,
  'Db5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'Eb5': 622.25, 'E5': 659.25,
  'F5': 698.46, 'F#5': 739.99, 'Gb5': 739.99, 'G5': 783.99, 'G#5': 830.61,
  'Ab5': 830.61, 'A5': 880, 'A#5': 932.33, 'Bb5': 932.33, 'B5': 987.77,
  'C6': 1046.50, 'C#6': 1108.73, 'Db6': 1108.73, 'D6': 1174.66, 'D#6': 1244.51,
  'Eb6': 1244.51, 'E6': 1318.51, 'F6': 1396.91, 'F#6': 1479.98, 'Gb6': 1479.98,
  'G6': 1567.98, 'G#6': 1661.22, 'Ab6': 1661.22, 'A6': 1760, 'A#6': 1864.66,
  'Bb6': 1864.66, 'B6': 1975.53, 'C7': 2093,
};

// Position boundaries on violin (approximate frequencies for each string)
const POSITION_BOUNDARIES = {
  // G string positions
  G_1st: { min: 196, max: 293 },   // G3 to D4
  G_3rd: { min: 261, max: 370 },   // C4 to F#4
  G_5th: { min: 329, max: 440 },   // E4 to A4
  // D string positions
  D_1st: { min: 293, max: 440 },   // D4 to A4
  D_3rd: { min: 370, max: 523 },   // F#4 to C5
  D_5th: { min: 440, max: 622 },   // A4 to Eb5
  // A string positions
  A_1st: { min: 440, max: 659 },   // A4 to E5
  A_3rd: { min: 523, max: 784 },   // C5 to G5
  A_5th: { min: 659, max: 932 },   // E5 to Bb5
  // E string positions
  E_1st: { min: 659, max: 988 },   // E5 to B5
  E_3rd: { min: 784, max: 1175 },  // G5 to D6
  E_5th: { min: 932, max: 1397 },  // Bb5 to F6
  E_7th: { min: 1175, max: 1760 }, // D6 to A6
};

// Generate prompt for Gemini to analyze technical challenges
export const generateTechniqueAnalysisPrompt = (
  musicData: ExtractedMusicData | string,
  isRawMusicXML: boolean = false
): string => {
  const dataDescription = isRawMusicXML
    ? `The following is MusicXML data:\n\n${musicData}`
    : `The following is extracted music data:\n\n${JSON.stringify(musicData, null, 2)}`;

  return `You are an expert violin teacher analyzing technical challenges in a piece. Focus on LEFT HAND technique.

${dataDescription}

Analyze and identify:

1. LEFT HAND CHALLENGES:
   - Position shifts (identify measure numbers and positions involved)
   - Extension/contraction requirements
   - Double stops (thirds, sixths, octaves, tenths)
   - Chords (3 or 4 note)
   - Fast finger patterns
   - Wide intervals requiring stretches
   - Chromatic passages
   - Trills and ornaments

2. COORDINATION CHALLENGES:
   - Passages requiring left-right hand synchronization
   - Rapid string crossings with finger changes
   - Shifting while bowing changes

3. EXPRESSION CHALLENGES:
   - Vibrato requirements
   - Dynamic control passages
   - Tempo flexibility sections

For each challenge, rate severity:
- minor: Most intermediate players can handle
- moderate: Requires focused practice
- significant: Advanced technique required

Respond in JSON:
{
  "overallTechnicalDifficulty": number (1-10),
  "leftHandChallenges": [
    {
      "type": "position_shift|double_stop|chord|fast_passage|wide_interval|trill|chromatic|extension",
      "description": "string",
      "measureNumbers": [number],
      "severity": "minor|moderate|significant",
      "specificNotes": ["m.X: note description"]
    }
  ],
  "coordinationChallenges": [
    {
      "type": "string_crossing|shift_bow_change|rapid_alternation",
      "description": "string",
      "measureNumbers": [number],
      "severity": "minor|moderate|significant"
    }
  ],
  "expressionChallenges": [
    {
      "type": "vibrato|dynamics|rubato",
      "description": "string",
      "measureNumbers": [number],
      "severity": "minor|moderate|significant"
    }
  ],
  "recommendations": ["string"]
}`;
};

// Parse technique analysis response
export const parseTechniqueAnalysisResponse = (response: string): TechnicalAnalysis | null => {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const mapChallenges = (challenges: Array<{
      type?: string;
      description?: string;
      measureNumbers?: number[];
      severity?: string;
      specificNotes?: string[];
    }> | undefined): Challenge[] => {
      return (challenges || []).map((c) => ({
        type: c.type || 'general',
        description: c.description || 'Technical challenge',
        measureNumbers: c.measureNumbers || [],
        severity: (c.severity as ChallengeSeverity) || 'moderate',
        specificNotes: c.specificNotes,
      }));
    };

    return {
      overallTechnicalDifficulty: parsed.overallTechnicalDifficulty || 5,
      leftHandChallenges: mapChallenges(parsed.leftHandChallenges),
      rightHandChallenges: [], // Will be filled by bowing agent
      coordinationChallenges: mapChallenges(parsed.coordinationChallenges),
      expressionChallenges: mapChallenges(parsed.expressionChallenges),
      recommendations: parsed.recommendations || [],
    };
  } catch (error) {
    console.error('Error parsing technique analysis response:', error);
    return null;
  }
};

// Estimate position from frequency
const estimatePosition = (frequency: number): number => {
  if (frequency < 330) return 1;
  if (frequency < 440) return 1;
  if (frequency < 587) return 3;
  if (frequency < 784) return 3;
  if (frequency < 988) return 5;
  if (frequency < 1175) return 5;
  if (frequency < 1397) return 7;
  return 7;
};

// Detect position shifts between consecutive notes
const detectPositionShifts = (notes: Note[]): Challenge[] => {
  const challenges: Challenge[] = [];
  const shiftGroups: Map<string, number[]> = new Map();

  for (let i = 1; i < notes.length; i++) {
    const prevPos = estimatePosition(notes[i - 1].frequency);
    const currPos = estimatePosition(notes[i].frequency);

    if (Math.abs(currPos - prevPos) >= 2) {
      const shiftKey = `${prevPos}-${currPos}`;
      const measureNum = Math.floor(notes[i].startTime / 4) + 1;

      if (!shiftGroups.has(shiftKey)) {
        shiftGroups.set(shiftKey, []);
      }
      shiftGroups.get(shiftKey)!.push(measureNum);
    }
  }

  shiftGroups.forEach((measures, shiftKey) => {
    const [from, to] = shiftKey.split('-').map(Number);
    const distance = Math.abs(to - from);
    const severity: ChallengeSeverity = distance >= 4 ? 'significant' : distance >= 2 ? 'moderate' : 'minor';

    challenges.push({
      type: 'position_shift' as TechniqueChallengeType,
      description: `Shift from ${from}${getOrdinalSuffix(from)} to ${to}${getOrdinalSuffix(to)} position`,
      measureNumbers: [...new Set(measures)].sort((a, b) => a - b),
      severity,
    });
  });

  return challenges;
};

// Get ordinal suffix (1st, 2nd, 3rd, etc.)
const getOrdinalSuffix = (n: number): string => {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
};

// Detect wide intervals
const detectWideIntervals = (notes: Note[]): Challenge[] => {
  const challenges: Challenge[] = [];
  const wideIntervalMeasures: number[] = [];

  for (let i = 1; i < notes.length; i++) {
    const interval = Math.abs(notes[i].frequency - notes[i - 1].frequency);
    const ratio = notes[i].frequency / notes[i - 1].frequency;

    // Detect intervals wider than a perfect fifth (ratio > 1.5)
    if (ratio > 1.5 || ratio < 0.67) {
      const measureNum = Math.floor(notes[i].startTime / 4) + 1;
      wideIntervalMeasures.push(measureNum);
    }
  }

  if (wideIntervalMeasures.length > 0) {
    challenges.push({
      type: 'wide_interval' as TechniqueChallengeType,
      description: 'Large intervals requiring position shift or string crossing',
      measureNumbers: [...new Set(wideIntervalMeasures)].sort((a, b) => a - b),
      severity: wideIntervalMeasures.length > 5 ? 'significant' : 'moderate',
    });
  }

  return challenges;
};

// Detect fast passages
const detectFastPassages = (notes: Note[], tempo: number = 100): Challenge[] => {
  const challenges: Challenge[] = [];
  const fastMeasures: number[] = [];

  // Consider notes faster than sixteenth notes at tempo as "fast"
  const fastThreshold = 60 / tempo / 4; // Duration of sixteenth note in beats

  let consecutiveFast = 0;
  let fastStartMeasure = 0;

  for (let i = 0; i < notes.length; i++) {
    if (notes[i].duration <= fastThreshold) {
      if (consecutiveFast === 0) {
        fastStartMeasure = Math.floor(notes[i].startTime / 4) + 1;
      }
      consecutiveFast++;
    } else {
      if (consecutiveFast >= 4) {
        for (let m = fastStartMeasure; m <= Math.floor(notes[i - 1].startTime / 4) + 1; m++) {
          fastMeasures.push(m);
        }
      }
      consecutiveFast = 0;
    }
  }

  // Handle case where piece ends with fast passage
  if (consecutiveFast >= 4) {
    for (let m = fastStartMeasure; m <= Math.floor(notes[notes.length - 1].startTime / 4) + 1; m++) {
      fastMeasures.push(m);
    }
  }

  if (fastMeasures.length > 0) {
    challenges.push({
      type: 'fast_passage' as TechniqueChallengeType,
      description: 'Rapid note sequence requiring agile finger work',
      measureNumbers: [...new Set(fastMeasures)].sort((a, b) => a - b),
      severity: fastMeasures.length > 8 ? 'significant' : 'moderate',
    });
  }

  return challenges;
};

// Detect potential double stops (notes very close in time)
const detectDoubleStops = (notes: Note[]): Challenge[] => {
  const challenges: Challenge[] = [];
  const doubleStopMeasures: number[] = [];

  for (let i = 1; i < notes.length; i++) {
    // Notes starting within 0.1 beats of each other are likely simultaneous
    if (Math.abs(notes[i].startTime - notes[i - 1].startTime) < 0.1) {
      const measureNum = Math.floor(notes[i].startTime / 4) + 1;
      doubleStopMeasures.push(measureNum);
    }
  }

  if (doubleStopMeasures.length > 0) {
    challenges.push({
      type: 'double_stop' as TechniqueChallengeType,
      description: 'Double stops requiring finger independence and intonation control',
      measureNumbers: [...new Set(doubleStopMeasures)].sort((a, b) => a - b),
      severity: doubleStopMeasures.length > 5 ? 'significant' : 'moderate',
    });
  }

  return challenges;
};

// Generate local/fallback technical analysis
export const generateLocalTechniqueAnalysis = (
  notes: Note[],
  tempo: number = 100
): TechnicalAnalysis => {
  const leftHandChallenges: Challenge[] = [
    ...detectPositionShifts(notes),
    ...detectWideIntervals(notes),
    ...detectFastPassages(notes, tempo),
    ...detectDoubleStops(notes),
  ];

  // Calculate overall difficulty
  let difficulty = 3; // Base

  const significantCount = leftHandChallenges.filter((c) => c.severity === 'significant').length;
  const moderateCount = leftHandChallenges.filter((c) => c.severity === 'moderate').length;

  difficulty += significantCount * 2;
  difficulty += moderateCount * 0.5;
  difficulty = Math.min(10, Math.max(1, Math.round(difficulty)));

  // Generate recommendations
  const recommendations: string[] = [];

  if (leftHandChallenges.some((c) => c.type === 'position_shift')) {
    recommendations.push('Practice shifting exercises (Sevcik Op. 8 or Yost shifting studies)');
  }
  if (leftHandChallenges.some((c) => c.type === 'fast_passage')) {
    recommendations.push('Use dotted rhythms and varied rhythmic patterns to build finger agility');
  }
  if (leftHandChallenges.some((c) => c.type === 'double_stop')) {
    recommendations.push('Practice scales in thirds and sixths for double stop preparation');
  }
  if (leftHandChallenges.some((c) => c.type === 'wide_interval')) {
    recommendations.push('Work on finger independence with Schradieck exercises');
  }

  if (recommendations.length === 0) {
    recommendations.push('Focus on clean intonation with a tuner');
    recommendations.push('Practice with a metronome for rhythmic precision');
  }

  return {
    overallTechnicalDifficulty: difficulty,
    leftHandChallenges,
    rightHandChallenges: [], // Filled by bowing agent
    coordinationChallenges: [],
    expressionChallenges: [],
    recommendations,
  };
};
