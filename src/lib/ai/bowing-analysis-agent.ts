// Bowing Analysis Agent - Analyzes bowing patterns and right-hand technique

import type {
  BowingAnalysis,
  Challenge,
  ExtractedMusicData,
  BowingTechniqueType,
  ChallengeSeverity,
  MeasureRange,
} from '@/types/piece-analysis';
import type { Note } from '@/types';

// Generate prompt for Gemini to analyze bowing challenges
export const generateBowingAnalysisPrompt = (
  musicData: ExtractedMusicData | string,
  isRawMusicXML: boolean = false
): string => {
  const dataDescription = isRawMusicXML
    ? `The following is MusicXML data:\n\n${musicData}`
    : `The following is extracted music data:\n\n${JSON.stringify(musicData, null, 2)}`;

  return `You are an expert violin teacher analyzing BOWING and RIGHT HAND technique requirements.

${dataDescription}

Analyze and identify:

1. BOW STROKES REQUIRED:
   - Détaché (separate bows)
   - Legato (smooth connected)
   - Staccato (short, separated)
   - Spiccato (bouncing off string)
   - Martelé (hammered, accented)
   - Ricochet (bouncing multiple notes)
   - Tremolo (rapid repetition)
   - Sautillé (fast controlled bounce)
   - Flying staccato (up-bow staccato)
   - Hooked bowing (multiple notes, same direction)
   - Col legno (with wood of bow)

2. STRING CROSSINGS:
   - Adjacent string crossings (G-D, D-A, A-E)
   - Skip string crossings (G-A, D-E, G-E)
   - Rapid string crossings
   - Arpeggiated patterns

3. BOW DISTRIBUTION CHALLENGES:
   - Long sustained notes requiring bow control
   - Phrases requiring bow planning
   - Dynamic changes requiring bow speed/pressure changes

4. DYNAMIC REQUIREMENTS:
   - Specific dynamic markings and their bowing implications
   - Crescendo/diminuendo bow technique

For each challenge, provide:
- Type of technique
- Measure numbers where it appears
- Difficulty rating (minor/moderate/significant)
- Specific suggestions

Respond in JSON:
{
  "bowStrokes": [
    {
      "type": "detache|legato|staccato|spiccato|martele|ricochet|tremolo|sautille|flying_staccato|hooked_bowing|col_legno",
      "measureNumbers": [number],
      "count": number
    }
  ],
  "stringCrossings": [
    {
      "strings": "string (e.g., 'G-D', 'D-E', 'G-A-E')",
      "measureNumbers": [number],
      "difficulty": "minor|moderate|significant",
      "suggestion": "string"
    }
  ],
  "bowDistribution": [
    {
      "measureRange": { "start": number, "end": number },
      "challenge": "string",
      "suggestion": "string"
    }
  ],
  "dynamics": [
    {
      "marking": "string (pp, p, mp, mf, f, ff, cresc, dim)",
      "measureNumber": number,
      "bowingConsideration": "string"
    }
  ],
  "rightHandChallenges": [
    {
      "type": "string",
      "description": "string",
      "measureNumbers": [number],
      "severity": "minor|moderate|significant"
    }
  ],
  "recommendations": ["string"]
}`;
};

// Parse bowing analysis response
export const parseBowingAnalysisResponse = (response: string): BowingAnalysis | null => {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      bowStrokes: (parsed.bowStrokes || []).map((bs: {
        type?: string;
        measureNumbers?: number[];
        count?: number;
      }) => ({
        type: (bs.type as BowingTechniqueType) || 'detache',
        measureNumbers: bs.measureNumbers || [],
        count: bs.count || 1,
      })),
      stringCrossings: (parsed.stringCrossings || []).map((sc: {
        strings?: string;
        measureNumbers?: number[];
        difficulty?: string;
        suggestion?: string;
      }) => ({
        strings: sc.strings || 'G-D',
        measureNumbers: sc.measureNumbers || [],
        difficulty: (sc.difficulty as ChallengeSeverity) || 'moderate',
        suggestion: sc.suggestion || '',
      })),
      bowDistribution: (parsed.bowDistribution || []).map((bd: {
        measureRange?: { start?: number; end?: number };
        challenge?: string;
        suggestion?: string;
      }) => ({
        measureRange: {
          start: bd.measureRange?.start ?? 1,
          end: bd.measureRange?.end ?? 4,
        },
        challenge: bd.challenge || '',
        suggestion: bd.suggestion || '',
      })),
      dynamics: (parsed.dynamics || []).map((d: {
        marking?: string;
        measureNumber?: number;
        bowingConsideration?: string;
      }) => ({
        marking: d.marking || 'mf',
        measureNumber: d.measureNumber || 1,
        bowingConsideration: d.bowingConsideration || '',
      })),
    };
  } catch (error) {
    console.error('Error parsing bowing analysis response:', error);
    return null;
  }
};

