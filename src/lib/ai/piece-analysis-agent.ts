// Piece Analysis Agent - Analyzes structure, difficulty, and identifies challenging sections

import type {
  PieceAnalysis,
  DifficultSection,
  PieceSection,
  TechniqueSummary,
  PracticePlan,
  PracticePlanItem,
  ExtractedMusicData,
  Challenge,
  MeasureRange,
  ChallengeCategory,
  ChallengeSeverity,
  TechniqueChallengeType,
  BowingTechniqueType,
} from '@/types/piece-analysis';
import type { Note } from '@/types';

// Generate a unique ID
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Prompt for Gemini to analyze piece structure and difficulty
export const generatePieceAnalysisPrompt = (
  musicData: ExtractedMusicData | string,
  isRawMusicXML: boolean = false
): string => {
  const dataDescription = isRawMusicXML
    ? `The following is MusicXML data for a violin piece:\n\n${musicData}`
    : `The following is extracted music data for a violin piece:\n\n${JSON.stringify(musicData, null, 2)}`;

  return `You are an expert violin teacher and music analyst. Analyze the following violin piece and provide a comprehensive analysis.

${dataDescription}

Please analyze and provide:

1. PIECE INFORMATION:
   - Title (if identifiable)
   - Composer (if identifiable)
   - Key signature
   - Time signature
   - Approximate tempo
   - Total measures

2. OVERALL DIFFICULTY (1-10 scale):
   - Consider technical demands, musical complexity, and physical requirements
   - Provide equivalent grade level (e.g., "ABRSM Grade 5", "RCM Level 7")

3. PIECE STRUCTURE:
   - Identify major sections (Introduction, Theme A, Development, etc.)
   - Note key changes and tempo changes

4. DIFFICULT SECTIONS (identify 3-8 most challenging passages):
   For each section provide:
   - Measure range (start-end)
   - Difficulty score (1-10)
   - Category: technique, intonation, bowing, rhythm, or mixed
   - Specific challenges (position shifts, double stops, fast passages, etc.)
   - Practice suggestions

5. TECHNIQUE SUMMARY:
   - Positions required (1st, 3rd, etc.)
   - Highest position used
   - Strings covered
   - Required techniques (shifts, vibrato, harmonics, etc.)
   - Bowing techniques (detaché, spiccato, legato, etc.)
   - Dynamic range

6. PRACTICE PLAN:
   - Estimated total practice time to master
   - Priority order for sections
   - Warm-up suggestions
   - Daily practice order recommendation

Respond in JSON format:
{
  "title": "string",
  "composer": "string or null",
  "keySignature": "string",
  "timeSignature": "string",
  "tempo": number or null,
  "totalMeasures": number,
  "overallDifficulty": number,
  "gradeLevel": "string",
  "structure": [
    {
      "name": "string",
      "measureRange": { "start": number, "end": number },
      "keySignature": "string or null",
      "tempo": number or null,
      "character": "string or null"
    }
  ],
  "difficultSections": [
    {
      "measureRange": { "start": number, "end": number },
      "difficultyScore": number,
      "category": "technique|intonation|bowing|rhythm|mixed",
      "challenges": [
        {
          "type": "string",
          "description": "string",
          "measureNumbers": [number],
          "severity": "minor|moderate|significant"
        }
      ],
      "suggestions": ["string"]
    }
  ],
  "techniqueSummary": {
    "positions": [number],
    "highestPosition": number,
    "stringsCovered": ["G", "D", "A", "E"],
    "requiredTechniques": ["string"],
    "bowingTechniques": ["string"],
    "dynamicRange": { "min": "string", "max": "string" },
    "tempoChanges": boolean,
    "keyChanges": boolean,
    "meterChanges": boolean
  },
  "practicePlan": {
    "totalEstimatedTime": number,
    "warmUpSuggestions": ["string"],
    "dailyPracticeOrder": ["description of section"],
    "items": [
      {
        "sectionDescription": "string",
        "measureRange": { "start": number, "end": number },
        "duration": number,
        "priority": "high|medium|low",
        "focusAreas": ["string"],
        "tips": ["string"]
      }
    ]
  }
}`;
};

