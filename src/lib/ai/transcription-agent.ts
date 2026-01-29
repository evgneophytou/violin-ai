'use client';

/**
 * Audio Transcription Agent
 * 
 * Transcribes played audio to MIDI/sheet music for self-assessment and comparison.
 * Uses pitch detection and onset analysis for basic transcription.
 */

// Types
export interface TranscribedNote {
  pitch: string; // e.g., "A4"
  midi: number;
  startTime: number; // seconds
  endTime: number;
  duration: number;
  velocity: number; // 0-127
  cents: number; // deviation from equal temperament
}

export interface TranscriptionResult {
  notes: TranscribedNote[];
  tempo: number;
  key?: string;
  timeSignature: string;
  duration: number;
  confidence: number;
}

export interface NoteComparison {
  expected: TranscribedNote;
  played: TranscribedNote | null;
  pitchMatch: boolean;
  rhythmMatch: boolean;
  pitchDeviation: number; // semitones
  timingDeviation: number; // seconds
}

export interface TranscriptionComparison {
  accuracy: number;
  pitchAccuracy: number;
  rhythmAccuracy: number;
  noteComparisons: NoteComparison[];
  missedNotes: TranscribedNote[];
  extraNotes: TranscribedNote[];
  suggestions: string[];
}

// Constants
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4_FREQUENCY = 440;
const MIN_NOTE_DURATION = 0.05; // seconds
const ONSET_THRESHOLD = 0.1; // RMS threshold for note onset
const MIN_CONFIDENCE = 0.3;

// Convert frequency to MIDI number and note name
export const frequencyToNote = (frequency: number): { note: string; midi: number; cents: number } => {
  if (frequency <= 0) return { note: 'N/A', midi: 0, cents: 0 };
  
  const midiNumber = 12 * Math.log2(frequency / A4_FREQUENCY) + 69;
  const roundedMidi = Math.round(midiNumber);
  const cents = Math.round((midiNumber - roundedMidi) * 100);
  
  const octave = Math.floor((roundedMidi - 12) / 12);
  const noteIndex = (roundedMidi - 12) % 12;
  const noteName = `${NOTE_NAMES[noteIndex]}${octave}`;
  
  return { note: noteName, midi: roundedMidi, cents };
};