// Violin string frequency ranges
const STRING_RANGES = {
  G: { min: 196, max: 440 },   // G3 to A4
  D: { min: 293, max: 659 },   // D4 to E5
  A: { min: 440, max: 988 },   // A4 to B5
  E: { min: 659, max: 2093 },  // E5 to C7
};

// Determine which string a note is likely played on
const determineString = (frequency: number): string => {
  // Prefer lower strings when possible (more common in violin technique)
  if (frequency >= STRING_RANGES.G.min && frequency <= STRING_RANGES.G.max) {
    return 'G';
  }
  if (frequency >= STRING_RANGES.D.min && frequency <= STRING_RANGES.D.max) {
    // If it could be on G string, might be G string in lower positions
    if (frequency < 350) return 'G';
    return 'D';
  }
  if (frequency >= STRING_RANGES.A.min && frequency <= STRING_RANGES.A.max) {
    // Could be D or A string
    if (frequency < 550) return 'D';
    return 'A';
  }
  if (frequency >= STRING_RANGES.E.min) {
    // Could be A or E string
    if (frequency < 800) return 'A';
    return 'E';
  }
  return 'D'; // Default
};

// Detect string crossings
const detectStringCrossings = (notes: Note[]): BowingAnalysis['stringCrossings'] => {
  const crossings: Map<string, { measures: number[]; isSkip: boolean }> = new Map();

  for (let i = 1; i < notes.length; i++) {
    const prevString = determineString(notes[i - 1].frequency);
    const currString = determineString(notes[i].frequency);

    if (prevString !== currString) {
      const crossingKey = `${prevString}-${currString}`;
      const measureNum = Math.floor(notes[i].startTime / 4) + 1;

      // Check if it's a skip string crossing
      const stringOrder = ['G', 'D', 'A', 'E'];
      const prevIndex = stringOrder.indexOf(prevString);
      const currIndex = stringOrder.indexOf(currString);
      const isSkip = Math.abs(currIndex - prevIndex) > 1;

      if (!crossings.has(crossingKey)) {
        crossings.set(crossingKey, { measures: [], isSkip });
      }
      crossings.get(crossingKey)!.measures.push(measureNum);
    }
  }

  const result: BowingAnalysis['stringCrossings'] = [];

  crossings.forEach((data, key) => {
    const uniqueMeasures = [...new Set(data.measures)].sort((a, b) => a - b);
    const difficulty: ChallengeSeverity = data.isSkip
      ? 'significant'
      : uniqueMeasures.length > 10
        ? 'moderate'
        : 'minor';

    const suggestion = data.isSkip
      ? 'Practice skip string crossings slowly, focusing on arm level changes'
      : 'Keep arm level changes smooth, minimize extraneous motion';

    result.push({
      strings: key,
      measureNumbers: uniqueMeasures,
      difficulty,
      suggestion,
    });
  });

  return result;
};

// Detect bow strokes based on note patterns
const detectBowStrokes = (notes: Note[]): BowingAnalysis['bowStrokes'] => {
  const strokes: Map<BowingTechniqueType, number[]> = new Map();

  // Initialize with detache (most common)
  strokes.set('detache', []);

  let consecutiveShortNotes = 0;
  let consecutiveLongNotes = 0;
  let slurredNotes = 0;

  for (let i = 0; i < notes.length; i++) {
    const measureNum = Math.floor(notes[i].startTime / 4) + 1;

    // Short notes (eighth notes or faster at moderate tempo)
    if (notes[i].duration <= 0.5) {
      consecutiveShortNotes++;
      consecutiveLongNotes = 0;

      // Very short notes might indicate staccato or spiccato
      if (notes[i].duration <= 0.25) {
        if (!strokes.has('staccato')) strokes.set('staccato', []);
        strokes.get('staccato')!.push(measureNum);
      }

      // Many consecutive short notes might indicate spiccato
      if (consecutiveShortNotes >= 8) {
        if (!strokes.has('spiccato')) strokes.set('spiccato', []);
        strokes.get('spiccato')!.push(measureNum);
      }
    } else {
      consecutiveLongNotes++;
      consecutiveShortNotes = 0;

      // Long notes indicate legato or sustained bowing
      if (notes[i].duration >= 2) {
        if (!strokes.has('legato')) strokes.set('legato', []);
        strokes.get('legato')!.push(measureNum);
      }
    }

    // Add to detache (general separate bow strokes)
    strokes.get('detache')!.push(measureNum);
  }

  const result: BowingAnalysis['bowStrokes'] = [];

  strokes.forEach((measures, type) => {
    const uniqueMeasures = [...new Set(measures)].sort((a, b) => a - b);
    result.push({
      type,
      measureNumbers: uniqueMeasures,
      count: measures.length,
    });
  });

  return result;
};