// Parse the AI response into a PieceAnalysis object
export const parsePieceAnalysisResponse = (
  response: string,
  originalMusicXML?: string
): PieceAnalysis | null => {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const analysisId = generateId();

    // Parse difficult sections
    const difficultSections: DifficultSection[] = (parsed.difficultSections || []).map(
      (section: {
        measureRange?: { start?: number; end?: number };
        difficultyScore?: number;
        category?: string;
        challenges?: Array<{
          type?: string;
          description?: string;
          measureNumbers?: number[];
          severity?: string;
        }>;
        suggestions?: string[];
      }, index: number) => ({
        id: `section-${analysisId}-${index}`,
        measureRange: {
          start: section.measureRange?.start ?? 1,
          end: section.measureRange?.end ?? 4,
        },
        difficultyScore: section.difficultyScore ?? 5,
        category: (section.category as ChallengeCategory) || 'mixed',
        challenges: (section.challenges || []).map((c) => ({
          type: c.type || 'general',
          description: c.description || 'Technical challenge',
          measureNumbers: c.measureNumbers || [],
          severity: (c.severity as ChallengeSeverity) || 'moderate',
        })),
        suggestions: section.suggestions || [],
      })
    );

    // Parse piece structure
    const structure: PieceSection[] = (parsed.structure || []).map(
      (section: {
        name?: string;
        measureRange?: { start?: number; end?: number };
        keySignature?: string;
        tempo?: number;
        character?: string;
      }) => ({
        name: section.name || 'Section',
        measureRange: {
          start: section.measureRange?.start ?? 1,
          end: section.measureRange?.end ?? 4,
        },
        keySignature: section.keySignature,
        tempo: section.tempo,
        character: section.character,
      })
    );

    // Parse technique summary
    const techniqueSummary: TechniqueSummary = {
      positions: parsed.techniqueSummary?.positions || [1],
      highestPosition: parsed.techniqueSummary?.highestPosition || 1,
      stringsCovered: parsed.techniqueSummary?.stringsCovered || ['G', 'D', 'A', 'E'],
      requiredTechniques: parsed.techniqueSummary?.requiredTechniques || [],
      bowingTechniques: parsed.techniqueSummary?.bowingTechniques || [],
      dynamicRange: parsed.techniqueSummary?.dynamicRange || { min: 'mp', max: 'f' },
      tempoChanges: parsed.techniqueSummary?.tempoChanges || false,
      keyChanges: parsed.techniqueSummary?.keyChanges || false,
      meterChanges: parsed.techniqueSummary?.meterChanges || false,
    };

    // Parse practice plan
    const practicePlanItems: PracticePlanItem[] = (parsed.practicePlan?.items || []).map(
      (item: {
        sectionDescription?: string;
        measureRange?: { start?: number; end?: number };
        duration?: number;
        priority?: string;
        focusAreas?: string[];
        tips?: string[];
      }, index: number) => {
        const sectionId = difficultSections[index]?.id || `practice-${analysisId}-${index}`;
        return {
          id: `plan-item-${analysisId}-${index}`,
          sectionId,
          description: item.sectionDescription || `Practice section ${index + 1}`,
          duration: item.duration || 10,
          priority: (item.priority as 'high' | 'medium' | 'low') || 'medium',
          focusAreas: item.focusAreas || [],
          tips: item.tips || [],
        };
      }
    );

    const practicePlan: PracticePlan = {
      totalEstimatedTime: parsed.practicePlan?.totalEstimatedTime || 60,
      items: practicePlanItems,
      warmUpSuggestions: parsed.practicePlan?.warmUpSuggestions || [
        'Start with slow scales in the key of the piece',
        'Practice shifting exercises',
      ],
      dailyPracticeOrder: parsed.practicePlan?.dailyPracticeOrder || difficultSections.map((s) => s.id),
    };

    // Build the complete analysis
    const analysis: PieceAnalysis = {
      id: analysisId,
      title: parsed.title || 'Unknown Piece',
      composer: parsed.composer || undefined,
      overallDifficulty: parsed.overallDifficulty || 5,
      gradeLevel: parsed.gradeLevel,
      keySignature: parsed.keySignature || 'C Major',
      timeSignature: parsed.timeSignature || '4/4',
      tempo: parsed.tempo,
      totalMeasures: parsed.totalMeasures || 16,
      structure,
      difficultSections,
      techniqueSummary,
      practicePlan,
      musicXML: originalMusicXML,
      analyzedAt: Date.now(),
    };

    return analysis;
  } catch (error) {
    console.error('Error parsing piece analysis response:', error);
    return null;
  }
};

