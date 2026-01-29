import type { Exercise, ExerciseFocus, ExerciseMetadata, PerformanceAnalysis, Note } from '@/types';
import { parseMusicXMLNotes } from '@/lib/music/musicxml-utils';

const DIFFICULTY_PARAMS = {
  1: {
    octaves: 1,
    scaleDescription: 'one octave scale in first position using open strings',
    noteRange: { low: 'G3', high: 'A4' },
    rhythms: ['whole', 'half', 'quarter'],
    keys: ['G', 'D', 'A'],
    techniques: ['open strings', 'first position'],
    measures: 4,
    tempo: 60,
  },
  2: {
    octaves: 1,
    scaleDescription: 'one octave scale in first position',
    noteRange: { low: 'G3', high: 'A4' },
    rhythms: ['half', 'quarter', 'eighth'],
    keys: ['G', 'D', 'A', 'C'],
    techniques: ['first position', 'simple slurs'],
    measures: 4,
    tempo: 72,
  },
  3: {
    octaves: 2,
    scaleDescription: 'two octave scale with shifting to third position',
    noteRange: { low: 'G3', high: 'A5' },
    rhythms: ['quarter', 'eighth', 'dotted quarter'],
    keys: ['G', 'D', 'A', 'C', 'F'],
    techniques: ['first position', 'shifting to 3rd', 'slurs'],
    measures: 8,
    tempo: 80,
  },
  4: {
    octaves: 2,
    scaleDescription: 'two octave scale with shifting between positions 1-3',
    noteRange: { low: 'G3', high: 'B5' },
    rhythms: ['quarter', 'eighth', 'sixteenth'],
    keys: ['G', 'D', 'A', 'E', 'F', 'Bb'],
    techniques: ['positions 1-3', 'shifting', 'dynamics'],
    measures: 8,
    tempo: 88,
  },
  5: {
    octaves: 2,
    scaleDescription: 'two octave scale with fluid shifting through positions 1-5',
    noteRange: { low: 'G3', high: 'D6' },
    rhythms: ['quarter', 'eighth', 'sixteenth', 'triplet'],
    keys: ['D', 'A', 'E', 'B', 'Bb', 'Eb'],
    techniques: ['positions 1-5', 'vibrato', 'dynamics'],
    measures: 12,
    tempo: 96,
  },
  6: {
    octaves: 3,
    scaleDescription: 'three octave scale using all positions',
    noteRange: { low: 'G3', high: 'G6' },
    rhythms: ['eighth', 'sixteenth', 'triplet', 'syncopation'],
    keys: ['G', 'A', 'D', 'E', 'Bb', 'Eb'],
    techniques: ['all positions', 'vibrato', 'spiccato'],
    measures: 12,
    tempo: 104,
  },
  7: {
    octaves: 3,
    scaleDescription: 'three octave scale with advanced shifting',
    noteRange: { low: 'G3', high: 'A6' },
    rhythms: ['sixteenth', 'triplet', 'syncopation', 'mixed'],
    keys: ['E', 'B', 'F#', 'C#', 'Ab', 'Db'],
    techniques: ['all positions', 'double stops', 'harmonics'],
    measures: 16,
    tempo: 112,
  },
  8: {
    octaves: 3,
    scaleDescription: 'three octave scale at concert tempo',
    noteRange: { low: 'G3', high: 'B6' },
    rhythms: ['complex', 'mixed meters'],
    keys: ['B', 'F#', 'C#', 'Db', 'Gb'],
    techniques: ['all positions', 'double stops', 'tremolo'],
    measures: 16,
    tempo: 120,
  },
  9: {
    octaves: 3,
    scaleDescription: 'three octave scale with virtuosic speed',
    noteRange: { low: 'G3', high: 'C7' },
    rhythms: ['virtuosic'],
    keys: ['F#', 'C#', 'Gb', 'Ab'],
    techniques: ['advanced', 'left-hand pizz', 'sul ponticello'],
    measures: 20,
    tempo: 132,
  },
  10: {
    octaves: 3,
    scaleDescription: 'three octave scale at concert-level',
    noteRange: { low: 'G3', high: 'E7' },
    rhythms: ['virtuosic', 'cadenza-like'],
    keys: ['G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab'],
    techniques: ['concert-level', 'all techniques'],
    measures: 24,
    tempo: 144,
  },
};