// Detect bow distribution challenges
const detectBowDistribution = (notes: Note[]): BowingAnalysis['bowDistribution'] => {
  const challenges: BowingAnalysis['bowDistribution'] = [];

  // Find long notes or phrases that need bow planning
  let phraseStart = 0;
  let phraseDuration = 0;

  for (let i = 0; i < notes.length; i++) {
    phraseDuration += notes[i].duration;

    // Check for phrase breaks (rests or long notes followed by short)
    const isBreak =
      i === notes.length - 1 ||
      notes[i].duration >= 2 ||
      (notes[i].duration >= 1 && i + 1 < notes.length && notes[i + 1].duration < 0.5);

    if (isBreak && phraseDuration >= 4) {
      const startMeasure = Math.floor(notes[phraseStart].startTime / 4) + 1;
      const endMeasure = Math.floor(notes[i].startTime / 4) + 1;

      if (endMeasure - startMeasure >= 2) {
        challenges.push({
          measureRange: { start: startMeasure, end: endMeasure },
          challenge: 'Long phrase requiring bow distribution planning',
          suggestion: 'Plan bow usage - consider where to use more or less bow',
        });
      }

      phraseStart = i + 1;
      phraseDuration = 0;
    }
  }

  // Find sustained notes
  for (const note of notes) {
    if (note.duration >= 4) {
      const measureNum = Math.floor(note.startTime / 4) + 1;
      challenges.push({
        measureRange: { start: measureNum, end: measureNum },
        challenge: 'Sustained note requiring controlled bow speed',
        suggestion: 'Use slow, even bow speed with consistent contact point',
      });
    }
  }

  return challenges;
};

// Generate right-hand challenges from bowing analysis
export const generateRightHandChallenges = (
  bowingAnalysis: BowingAnalysis
): Challenge[] => {
  const challenges: Challenge[] = [];

  // Add string crossing challenges
  const difficultCrossings = bowingAnalysis.stringCrossings.filter(
    (sc) => sc.difficulty !== 'minor'
  );

  for (const crossing of difficultCrossings) {
    challenges.push({
      type: 'string_crossing' as BowingTechniqueType,
      description: `${crossing.strings} string crossing: ${crossing.suggestion}`,
      measureNumbers: crossing.measureNumbers,
      severity: crossing.difficulty,
    });
  }

  // Add bow technique challenges
  const advancedStrokes = bowingAnalysis.bowStrokes.filter(
    (bs) => ['spiccato', 'sautille', 'ricochet', 'flying_staccato', 'martele'].includes(bs.type)
  );

  for (const stroke of advancedStrokes) {
    challenges.push({
      type: stroke.type,
      description: `${stroke.type.replace('_', ' ')} bowing technique required`,
      measureNumbers: stroke.measureNumbers,
      severity: stroke.count > 10 ? 'significant' : 'moderate',
    });
  }

  // Add bow distribution challenges
  for (const dist of bowingAnalysis.bowDistribution) {
    challenges.push({
      type: 'legato',
      description: dist.challenge,
      measureNumbers: [dist.measureRange.start, dist.measureRange.end],
      severity: 'moderate',
    });
  }

  return challenges;
};

// Generate local/fallback bowing analysis
export const generateLocalBowingAnalysis = (notes: Note[]): BowingAnalysis => {
  return {
    bowStrokes: detectBowStrokes(notes),
    stringCrossings: detectStringCrossings(notes),
    bowDistribution: detectBowDistribution(notes),
    dynamics: [], // Would need dynamic markings from MusicXML
  };
};

// Generate bowing recommendations
export const generateBowingRecommendations = (analysis: BowingAnalysis): string[] => {
  const recommendations: string[] = [];

  // Check for challenging string crossings
  const skipCrossings = analysis.stringCrossings.filter((sc) => sc.difficulty === 'significant');
  if (skipCrossings.length > 0) {
    recommendations.push('Practice Kreutzer Etude #13 or similar for string crossing fluency');
  }

  // Check for spiccato/off-string strokes
  const offStringStrokes = analysis.bowStrokes.filter((bs) =>
    ['spiccato', 'sautille', 'ricochet'].includes(bs.type)
  );
  if (offStringStrokes.length > 0) {
    recommendations.push('Work on controlled bounce strokes - start slowly at the balance point');
  }

  // Check for legato/sustained passages
  const legatoStrokes = analysis.bowStrokes.find((bs) => bs.type === 'legato');
  if (legatoStrokes && legatoStrokes.count > 5) {
    recommendations.push('Practice long tones for bow control and tone quality');
  }

  // Check bow distribution challenges
  if (analysis.bowDistribution.length > 0) {
    recommendations.push('Map out bow distribution for long phrases before playing');
  }

  // Dynamic recommendations
  if (analysis.dynamics.length > 0) {
    recommendations.push('Practice dynamic changes by varying bow speed and contact point');
  }

  if (recommendations.length === 0) {
    recommendations.push('Focus on consistent tone quality across all strings');
    recommendations.push('Practice smooth bow changes at frog and tip');
  }

  return recommendations;
};