// Generate local/fallback analysis when AI is unavailable
export const generateLocalPieceAnalysis = (
  musicXML: string,
  notes: Note[],
  metadata: {
    title?: string;
    keySignature?: string;
    timeSignature?: string;
    tempo?: number;
    measures?: number;
  }
): PieceAnalysis => {
  const analysisId = generateId();

  // Analyze note range to estimate positions
  const frequencies = notes.map((n) => n.frequency).filter((f) => f > 0);
  const minFreq = Math.min(...frequencies);
  const maxFreq = Math.max(...frequencies);

  // Estimate positions based on frequency range
  // G3 = 196Hz (open G), E7 = 2637Hz (very high)
  const estimatedPositions: number[] = [1];
  if (maxFreq > 660) estimatedPositions.push(3); // A5 and above
  if (maxFreq > 880) estimatedPositions.push(5); // A5 and above
  if (maxFreq > 1175) estimatedPositions.push(7); // D6 and above

  // Estimate difficulty based on various factors
  let difficultyScore = 3; // Base difficulty

  // Higher positions = harder
  difficultyScore += Math.min(3, (estimatedPositions.length - 1));

  // More notes = potentially harder
  if (notes.length > 100) difficultyScore += 1;
  if (notes.length > 200) difficultyScore += 1;

  // Fast notes = harder
  const shortNotes = notes.filter((n) => n.duration < 0.5).length;
  if (shortNotes > notes.length * 0.3) difficultyScore += 1;

  difficultyScore = Math.min(10, Math.max(1, difficultyScore));

  // Generate grade level
  const gradeLevels = [
    'Beginner',
    'ABRSM Grade 1',
    'ABRSM Grade 2',
    'ABRSM Grade 3',
    'ABRSM Grade 4',
    'ABRSM Grade 5',
    'ABRSM Grade 6',
    'ABRSM Grade 7',
    'ABRSM Grade 8',
    'Diploma Level',
  ];
  const gradeLevel = gradeLevels[Math.min(9, difficultyScore - 1)];

  // Identify potentially difficult sections (every 8 measures with fast notes or large intervals)
  const difficultSections: DifficultSection[] = [];
  const measuresCount = metadata.measures || Math.ceil(notes.length / 4);

  for (let m = 1; m <= measuresCount; m += 8) {
    const endMeasure = Math.min(m + 7, measuresCount);
    const sectionNotes = notes.filter(
      (n) => n.startTime >= (m - 1) * 4 && n.startTime < endMeasure * 4
    );

    if (sectionNotes.length === 0) continue;

    const challenges: Challenge[] = [];

    // Check for fast passages
    const fastNotes = sectionNotes.filter((n) => n.duration < 0.5);
    if (fastNotes.length > sectionNotes.length * 0.5) {
      challenges.push({
        type: 'fast_passage' as TechniqueChallengeType,
        description: 'Rapid note sequence requiring agile finger work',
        measureNumbers: [m, m + 1, m + 2],
        severity: 'moderate',
      });
    }

    // Check for wide intervals
    for (let i = 1; i < sectionNotes.length; i++) {
      const interval = Math.abs(sectionNotes[i].frequency - sectionNotes[i - 1].frequency);
      if (interval > 200) {
        challenges.push({
          type: 'wide_interval' as TechniqueChallengeType,
          description: 'Large interval requiring position shift or string crossing',
          measureNumbers: [m + Math.floor(i / 4)],
          severity: 'moderate',
        });
        break;
      }
    }

    if (challenges.length > 0) {
      difficultSections.push({
        id: `section-${analysisId}-${difficultSections.length}`,
        measureRange: { start: m, end: endMeasure },
        difficultyScore: Math.min(10, difficultyScore + challenges.length),
        category: 'mixed',
        challenges,
        suggestions: [
          'Practice this section slowly with a metronome',
          'Isolate difficult intervals and practice them separately',
          'Use slow practice mode at 50% tempo first',
        ],
      });
    }
  }

  // If no difficult sections found, create one generic one
  if (difficultSections.length === 0) {
    difficultSections.push({
      id: `section-${analysisId}-0`,
      measureRange: { start: 1, end: Math.min(8, measuresCount) },
      difficultyScore: difficultyScore,
      category: 'mixed',
      challenges: [
        {
          type: 'general',
          description: 'Initial learning phase',
          measureNumbers: [1, 2, 3, 4],
          severity: 'minor',
        },
      ],
      suggestions: [
        'Start by reading through the piece slowly',
        'Identify finger patterns and positions',
        'Practice hands separately if needed',
      ],
    });
  }

  // Generate technique summary
  const techniqueSummary: TechniqueSummary = {
    positions: estimatedPositions,
    highestPosition: Math.max(...estimatedPositions),
    stringsCovered: ['G', 'D', 'A', 'E'],
    requiredTechniques: shortNotes > 20 ? ['fast_passage'] : [],
    bowingTechniques: ['detache', 'legato'],
    dynamicRange: { min: 'mp', max: 'f' },
    tempoChanges: false,
    keyChanges: false,
    meterChanges: false,
  };

  // Generate practice plan
  const practicePlan: PracticePlan = {
    totalEstimatedTime: difficultyScore * 15, // minutes
    items: difficultSections.map((section, index) => ({
      id: `plan-item-${analysisId}-${index}`,
      sectionId: section.id,
      description: `Work on measures ${section.measureRange.start}-${section.measureRange.end}`,
      duration: 10,
      priority: index === 0 ? 'high' : 'medium',
      focusAreas: section.challenges.map((c) => c.type),
      tips: section.suggestions.slice(0, 2),
    })),
    warmUpSuggestions: [
      `Practice scales in ${metadata.keySignature || 'C Major'}`,
      'Warm up with shifting exercises',
      'Practice the bowing patterns slowly',
    ],
    dailyPracticeOrder: difficultSections.map((s) => s.id),
  };

  // Build structure (simple division)
  const structure: PieceSection[] = [
    {
      name: 'Opening',
      measureRange: { start: 1, end: Math.ceil(measuresCount / 3) },
      keySignature: metadata.keySignature,
      tempo: metadata.tempo,
    },
    {
      name: 'Middle',
      measureRange: {
        start: Math.ceil(measuresCount / 3) + 1,
        end: Math.ceil((measuresCount * 2) / 3),
      },
    },
    {
      name: 'Closing',
      measureRange: {
        start: Math.ceil((measuresCount * 2) / 3) + 1,
        end: measuresCount,
      },
    },
  ];

  return {
    id: analysisId,
    title: metadata.title || 'Uploaded Piece',
    overallDifficulty: difficultyScore,
    gradeLevel,
    keySignature: metadata.keySignature || 'C Major',
    timeSignature: metadata.timeSignature || '4/4',
    tempo: metadata.tempo,
    totalMeasures: measuresCount,
    structure,
    difficultSections,
    techniqueSummary,
    practicePlan,
    musicXML,
    analyzedAt: Date.now(),
  };
};

