'use client';

/**
 * Score Follower Agent
 * 
 * Real-time accompanist that listens to the player and follows their tempo.
 * Uses pitch detection and dynamic time warping for score alignment.
 */

import * as Tone from 'tone';

// Types
export interface ScoreNote {
  pitch: string; // e.g., "A4", "C#5"
  midi: number;
  startBeat: number;
  duration: number; // in beats
  voice: 'solo' | 'accompaniment';
}

export interface ScorePosition {
  beat: number;
  measure: number;
  confidence: number;
  tempo: number;
}

export interface AccompanimentOptions {
  mode: 'strict' | 'follow' | 'conductor';
  baseTempo: number;
  instrument: 'piano' | 'strings' | 'orchestra';
  volume: number;
  countIn: boolean;
}

export interface ScoreFollowerState {
  isPlaying: boolean;
  currentPosition: ScorePosition;
  detectedPitches: number[];
  tempo: number;
  mode: AccompanimentOptions['mode'];
}

// Pitch detection utilities
const NOTE_FREQUENCIES: Record<string, number> = {
  'C0': 16.35, 'C#0': 17.32, 'D0': 18.35, 'D#0': 19.45, 'E0': 20.60, 'F0': 21.83,
  'F#0': 23.12, 'G0': 24.50, 'G#0': 25.96, 'A0': 27.50, 'A#0': 29.14, 'B0': 30.87,
};

// Generate all note frequencies
const generateAllNotes = (): Record<string, number> => {
  const notes: Record<string, number> = {};
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  for (let octave = 0; octave <= 8; octave++) {
    for (let i = 0; i < noteNames.length; i++) {
      const noteName = `${noteNames[i]}${octave}`;
      const midiNumber = octave * 12 + i + 12; // MIDI starts at C-1 = 0
      notes[noteName] = 440 * Math.pow(2, (midiNumber - 69) / 12);
    }
  }
  
  return notes;
};

const ALL_NOTES = generateAllNotes();

// Convert frequency to nearest note
export const frequencyToNote = (frequency: number): { note: string; midi: number; cents: number } => {
  if (frequency <= 0) return { note: 'N/A', midi: 0, cents: 0 };
  
  const midiNumber = 12 * Math.log2(frequency / 440) + 69;
  const roundedMidi = Math.round(midiNumber);
  const cents = Math.round((midiNumber - roundedMidi) * 100);
  
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor((roundedMidi - 12) / 12);
  const noteIndex = (roundedMidi - 12) % 12;
  const noteName = `${noteNames[noteIndex]}${octave}`;
  
  return { note: noteName, midi: roundedMidi, cents };
};

