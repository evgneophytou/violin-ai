import { PitchDetector as Pitchy } from 'pitchy';
import type { DetectedPitch } from '@/types';

// Note frequencies for reference (A4 = 440Hz)
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Violin range: G3 (196Hz) to E7 (2637Hz)
const VIOLIN_MIN_FREQ = 180;
const VIOLIN_MAX_FREQ = 3000;

export class PitchDetectorService {
  private detector: Pitchy<Float32Array> | null = null;
  private sampleRate: number;
  private bufferSize: number;

  constructor(sampleRate: number = 44100, bufferSize: number = 2048) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
  }

  initialize(): void {
    this.detector = Pitchy.forFloat32Array(this.bufferSize);
  }

  detectPitch(audioData: Float32Array): DetectedPitch | null {
    if (!this.detector) {
      this.initialize();
    }

    const [frequency, clarity] = this.detector!.findPitch(audioData, this.sampleRate);

    // Filter out noise and non-violin frequencies
    if (
      clarity < 0.85 ||
      frequency < VIOLIN_MIN_FREQ ||
      frequency > VIOLIN_MAX_FREQ
    ) {
      return null;
    }

    const noteInfo = this.frequencyToNote(frequency);
    
    return {
      frequency,
      note: noteInfo.note,
      octave: noteInfo.octave,
      cents: noteInfo.cents,
      clarity,
    };
  }

  private frequencyToNote(frequency: number): { note: string; octave: number; cents: number } {
    // Calculate semitones from A4 (440Hz)
    const semitonesFromA4 = 12 * Math.log2(frequency / 440);
    const roundedSemitones = Math.round(semitonesFromA4);
    
    // Calculate cents deviation (100 cents = 1 semitone)
    const cents = Math.round((semitonesFromA4 - roundedSemitones) * 100);
    
    // A4 is the 9th note in the scale (index 9), octave 4
    const noteIndex = ((roundedSemitones % 12) + 12 + 9) % 12;
    const octave = 4 + Math.floor((roundedSemitones + 9) / 12);
    
    return {
      note: NOTE_NAMES[noteIndex],
      octave,
      cents,
    };
  }

  getNoteFrequency(note: string, octave: number): number {
    const noteIndex = NOTE_NAMES.indexOf(note.toUpperCase());
    if (noteIndex === -1) return 0;
    
    // Calculate semitones from A4
    const semitonesFromA4 = (octave - 4) * 12 + (noteIndex - 9);
    return 440 * Math.pow(2, semitonesFromA4 / 12);
  }

  calculateCentsDeviation(detectedFreq: number, targetFreq: number): number {
    return Math.round(1200 * Math.log2(detectedFreq / targetFreq));
  }

  dispose(): void {
    this.detector = null;
  }
}

// Singleton instance
let pitchDetectorInstance: PitchDetectorService | null = null;

export const getPitchDetector = (sampleRate?: number, bufferSize?: number): PitchDetectorService => {
  if (!pitchDetectorInstance) {
    pitchDetectorInstance = new PitchDetectorService(sampleRate, bufferSize);
  }
  return pitchDetectorInstance;
};

export const formatPitchDisplay = (pitch: DetectedPitch): string => {
  const centsStr = pitch.cents >= 0 ? `+${pitch.cents}` : `${pitch.cents}`;
  return `${pitch.note}${pitch.octave} (${centsStr}¢)`;
};

export const getPitchQuality = (cents: number): 'perfect' | 'good' | 'fair' | 'poor' => {
  const absCents = Math.abs(cents);
  if (absCents <= 5) return 'perfect';
  if (absCents <= 15) return 'good';
  if (absCents <= 30) return 'fair';
  return 'poor';
};