// Prompt for Gemini Vision to extract music from image/PDF
export const generateVisionExtractionPrompt = (): string => {
  return `You are an expert music reader analyzing violin sheet music. Extract the musical content from this image.

Please identify and extract:

1. PIECE INFORMATION:
   - Title (if visible)
   - Composer (if visible)
   - Key signature (count sharps or flats)
   - Time signature
   - Tempo marking (if present)

2. FOR EACH MEASURE, extract:
   - Measure number
   - Notes (pitch names with octave, e.g., "A4", "G#5")
   - Rhythmic values (whole, half, quarter, eighth, sixteenth, etc.)
   - Articulations (staccato, accent, tenuto, etc.)
   - Dynamics (pp, p, mp, mf, f, ff, crescendo, diminuendo)
   - Bowing marks (up-bow ∨, down-bow ∏, slurs)
   - Position markings (if any)
   - String indications (G, D, A, E)
   - Fingerings (0, 1, 2, 3, 4)

3. SPECIAL MARKINGS:
   - Pizzicato/arco
   - Harmonics
   - Trills
   - Ornaments
   - Expression markings (dolce, espressivo, etc.)

Respond in JSON format:
{
  "title": "string or null",
  "composer": "string or null",
  "keySignature": "string (e.g., 'G Major', 'D minor')",
  "timeSignature": "string (e.g., '4/4', '3/4')",
  "tempo": number or null,
  "measures": [
    {
      "measureNumber": number,
      "notes": [
        {
          "pitch": "string (e.g., 'A4')",
          "duration": "string (quarter, eighth, etc.)",
          "articulation": "string or null",
          "dynamic": "string or null",
          "fingering": "string or null",
          "bowing": "string or null",
          "string": "string or null"
        }
      ],
      "dynamics": "string or null",
      "articulations": ["string"],
      "bowings": ["string"],
      "tempoChange": number or null,
      "keyChange": "string or null"
    }
  ],
  "articulations": ["all unique articulations found"],
  "dynamics": ["all unique dynamics found"],
  "technicalMarkings": ["all technical markings like pizz, arco, etc."]
}

Be as accurate as possible. If you cannot read something clearly, indicate it with "unclear" in the relevant field.`;
};