const FOCUS_DESCRIPTIONS: Record<ExerciseFocus, string> = {
  scales: 'scales and scale patterns focusing on smooth, even finger patterns',
  arpeggios: 'arpeggios and broken chords with proper string crossings',
  bowing: 'bowing exercises including various bow strokes and distribution',
  intonation: 'intonation exercises with careful attention to half steps and intervals',
  rhythm: 'rhythmic exercises with varied patterns and subdivisions',
  mixed: 'a combination of technical elements for well-rounded practice',
};

// Key signature fifths mapping
const KEY_FIFTHS: Record<string, number> = {
  'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7,
  'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Gb': -6, 'Cb': -7,
};

// Get starting note for a scale based on key
const getScaleStartNote = (key: string): string => {
  const startNotes: Record<string, string> = {
    'G': 'G3', 'D': 'D4', 'A': 'A3', 'E': 'E4', 'B': 'B3',
    'C': 'C4', 'F': 'F4', 'Bb': 'Bb3', 'Eb': 'Eb4', 'Ab': 'Ab3',
    'F#': 'F#4', 'C#': 'C#4', 'Db': 'Db4', 'Gb': 'Gb4',
  };
  return startNotes[key] || 'G3';
};

// Get ending note for a scale based on key and octaves
const getScaleEndNote = (key: string, octaves: number): string => {
  const baseOctave = parseInt(getScaleStartNote(key).slice(-1));
  const endOctave = baseOctave + octaves;
  const noteName = key.length > 1 ? key : key;
  return `${noteName}${endOctave}`;
};

export const generateMusicPrompt = (
  difficulty: number,
  focus: ExerciseFocus,
  previousFeedback?: PerformanceAnalysis
): string => {
  const params = DIFFICULTY_PARAMS[Math.min(10, Math.max(1, difficulty)) as keyof typeof DIFFICULTY_PARAMS];
  const focusDescription = FOCUS_DESCRIPTIONS[focus];
  
  // Select a specific key for this exercise
  const selectedKey = params.keys[Math.floor(Math.random() * params.keys.length)];
  const keyFifths = KEY_FIFTHS[selectedKey] ?? 0;
  
  // Get sharps/flats description
  const sharps = ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'];
  const flats = ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'];
  let accidentalDesc = 'No sharps or flats';
  if (keyFifths > 0) accidentalDesc = `Sharps: ${sharps.slice(0, keyFifths).join(', ')}`;
  else if (keyFifths < 0) accidentalDesc = `Flats: ${flats.slice(0, Math.abs(keyFifths)).join(', ')}`;
  
  // Get scale range
  const startNote = getScaleStartNote(selectedKey);
  const endNote = getScaleEndNote(selectedKey, params.octaves);
  
  let prompt = `Generate a violin ${params.octaves}-octave ${selectedKey} major scale exercise in valid MusicXML format.

KEY SIGNATURE (CRITICAL):
- Key: ${selectedKey} major
- Fifths value: ${keyFifths}
- ${accidentalDesc}

SCALE REQUIREMENTS (CRITICAL for scales focus):
- Number of octaves: ${params.octaves}
- Scale type: ${params.scaleDescription}
- Starting note: ${startNote}
- Ending note: ${endNote} (then descend back to ${startNote})
- Pattern: Play scale ASCENDING from ${startNote} to ${endNote}, then DESCENDING back to ${startNote}
- Total notes: ${params.octaves * 7 + 1} notes ascending, ${params.octaves * 7} notes descending

Requirements:
- Difficulty: ${difficulty}/10
- Focus: ${focusDescription}
- Note range: ${params.noteRange.low} to ${params.noteRange.high}
- Rhythms: ${params.rhythms.join(', ')}
- Techniques: ${params.techniques.join(', ')}
- Length: ${params.measures} measures
- Tempo: ${params.tempo} BPM
- Time signature: 4/4

`;

  if (previousFeedback) {
    prompt += `Previous performance: ${previousFeedback.overallScore}% overall, pitch ${previousFeedback.pitch.accuracy}%, rhythm ${previousFeedback.rhythm.accuracy}%. Focus on: ${previousFeedback.nextFocus}\n\n`;
  }

  prompt += `The MusicXML MUST have this key signature in measure 1:
<key><fifths>${keyFifths}</fifths><mode>major</mode></key>

Return ONLY valid MusicXML, no other text.`;

  return prompt;
};