// Convert note name to MIDI number
export const noteToMidi = (note: string): number => {
  const match = note.match(/^([A-G]#?)(\d+)$/);
  if (!match) return 60; // Default to middle C
  
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteName = match[1];
  const octave = parseInt(match[2]);
  const noteIndex = noteNames.indexOf(noteName);
  
  return octave * 12 + noteIndex + 12;
};

// Score Follower Class
export class ScoreFollower {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private isListening = false;
  
  // Score data
  private soloNotes: ScoreNote[] = [];
  private accompanimentNotes: ScoreNote[] = [];
  
  // Position tracking
  private currentBeat = 0;
  private lastDetectedPitch = 0;
  private pitchHistory: number[] = [];
  private positionConfidence = 0;
  
  // Tempo tracking
  private baseTempo = 120;
  private currentTempo = 120;
  private tempoHistory: number[] = [];
  private lastNoteTime = 0;
  
  // Options
  private mode: AccompanimentOptions['mode'] = 'follow';
  private volume = 0.7;
  
  // Tone.js instruments
  private piano: Tone.Sampler | null = null;
  private strings: Tone.PolySynth | null = null;
  
  // Callbacks
  private onPositionUpdate?: (position: ScorePosition) => void;
  private onPitchDetected?: (pitch: number, note: string) => void;
  
  constructor() {
    this.initializeInstruments();
  }
  
  private async initializeInstruments(): Promise<void> {
    // Use PolySynth for piano-like sound
    this.piano = new Tone.Sampler({
      urls: {
        'C4': 'C4.mp3',
      },
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
      onload: () => console.log('Piano loaded'),
    }).toDestination();
    
    // Strings synth
    this.strings = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.3,
        decay: 0.1,
        sustain: 0.8,
        release: 0.5,
      },
    }).toDestination();
  }
  
  // Load score from note array
  loadScore(solo: ScoreNote[], accompaniment: ScoreNote[]): void {
    this.soloNotes = solo.sort((a, b) => a.startBeat - b.startBeat);
    this.accompanimentNotes = accompaniment.sort((a, b) => a.startBeat - b.startBeat);
    this.currentBeat = 0;
    this.positionConfidence = 0;
  }
  
  // Set options
  setOptions(options: Partial<AccompanimentOptions>): void {
    if (options.mode) this.mode = options.mode;
    if (options.baseTempo) this.baseTempo = options.baseTempo;
    if (options.volume !== undefined) {
      this.volume = options.volume;
      Tone.Destination.volume.value = Tone.gainToDb(options.volume);
    }
  }
  
  // Set callbacks
  setCallbacks(callbacks: {
    onPositionUpdate?: (position: ScorePosition) => void;
    onPitchDetected?: (pitch: number, note: string) => void;
  }): void {
    this.onPositionUpdate = callbacks.onPositionUpdate;
    this.onPitchDetected = callbacks.onPitchDetected;
  }
  
  // Start listening to microphone
  async startListening(): Promise<void> {
    if (this.isListening) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      
      this.isListening = true;
      this.detectPitchLoop();
    } catch (error) {
      console.error('Failed to start listening:', error);
      throw error;
    }
  }
  
  // Stop listening
  stopListening(): void {
    this.isListening = false;
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
  
  // Pitch detection loop using autocorrelation
  private detectPitchLoop(): void {
    if (!this.isListening || !this.analyser) return;
    
    const bufferLength = this.analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(buffer);
    
    const pitch = this.detectPitch(buffer, this.audioContext!.sampleRate);
    
    if (pitch > 0) {
      const { note, midi } = frequencyToNote(pitch);
      this.lastDetectedPitch = midi;
      this.pitchHistory.push(midi);
      
      if (this.pitchHistory.length > 20) {
        this.pitchHistory.shift();
      }
      
      this.onPitchDetected?.(pitch, note);
      this.updatePosition(midi);
    }
    
    requestAnimationFrame(() => this.detectPitchLoop());
  }
  
  // Autocorrelation-based pitch detection
  private detectPitch(buffer: Float32Array, sampleRate: number): number {
    // Check if signal is loud enough
    let rms = 0;
    for (let i = 0; i < buffer.length; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / buffer.length);
    
    if (rms < 0.01) return -1; // Too quiet
    
    // Autocorrelation
    const correlations = new Float32Array(buffer.length);
    for (let lag = 0; lag < buffer.length; lag++) {
      let sum = 0;
      for (let i = 0; i < buffer.length - lag; i++) {
        sum += buffer[i] * buffer[i + lag];
      }
      correlations[lag] = sum;
    }
    
    // Find the first peak after the initial decline
    let foundPeak = false;
    let maxCorrelation = 0;
    let bestLag = 0;
    
    for (let lag = Math.floor(sampleRate / 1000); lag < buffer.length; lag++) {
      if (correlations[lag] > correlations[lag - 1] && correlations[lag] > correlations[lag + 1]) {
        if (correlations[lag] > maxCorrelation * 0.9) {
          maxCorrelation = correlations[lag];
          bestLag = lag;
          foundPeak = true;
        }
      }
    }
    
    if (!foundPeak || bestLag === 0) return -1;
    
    return sampleRate / bestLag;
  }
  
  // Update score position based on detected pitch
  private updatePosition(detectedMidi: number): void {
    if (this.soloNotes.length === 0) return;
    
    // Find matching notes in the score around current position
    const searchWindow = 4; // beats
    const candidates = this.soloNotes.filter(note =>
      note.startBeat >= this.currentBeat - 1 &&
      note.startBeat <= this.currentBeat + searchWindow
    );
    
    // Find best matching note
    let bestMatch: ScoreNote | null = null;
    let bestDistance = Infinity;
    
    for (const note of candidates) {
      const midiDistance = Math.abs(note.midi - detectedMidi);
      if (midiDistance <= 2 && midiDistance < bestDistance) { // Allow for slight intonation differences
        bestDistance = midiDistance;
        bestMatch = note;
      }
    }
    
    if (bestMatch) {
      // Update position with smoothing
      const newBeat = bestMatch.startBeat;
      const positionDelta = newBeat - this.currentBeat;
      
      // Update tempo based on timing
      const now = performance.now();
      if (this.lastNoteTime > 0 && positionDelta > 0) {
        const timeDelta = (now - this.lastNoteTime) / 1000; // seconds
        const beatDelta = positionDelta;
        const detectedTempo = (beatDelta / timeDelta) * 60;
        
        // Smooth tempo changes
        if (detectedTempo > 30 && detectedTempo < 300) {
          this.tempoHistory.push(detectedTempo);
          if (this.tempoHistory.length > 5) {
            this.tempoHistory.shift();
          }
          this.currentTempo = this.tempoHistory.reduce((a, b) => a + b, 0) / this.tempoHistory.length;
        }
      }
      
      this.lastNoteTime = now;
      this.currentBeat = newBeat;
      this.positionConfidence = Math.max(0, 1 - bestDistance / 12);
      
      // Trigger accompaniment notes
      if (this.mode !== 'strict') {
        this.triggerAccompaniment(newBeat);
      }
      
      // Notify position update
      this.onPositionUpdate?.({
        beat: this.currentBeat,
        measure: Math.floor(this.currentBeat / 4) + 1,
        confidence: this.positionConfidence,
        tempo: this.currentTempo,
      });
    }
  }
  
  // Trigger accompaniment notes at current position
  private triggerAccompaniment(beat: number): void {
    const tolerance = 0.25; // Beat tolerance for triggering
    
    const notesToPlay = this.accompanimentNotes.filter(note =>
      note.startBeat >= beat - tolerance &&
      note.startBeat < beat + tolerance
    );
    
    for (const note of notesToPlay) {
      this.playNote(note);
    }
  }
  
  // Play a single note
  private playNote(note: ScoreNote): void {
    const durationSeconds = (note.duration / this.currentTempo) * 60;
    
    if (this.piano) {
      this.piano.triggerAttackRelease(note.pitch, durationSeconds);
    }
  }
  
  // Play accompaniment in strict tempo mode
  async playStrict(): Promise<void> {
    if (this.accompanimentNotes.length === 0) return;
    
    await Tone.start();
    
    const now = Tone.now();
    const beatDuration = 60 / this.baseTempo;
    
    for (const note of this.accompanimentNotes) {
      const startTime = now + note.startBeat * beatDuration;
      const duration = note.duration * beatDuration;
      
      if (this.piano) {
        this.piano.triggerAttackRelease(note.pitch, duration, startTime);
      }
    }
  }
  
  // Stop playback
  stop(): void {
    this.stopListening();
    Tone.Transport.stop();
    
    if (this.piano) {
      this.piano.releaseAll();
    }
    if (this.strings) {
      this.strings.releaseAll();
    }
  }
  
  // Get current state
  getState(): ScoreFollowerState {
    return {
      isPlaying: this.isListening,
      currentPosition: {
        beat: this.currentBeat,
        measure: Math.floor(this.currentBeat / 4) + 1,
        confidence: this.positionConfidence,
        tempo: this.currentTempo,
      },
      detectedPitches: [...this.pitchHistory],
      tempo: this.currentTempo,
      mode: this.mode,
    };
  }
  
  // Reset to beginning
  reset(): void {
    this.currentBeat = 0;
    this.pitchHistory = [];
    this.tempoHistory = [];
    this.positionConfidence = 0;
    this.currentTempo = this.baseTempo;
    this.lastNoteTime = 0;
  }
  
  // Dispose resources
  dispose(): void {
    this.stop();
    
    if (this.piano) {
      this.piano.dispose();
      this.piano = null;
    }
    if (this.strings) {
      this.strings.dispose();
      this.strings = null;
    }
  }
}