// Parse vision extraction response
export const parseVisionExtractionResponse = (response: string): ExtractedMusicData | null => {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in vision response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      title: parsed.title || undefined,
      composer: parsed.composer || undefined,
      keySignature: parsed.keySignature || 'C Major',
      timeSignature: parsed.timeSignature || '4/4',
      tempo: parsed.tempo || undefined,
      measures: parsed.measures || [],
      articulations: parsed.articulations || [],
      dynamics: parsed.dynamics || [],
      technicalMarkings: parsed.technicalMarkings || [],
    };
  } catch (error) {
    console.error('Error parsing vision extraction response:', error);
    return null;
  }
};

// Convert extracted music data to a simplified MusicXML
export const convertExtractedDataToMusicXML = (data: ExtractedMusicData): string => {
  const durationMap: Record<string, number> = {
    whole: 4,
    half: 2,
    quarter: 1,
    eighth: 0.5,
    sixteenth: 0.25,
    'dotted half': 3,
    'dotted quarter': 1.5,
    'dotted eighth': 0.75,
  };

  const typeMap: Record<string, string> = {
    whole: 'whole',
    half: 'half',
    quarter: 'quarter',
    eighth: 'eighth',
    sixteenth: '16th',
    'dotted half': 'half',
    'dotted quarter': 'quarter',
    'dotted eighth': 'eighth',
  };

  let measuresXML = '';

  for (const measure of data.measures) {
    let notesXML = '';

    for (const note of measure.notes) {
      const pitchMatch = note.pitch.match(/([A-G])([#b]?)(\d)/);
      if (!pitchMatch) continue;

      const [, step, alter, octave] = pitchMatch;
      const duration = durationMap[note.duration.toLowerCase()] || 1;
      const type = typeMap[note.duration.toLowerCase()] || 'quarter';
      const isDotted = note.duration.toLowerCase().includes('dotted');

      let alterXML = '';
      if (alter === '#') alterXML = '<alter>1</alter>';
      else if (alter === 'b') alterXML = '<alter>-1</alter>';

      notesXML += `
        <note>
          <pitch>
            <step>${step}</step>
            ${alterXML}
            <octave>${octave}</octave>
          </pitch>
          <duration>${Math.round(duration * 4)}</duration>
          <type>${type}</type>
          ${isDotted ? '<dot/>' : ''}
        </note>`;
    }

    measuresXML += `
    <measure number="${measure.measureNumber}">
      ${measure.measureNumber === 1 ? `
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time>
          <beats>${data.timeSignature?.split('/')[0] || '4'}</beats>
          <beat-type>${data.timeSignature?.split('/')[1] || '4'}</beat-type>
        </time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>` : ''}
      ${notesXML}
    </measure>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>${data.title || 'Extracted Piece'}</work-title>
  </work>
  <identification>
    <creator type="composer">${data.composer || 'Unknown'}</creator>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Violin</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    ${measuresXML}
  </part>
</score-partwise>`;
};
