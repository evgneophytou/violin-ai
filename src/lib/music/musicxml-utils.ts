import type { Note, ExerciseMetadata } from '@/types';

// Note name to MIDI pitch mapping
const NOTE_TO_MIDI: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
  'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

// MIDI to note name mapping
const MIDI_TO_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const parseNoteString = (noteStr: string): { note: string; octave: number } | null => {
  const match = noteStr.match(/^([A-Ga-g][#b]?)(\d+)$/);
  if (!match) return null;
  
  return {
    note: match[1].toUpperCase(),
    octave: parseInt(match[2], 10),
  };
};

export const noteToFrequency = (note: string, octave: number): number => {
  const noteIndex = NOTE_TO_MIDI[note];
  if (noteIndex === undefined) return 0;
  
  // MIDI note number (A4 = 69)
  const midiNote = noteIndex + (octave + 1) * 12;
  // Frequency calculation
  return 440 * Math.pow(2, (midiNote - 69) / 12);
};

export const frequencyToNote = (frequency: number): { note: string; octave: number } => {
  // Calculate MIDI note number
  const midiNote = Math.round(69 + 12 * Math.log2(frequency / 440));
  const noteIndex = midiNote % 12;
  const octave = Math.floor(midiNote / 12) - 1;
  
  return {
    note: MIDI_TO_NOTE[noteIndex],
    octave,
  };
};

/**
 * Parse MusicXML notes - works on both server and client
 * Uses regex-based parsing for server compatibility since DOMParser is browser-only
 */
export const parseMusicXMLNotes = (musicXML: string): Note[] => {
  const notes: Note[] = [];
  let currentTime = 0;
  
  try {
    // Use regex-based parsing for server compatibility
    // Match note elements that have pitch (not rests)
    const noteRegex = /<note[^>]*>([\s\S]*?)<\/note>/gi;
    let noteMatch;
    
    while ((noteMatch = noteRegex.exec(musicXML)) !== null) {
      const noteContent = noteMatch[1];
      
      // Skip rests
      if (/<rest\s*\/>|<rest>/.test(noteContent)) {
        const durationMatch = noteContent.match(/<duration>(\d+)<\/duration>/);
        if (durationMatch) {
          currentTime += parseInt(durationMatch[1], 10) / 4;
        }
        continue;
      }
      
      // Check for chord
      const isChord = /<chord\s*\/>|<chord>/.test(noteContent);
      
      // Extract pitch info
      const pitchMatch = noteContent.match(/<pitch>([\s\S]*?)<\/pitch>/);
      const durationMatch = noteContent.match(/<duration>(\d+)<\/duration>/);
      
      if (pitchMatch && durationMatch) {
        const pitchContent = pitchMatch[1];
        
        const stepMatch = pitchContent.match(/<step>([A-G])<\/step>/);
        const octaveMatch = pitchContent.match(/<octave>(\d+)<\/octave>/);
        const alterMatch = pitchContent.match(/<alter>(-?\d+)<\/alter>/);
        
        const step = stepMatch ? stepMatch[1] : 'C';
        const octave = octaveMatch ? parseInt(octaveMatch[1], 10) : 4;
        const alter = alterMatch ? parseInt(alterMatch[1], 10) : 0;
        
        let noteName = step;
        if (alter === 1) noteName += '#';
        else if (alter === -1) noteName += 'b';
        
        const duration = parseInt(durationMatch[1], 10) / 4; // Normalize to quarter notes
        const frequency = noteToFrequency(noteName, octave);
        
        // Default velocity
        const velocity = 80;
        
        notes.push({
          pitch: `${noteName}${octave}`,
          frequency,
          duration,
          startTime: isChord && notes.length > 0 ? notes[notes.length - 1].startTime : currentTime,
          velocity,
        });
        
        if (!isChord) {
          currentTime += duration;
        }
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error parsing MusicXML:', error);
    }
  }
  
  return notes;
};

/**
 * Extract metadata from MusicXML - works on both server and client
 * Uses regex-based parsing for server compatibility
 */
export const extractMetadataFromMusicXML = (musicXML: string): Partial<ExerciseMetadata> => {
  try {
    const metadata: Partial<ExerciseMetadata> = {};
    
    // Get title
    const titleMatch = musicXML.match(/<work-title>([^<]+)<\/work-title>/) ||
                       musicXML.match(/<movement-title>([^<]+)<\/movement-title>/);
    if (titleMatch) {
      metadata.title = titleMatch[1];
    }
    
    // Get time signature
    const beatsMatch = musicXML.match(/<beats>(\d+)<\/beats>/);
    const beatTypeMatch = musicXML.match(/<beat-type>(\d+)<\/beat-type>/);
    if (beatsMatch && beatTypeMatch) {
      metadata.timeSignature = `${beatsMatch[1]}/${beatTypeMatch[1]}`;
    }
    
    // Get key signature
    const fifthsMatch = musicXML.match(/<fifths>(-?\d+)<\/fifths>/);
    const modeMatch = musicXML.match(/<mode>(\w+)<\/mode>/);
    if (fifthsMatch) {
      const fifths = parseInt(fifthsMatch[1], 10);
      const mode = modeMatch ? modeMatch[1] : 'major';
      
      const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
      const majorKeysFlat = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
      
      let keyName = fifths >= 0 ? majorKeys[fifths] || 'C' : majorKeysFlat[Math.abs(fifths)] || 'C';
      if (mode === 'minor') keyName += 'm';
      
      metadata.key = keyName;
    }
    
    // Get tempo
    const tempoMatch = musicXML.match(/tempo="(\d+)"/);
    if (tempoMatch) {
      metadata.tempo = parseInt(tempoMatch[1], 10);
    }
    
    // Count measures
    const measureMatches = musicXML.match(/<measure[^>]*>/g);
    metadata.measures = measureMatches ? measureMatches.length : 0;
    
    return metadata;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error extracting metadata:', error);
    }
    return {};
  }
};

export const generateSimpleMusicXML = (
  notes: Array<{ pitch: string; duration: number }>,
  metadata: Partial<ExerciseMetadata>
): string => {
  const {
    title = 'Exercise',
    key = 'C',
    timeSignature = '4/4',
    tempo = 120,
  } = metadata;
  
  const [beats, beatType] = timeSignature.split('/').map(Number);
  
  // Calculate fifths from key
  const keyMap: Record<string, number> = {
    'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7,
    'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Gb': -6, 'Cb': -7,
  };
  const baseKey = key.replace('m', '');
  const fifths = keyMap[baseKey] || 0;
  const mode = key.includes('m') ? 'minor' : 'major';
  
  let notesXML = '';
  let currentMeasureDuration = 0;
  const measureDuration = beats; // In quarter notes
  let measureNumber = 1;
  
  for (const note of notes) {
    const parsed = parseNoteString(note.pitch);
    if (!parsed) continue;
    
    // Check if we need a new measure
    if (currentMeasureDuration >= measureDuration) {
      notesXML += `    </measure>\n    <measure number="${++measureNumber}">\n`;
      currentMeasureDuration = 0;
    }
    
    const duration = Math.round(note.duration * 4); // Convert to divisions
    const durationTypes: Record<number, string> = {
      16: 'whole',
      8: 'half',
      4: 'quarter',
      2: 'eighth',
      1: '16th',
    };
    const type = durationTypes[duration] || 'quarter';
    
    const alter = parsed.note.includes('#') ? 1 : parsed.note.includes('b') ? -1 : 0;
    const step = parsed.note.replace(/[#b]/g, '');
    
    notesXML += `      <note>
        <pitch>
          <step>${step}</step>
          ${alter !== 0 ? `<alter>${alter}</alter>` : ''}
          <octave>${parsed.octave}</octave>
        </pitch>
        <duration>${duration}</duration>
        <type>${type}</type>
      </note>\n`;
    
    currentMeasureDuration += note.duration;
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>${title}</work-title>
  </work>
  <part-list>
    <score-part id="P1">
      <part-name>Violin</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>${fifths}</fifths>
          <mode>${mode}</mode>
        </key>
        <time>
          <beats>${beats}</beats>
          <beat-type>${beatType}</beat-type>
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
      </direction>
${notesXML}    </measure>
  </part>
</score-partwise>`;
};