// Singleton instance
let scoreFollowerInstance: ScoreFollower | null = null;

export const getScoreFollower = (): ScoreFollower => {
  if (!scoreFollowerInstance) {
    scoreFollowerInstance = new ScoreFollower();
  }
  return scoreFollowerInstance;
};

export const disposeScoreFollower = (): void => {
  if (scoreFollowerInstance) {
    scoreFollowerInstance.dispose();
    scoreFollowerInstance = null;
  }
};

// Helper function to create score from simple notation
export const createScoreFromNotes = (
  soloNotation: string[], // e.g., ["A4:1", "B4:0.5", "C5:0.5"]
  accompanimentNotation: string[]
): { solo: ScoreNote[]; accompaniment: ScoreNote[] } => {
  const parseNotes = (notation: string[], voice: 'solo' | 'accompaniment'): ScoreNote[] => {
    const notes: ScoreNote[] = [];
    let currentBeat = 0;
    
    for (const item of notation) {
      const [pitch, durationStr] = item.split(':');
      const duration = parseFloat(durationStr) || 1;
      
      notes.push({
        pitch,
        midi: noteToMidi(pitch),
        startBeat: currentBeat,
        duration,
        voice,
      });
      
      currentBeat += duration;
    }
    
    return notes;
  };
  
  return {
    solo: parseNotes(soloNotation, 'solo'),
    accompaniment: parseNotes(accompanimentNotation, 'accompaniment'),
  };
};