// Reverse lookup: fifths to key name
const getFifthsToKey = (fifths: number): string => {
  const map: Record<number, string> = {
    0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F#', 7: 'C#',
  };
  const flatMap: Record<number, string> = {
    [-1]: 'F', [-2]: 'Bb', [-3]: 'Eb', [-4]: 'Ab', [-5]: 'Db', [-6]: 'Gb', [-7]: 'Cb',
  };
  return fifths >= 0 ? (map[fifths] || 'C') : (flatMap[fifths] || 'C');
};

export const createExerciseFromMusicXML = (
  musicXML: string,
  difficulty: number,
  focus: ExerciseFocus
): Exercise => {
  const notes = parseMusicXMLNotes(musicXML);
  const params = DIFFICULTY_PARAMS[Math.min(10, Math.max(1, difficulty)) as keyof typeof DIFFICULTY_PARAMS];
  
  // Extract key from MusicXML
  let key = params.keys[0];
  const fifthsMatch = musicXML.match(/<fifths>(-?\d+)<\/fifths>/);
  if (fifthsMatch) {
    const fifths = parseInt(fifthsMatch[1], 10);
    key = getFifthsToKey(fifths);
  }
  
  // Extract tempo from MusicXML
  let tempo = params.tempo;
  const tempoMatch = musicXML.match(/<per-minute>(\d+)<\/per-minute>/);
  if (tempoMatch) {
    tempo = parseInt(tempoMatch[1], 10);
  }
  
  // Count measures
  const measureCount = (musicXML.match(/<measure\s+number=/g) || []).length;
  
  const metadata: ExerciseMetadata = {
    id: `exercise-${Date.now()}`,
    title: `${focus.charAt(0).toUpperCase() + focus.slice(1)} Exercise - Level ${difficulty}`,
    difficulty,
    focus,
    key,
    timeSignature: '4/4',
    tempo,
    measures: measureCount || params.measures,
    noteRange: params.noteRange,
    techniques: params.techniques,
  };
  
  return {
    metadata,
    musicXML,
    notes,
  };
};