// Convert note name to frequency
export const noteToFrequency = (note: string): number => {
  const match = note.match(/^([A-G]#?)(\d+)$/);
  if (!match) return 0;
  
  const noteName = match[1];
  const octave = parseInt(match[2]);
  const noteIndex = NOTE_NAMES.indexOf(noteName);
  
  if (noteIndex === -1) return 0;
  
  const midi = octave * 12 + noteIndex + 12;
  return A4_FREQUENCY * Math.pow(2, (midi - 69) / 12);
};

// Audio Transcription Class
export class AudioTranscriber {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sampleRate = 44100;
  
  // Transcription state
  private isRecording = false;
  private recordedSamples: Float32Array[] = [];
  private notes: TranscribedNote[] = [];
  private currentNote: Partial<TranscribedNote> | null = null;
  private lastPitch = 0;
  private startTime = 0;
  
  constructor() {}
  
  // Initialize audio context
  async initialize(): Promise<void> {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.sampleRate = this.audioContext.sampleRate;
  }
  
  // Start recording from microphone
  async startRecording(): Promise<void> {
    if (this.isRecording) return;
    
    if (!this.audioContext) {
      await this.initialize();
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext!.createMediaStreamSource(stream);
      source.connect(this.analyser!);
      
      this.isRecording = true;
      this.recordedSamples = [];
      this.notes = [];
      this.currentNote = null;
      this.startTime = performance.now();
      
      this.processAudioLoop();
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }
  
  // Stop recording and return transcription
  stopRecording(): TranscriptionResult {
    this.isRecording = false;
    
    // Finalize any current note
    if (this.currentNote && this.currentNote.pitch) {
      const endTime = (performance.now() - this.startTime) / 1000;
      this.currentNote.endTime = endTime;
      this.currentNote.duration = endTime - this.currentNote.startTime!;
      
      if (this.currentNote.duration >= MIN_NOTE_DURATION) {
        this.notes.push(this.currentNote as TranscribedNote);
      }
    }
    
    // Calculate overall statistics
    const duration = (performance.now() - this.startTime) / 1000;
    const tempo = this.estimateTempo();
    const key = this.estimateKey();
    const confidence = this.calculateConfidence();
    
    return {
      notes: this.notes,
      tempo,
      key,
      timeSignature: '4/4', // Default, could be detected
      duration,
      confidence,
    };
  }
  
  // Process audio in real-time
  private processAudioLoop(): void {
    if (!this.isRecording || !this.analyser) return;
    
    const bufferLength = this.analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(buffer);
    
    // Store samples for analysis
    this.recordedSamples.push(buffer.slice());
    
    // Detect pitch
    const pitch = this.detectPitch(buffer);
    const rms = this.calculateRMS(buffer);
    const currentTime = (performance.now() - this.startTime) / 1000;
    
    // Note onset/offset detection
    if (pitch > 0 && rms > ONSET_THRESHOLD) {
      const { note, midi, cents } = frequencyToNote(pitch);
      
      // Check if this is a new note or continuation
      if (!this.currentNote || Math.abs(midi - this.lastPitch) > 1) {
        // End previous note if exists
        if (this.currentNote && this.currentNote.pitch) {
          this.currentNote.endTime = currentTime;
          this.currentNote.duration = currentTime - this.currentNote.startTime!;
          
          if (this.currentNote.duration >= MIN_NOTE_DURATION) {
            this.notes.push(this.currentNote as TranscribedNote);
          }
        }
        
        // Start new note
        this.currentNote = {
          pitch: note,
          midi,
          startTime: currentTime,
          velocity: Math.min(127, Math.round(rms * 500)),
          cents,
        };
      }
      
      this.lastPitch = midi;
    } else if (this.currentNote && this.currentNote.pitch) {
      // End current note
      this.currentNote.endTime = currentTime;
      this.currentNote.duration = currentTime - this.currentNote.startTime!;
      
      if (this.currentNote.duration >= MIN_NOTE_DURATION) {
        this.notes.push(this.currentNote as TranscribedNote);
      }
      
      this.currentNote = null;
      this.lastPitch = 0;
    }
    
    requestAnimationFrame(() => this.processAudioLoop());
  }
  
  // Pitch detection using autocorrelation
  private detectPitch(buffer: Float32Array): number {
    const correlations = new Float32Array(buffer.length);
    
    // Autocorrelation
    for (let lag = 0; lag < buffer.length; lag++) {
      let sum = 0;
      for (let i = 0; i < buffer.length - lag; i++) {
        sum += buffer[i] * buffer[i + lag];
      }
      correlations[lag] = sum;
    }
    
    // Find the first significant peak
    const minLag = Math.floor(this.sampleRate / 1000); // 1000 Hz max
    const maxLag = Math.floor(this.sampleRate / 80); // 80 Hz min
    
    let maxCorrelation = 0;
    let bestLag = 0;
    
    for (let lag = minLag; lag < maxLag && lag < correlations.length; lag++) {
      if (correlations[lag] > maxCorrelation) {
        maxCorrelation = correlations[lag];
        bestLag = lag;
      }
    }
    
    if (bestLag === 0 || maxCorrelation < correlations[0] * 0.5) {
      return -1;
    }
    
    return this.sampleRate / bestLag;
  }
  
  // Calculate RMS (volume level)
  private calculateRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }
  
  // Estimate tempo from note onsets
  private estimateTempo(): number {
    if (this.notes.length < 4) return 120; // Default tempo
    
    // Calculate inter-onset intervals
    const intervals: number[] = [];
    for (let i = 1; i < this.notes.length; i++) {
      const interval = this.notes[i].startTime - this.notes[i - 1].startTime;
      if (interval > 0.1 && interval < 2) {
        intervals.push(interval);
      }
    }
    
    if (intervals.length === 0) return 120;
    
    // Find median interval
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    
    // Convert to BPM (assuming quarter notes)
    const bpm = 60 / medianInterval;
    
    // Round to nearest common tempo
    const commonTempos = [60, 72, 80, 88, 96, 104, 112, 120, 132, 144, 160, 176, 200];
    return commonTempos.reduce((prev, curr) =>
      Math.abs(curr - bpm) < Math.abs(prev - bpm) ? curr : prev
    );
  }
  
  // Estimate key from detected pitches
  private estimateKey(): string | undefined {
    if (this.notes.length < 8) return undefined;
    
    // Count occurrences of each pitch class
    const pitchClasses = new Array(12).fill(0);
    for (const note of this.notes) {
      const pitchClass = note.midi % 12;
      pitchClasses[pitchClass] += note.duration;
    }
    
    // Simple key detection using Krumhansl-Schmuckler algorithm (simplified)
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    
    let bestKey = 'C major';
    let bestCorrelation = -Infinity;
    
    for (let root = 0; root < 12; root++) {
      // Rotate pitch classes
      const rotated = [...pitchClasses.slice(root), ...pitchClasses.slice(0, root)];
      
      // Calculate correlation with major profile
      let majorCorr = 0;
      let minorCorr = 0;
      for (let i = 0; i < 12; i++) {
        majorCorr += rotated[i] * majorProfile[i];
        minorCorr += rotated[i] * minorProfile[i];
      }
      
      const rootNote = NOTE_NAMES[root];
      if (majorCorr > bestCorrelation) {
        bestCorrelation = majorCorr;
        bestKey = `${rootNote} major`;
      }
      if (minorCorr > bestCorrelation) {
        bestCorrelation = minorCorr;
        bestKey = `${rootNote} minor`;
      }
    }
    
    return bestKey;
  }
  
  // Calculate overall transcription confidence
  private calculateConfidence(): number {
    if (this.notes.length === 0) return 0;
    
    // Based on note detection stability and consistency
    let confidence = 0.5;
    
    // More notes = more confidence (up to a point)
    confidence += Math.min(0.3, this.notes.length * 0.01);
    
    // Check for reasonable pitch range (violin range)
    const midiValues = this.notes.map(n => n.midi);
    const minMidi = Math.min(...midiValues);
    const maxMidi = Math.max(...midiValues);
    
    // Violin range: G3 (55) to E7 (100)
    if (minMidi >= 50 && maxMidi <= 105) {
      confidence += 0.2;
    }
    
    return Math.min(1, confidence);
  }
  
  // Transcribe an audio buffer directly
  async transcribeBuffer(audioBuffer: AudioBuffer): Promise<TranscriptionResult> {
    const channelData = audioBuffer.getChannelData(0);
    this.sampleRate = audioBuffer.sampleRate;
    
    this.notes = [];
    this.currentNote = null;
    this.lastPitch = 0;
    
    // Process in chunks
    const chunkSize = 2048;
    const hopSize = 512;
    let currentTime = 0;
    
    for (let i = 0; i < channelData.length - chunkSize; i += hopSize) {
      const chunk = channelData.slice(i, i + chunkSize);
      const pitch = this.detectPitch(chunk);
      const rms = this.calculateRMS(chunk);
      
      currentTime = i / this.sampleRate;
      
      if (pitch > 0 && rms > ONSET_THRESHOLD) {
        const { note, midi, cents } = frequencyToNote(pitch);
        
        if (!this.currentNote || Math.abs(midi - this.lastPitch) > 1) {
          if (this.currentNote && this.currentNote.pitch) {
            this.currentNote.endTime = currentTime;
            this.currentNote.duration = currentTime - this.currentNote.startTime!;
            if (this.currentNote.duration >= MIN_NOTE_DURATION) {
              this.notes.push(this.currentNote as TranscribedNote);
            }
          }
          
          this.currentNote = {
            pitch: note,
            midi,
            startTime: currentTime,
            velocity: Math.min(127, Math.round(rms * 500)),
            cents,
          };
        }
        
        this.lastPitch = midi;
      } else if (this.currentNote && this.currentNote.pitch) {
        this.currentNote.endTime = currentTime;
        this.currentNote.duration = currentTime - this.currentNote.startTime!;
        if (this.currentNote.duration >= MIN_NOTE_DURATION) {
          this.notes.push(this.currentNote as TranscribedNote);
        }
        this.currentNote = null;
        this.lastPitch = 0;
      }
    }
    
    // Finalize last note
    if (this.currentNote && this.currentNote.pitch) {
      this.currentNote.endTime = audioBuffer.duration;
      this.currentNote.duration = audioBuffer.duration - this.currentNote.startTime!;
      if (this.currentNote.duration >= MIN_NOTE_DURATION) {
        this.notes.push(this.currentNote as TranscribedNote);
      }
    }
    
    return {
      notes: this.notes,
      tempo: this.estimateTempo(),
      key: this.estimateKey(),
      timeSignature: '4/4',
      duration: audioBuffer.duration,
      confidence: this.calculateConfidence(),
    };
  }
  
  // Clean up resources
  dispose(): void {
    this.isRecording = false;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.recordedSamples = [];
    this.notes = [];
  }
}

// Compare transcription to expected notes
export const compareTranscriptions = (
  expected: TranscribedNote[],
  played: TranscribedNote[],
  toleranceMs: number = 200
): TranscriptionComparison => {
  const comparisons: NoteComparison[] = [];
  const missedNotes: TranscribedNote[] = [];
  const extraNotes: TranscribedNote[] = [...played];
  const toleranceSec = toleranceMs / 1000;
  
  let pitchMatches = 0;
  let rhythmMatches = 0;
  
  for (const expectedNote of expected) {
    // Find closest matching played note
    let bestMatch: TranscribedNote | null = null;
    let bestTimeDiff = Infinity;
    
    for (const playedNote of played) {
      const timeDiff = Math.abs(playedNote.startTime - expectedNote.startTime);
      const pitchDiff = Math.abs(playedNote.midi - expectedNote.midi);
      
      if (timeDiff < toleranceSec && pitchDiff <= 2 && timeDiff < bestTimeDiff) {
        bestTimeDiff = timeDiff;
        bestMatch = playedNote;
      }
    }
    
    if (bestMatch) {
      const pitchMatch = bestMatch.midi === expectedNote.midi;
      const rhythmMatch = Math.abs(bestMatch.startTime - expectedNote.startTime) < toleranceSec / 2;
      
      comparisons.push({
        expected: expectedNote,
        played: bestMatch,
        pitchMatch,
        rhythmMatch,
        pitchDeviation: bestMatch.midi - expectedNote.midi,
        timingDeviation: bestMatch.startTime - expectedNote.startTime,
      });
      
      if (pitchMatch) pitchMatches++;
      if (rhythmMatch) rhythmMatches++;
      
      // Remove from extra notes
      const index = extraNotes.indexOf(bestMatch);
      if (index > -1) extraNotes.splice(index, 1);
    } else {
      missedNotes.push(expectedNote);
      comparisons.push({
        expected: expectedNote,
        played: null,
        pitchMatch: false,
        rhythmMatch: false,
        pitchDeviation: 0,
        timingDeviation: 0,
      });
    }
  }
  
  const totalNotes = expected.length;
  const pitchAccuracy = totalNotes > 0 ? (pitchMatches / totalNotes) * 100 : 0;
  const rhythmAccuracy = totalNotes > 0 ? (rhythmMatches / totalNotes) * 100 : 0;
  const accuracy = (pitchAccuracy + rhythmAccuracy) / 2;
  
  // Generate suggestions
  const suggestions: string[] = [];
  
  if (pitchAccuracy < 80) {
    suggestions.push('Focus on intonation - some notes were out of tune');
  }
  if (rhythmAccuracy < 80) {
    suggestions.push('Work on timing - try practicing with a metronome');
  }
  if (missedNotes.length > 0) {
    suggestions.push(`${missedNotes.length} note(s) were missed - practice these passages slowly`);
  }
  if (extraNotes.length > 0) {
    suggestions.push('Some extra notes were detected - check for unwanted string touches');
  }
  
  return {
    accuracy,
    pitchAccuracy,
    rhythmAccuracy,
    noteComparisons: comparisons,
    missedNotes,
    extraNotes,
    suggestions,
  };
};

// Convert transcription to simple MIDI-like format
export const transcriptionToMidi = (result: TranscriptionResult): string => {
  const header = `Format=1,Tracks=1,Division=${Math.round(result.tempo * 4)}\n`;
  const trackHeader = `Track,0\n`;
  
  let events = '';
  const ticksPerBeat = Math.round(result.tempo * 4);
  
  for (const note of result.notes) {
    const startTick = Math.round(note.startTime * result.tempo / 60 * ticksPerBeat);
    const endTick = Math.round(note.endTime * result.tempo / 60 * ticksPerBeat);
    
    events += `${startTick},Note_on,0,${note.midi},${note.velocity}\n`;
    events += `${endTick},Note_off,0,${note.midi},0\n`;
  }
  
  return header + trackHeader + events;
};

// Singleton instance
let transcriberInstance: AudioTranscriber | null = null;

export const getTranscriber = (): AudioTranscriber => {
  if (!transcriberInstance) {
    transcriberInstance = new AudioTranscriber();
  }
  return transcriberInstance;
};

export const disposeTranscriber = (): void => {
  if (transcriberInstance) {
    transcriberInstance.dispose();
    transcriberInstance = null;
  }
};