// Generate scale notes for a given key and number of octaves
const generateScaleNotesForKey = (key: string, octaves: number): string[] => {
  // Scale patterns with starting octave
  const scalePatterns: Record<string, { startOctave: number; steps: string[] }> = {
    'G': { startOctave: 3, steps: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'] },
    'D': { startOctave: 4, steps: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'] },
    'A': { startOctave: 3, steps: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'] },
    'E': { startOctave: 4, steps: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'] },
    'B': { startOctave: 3, steps: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'] },
    'C': { startOctave: 4, steps: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
    'F': { startOctave: 4, steps: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'] },
    'Bb': { startOctave: 3, steps: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'] },
    'Eb': { startOctave: 4, steps: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'] },
    'Ab': { startOctave: 3, steps: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'] },
    'F#': { startOctave: 4, steps: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'] },
    'C#': { startOctave: 4, steps: ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'] },
    'Db': { startOctave: 4, steps: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'] },
    'Gb': { startOctave: 4, steps: ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'] },
  };
  
  const pattern = scalePatterns[key] || scalePatterns['G'];
  const notes: string[] = [];
  
  // Generate notes for each octave
  for (let oct = 0; oct < octaves; oct++) {
    const currentOctave = pattern.startOctave + oct;
    for (const step of pattern.steps) {
      // Handle octave changes within the scale (e.g., G3 scale goes G3, A3, B3, C4...)
      const noteOctave = step === 'C' || step === 'D' || step === 'E' || step === 'F' || 
                         step === 'Cb' || step === 'Db' || step === 'Eb' || step === 'Fb' 
                         ? (pattern.steps.indexOf(step) < pattern.steps.indexOf(pattern.steps[0]) ? currentOctave + 1 : currentOctave)
                         : currentOctave;
      notes.push(`${step}${noteOctave}`);
    }
  }
  
  // Add the final tonic note
  const finalOctave = pattern.startOctave + octaves;
  notes.push(`${pattern.steps[0]}${finalOctave}`);
  
  return notes;
};

// Fallback exercise generator for when API is not available
export const generateFallbackExercise = (
  difficulty: number,
  focus: ExerciseFocus
): Exercise => {
  const params = DIFFICULTY_PARAMS[Math.min(10, Math.max(1, difficulty)) as keyof typeof DIFFICULTY_PARAMS];
  
  // Select a key from available keys for this difficulty
  const availableKeys = ['G', 'D', 'A', 'C', 'E', 'F', 'Bb', 'Eb'];
  const validKeys = params.keys.filter(k => availableKeys.includes(k));
  const key = validKeys[Math.floor(Math.random() * validKeys.length)] || 'G';
  
  // Generate scale notes for the specified number of octaves
  const scaleUp = generateScaleNotesForKey(key, params.octaves);
  const scaleDown = [...scaleUp].reverse().slice(1); // Exclude the top note (already played)
  const pattern = [...scaleUp, ...scaleDown];
  
  const notes: Note[] = [];
  let time = 0;
  
  // Determine note duration based on difficulty
  const duration = difficulty <= 2 ? 1 : difficulty <= 5 ? 0.5 : 0.25;
  
  for (const pitch of pattern) {
    notes.push({
      pitch,
      frequency: 0,
      duration,
      startTime: time,
      velocity: 80,
    });
    time += duration;
  }
  
  // Generate MusicXML
  const musicXML = generateSimpleMusicXMLFromNotes(notes, key, params.tempo);
  
  const octaveLabel = params.octaves === 1 ? 'One Octave' : 
                      params.octaves === 2 ? 'Two Octave' : 'Three Octave';
  
  const metadata: ExerciseMetadata = {
    id: `fallback-exercise-${Date.now()}`,
    title: `${key} Major Scale (${octaveLabel}) - Level ${difficulty}`,
    difficulty,
    focus,
    key,
    timeSignature: '4/4',
    tempo: params.tempo,
    measures: Math.ceil(time / 4),
    noteRange: params.noteRange,
    techniques: params.techniques,
  };
  
  return {
    metadata,
    musicXML,
    notes,
  };
};

const generateSimpleMusicXMLFromNotes = (notes: Note[], key: string, tempo: number): string => {
  const fifths = KEY_FIFTHS[key] ?? 0;
  
  // Group notes into measures (4 beats per measure)
  const measures: Note[][] = [];
  let currentMeasure: Note[] = [];
  let measureDuration = 0;
  
  for (const note of notes) {
    if (measureDuration + note.duration > 4 && currentMeasure.length > 0) {
      measures.push(currentMeasure);
      currentMeasure = [];
      measureDuration = 0;
    }
    currentMeasure.push(note);
    measureDuration += note.duration;
  }
  if (currentMeasure.length > 0) measures.push(currentMeasure);
  
  // Generate measures XML
  let measuresXML = '';
  for (let m = 0; m < measures.length; m++) {
    measuresXML += `    <measure number="${m + 1}">\n`;
    
    // First measure has attributes
    if (m === 0) {
      measuresXML += `      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>${fifths}</fifths>
          <mode>major</mode>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <direction placement="above">
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>${tempo}</per-minute>
          </metronome>
        </direction-type>
        <sound tempo="${tempo}"/>
      </direction>\n`;
    }
    
    // Add notes
    for (const note of measures[m]) {
      const pitchMatch = note.pitch.match(/([A-G])([#b]?)(\d)/);
      if (!pitchMatch) continue;
      
      const [, step, accidental, octave] = pitchMatch;
      const alter = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
      const divisions = Math.round(note.duration * 4);
      const typeMap: Record<number, string> = { 1: '16th', 2: 'eighth', 4: 'quarter', 8: 'half', 16: 'whole' };
      const type = typeMap[divisions] || 'quarter';
      
      measuresXML += `      <note>
        <pitch>
          <step>${step}</step>${alter !== 0 ? `\n          <alter>${alter}</alter>` : ''}
          <octave>${octave}</octave>
        </pitch>
        <duration>${divisions}</duration>
        <type>${type}</type>
      </note>\n`;
    }
    
    measuresXML += `    </measure>\n`;
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>${key} Major Scale Exercise</work-title>
  </work>
  <part-list>
    <score-part id="P1">
      <part-name>Violin</part-name>
    </score-part>
  </part-list>
  <part id="P1">
${measuresXML}  </part>
</score-partwise>`;
};
