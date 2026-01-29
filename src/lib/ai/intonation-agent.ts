'use client';

/**
 * Intonation Analysis Agent
 * 
 * Detailed pitch accuracy analysis beyond simple sharp/flat detection.
 * Includes vibrato analysis, intonation tendency tracking, and pure intonation suggestions.
 */

// Types
export interface PitchSample {
  frequency: number;
  timestamp: number;
  amplitude: number;
}

export interface IntonationReading {
  note: string;
  midi: number;
  cents: number; // Deviation from equal temperament (-50 to +50)
  frequency: number;
  timestamp: number;
  tendency: 'sharp' | 'flat' | 'accurate';
}

export interface VibratoAnalysis {
  present: boolean;
  rate: number; // Hz (typical: 5-7 Hz)
  width: number; // cents (typical: 20-50 cents)
  consistency: number; // 0-100
  quality: 'narrow' | 'wide' | 'fast' | 'slow' | 'irregular' | 'good';
}

export interface NoteIntonationReport {
  note: string;
  midi: number;
  averageCents: number;
  tendency: 'sharp' | 'flat' | 'accurate';
  stability: number; // 0-100
  vibrato: VibratoAnalysis;
  samples: number;
  suggestion?: string;
}

export interface IntonationAnalysisResult {
  overallAccuracy: number; // 0-100
  averageDeviation: number; // cents
  noteReports: NoteIntonationReport[];
  tendencies: Record<string, { avgCents: number; count: number }>;
  problematicNotes: string[];
  suggestions: string[];
  vibratoPresent: boolean;
  averageVibratoRate: number;
  averageVibratoWidth: number;
}

export interface PureIntonationSuggestion {
  interval: string;
  adjustment: number; // cents
  reason: string;
}

// Constants
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4_FREQUENCY = 440;
const CENTS_THRESHOLD_ACCURATE = 10;
const CENTS_THRESHOLD_SHARP = 10;
const VIBRATO_MIN_RATE = 3; // Hz
const VIBRATO_MAX_RATE = 10; // Hz
const VIBRATO_DETECTION_WINDOW = 500; // ms

// Pure/Just intonation intervals (cents deviation from equal temperament)
const PURE_INTERVALS: Record<string, number> = {
  unison: 0,
  minor_second: 12, // Pure: 112 cents vs ET: 100
  major_second: 4, // Pure: 204 cents vs ET: 200
  minor_third: 16, // Pure: 316 cents vs ET: 300
  major_third: -14, // Pure: 386 cents vs ET: 400
  perfect_fourth: -2, // Pure: 498 cents vs ET: 500
  tritone: -17, // Pure: 583 cents vs ET: 600
  perfect_fifth: 2, // Pure: 702 cents vs ET: 700
  minor_sixth: 14, // Pure: 814 cents vs ET: 800
  major_sixth: -16, // Pure: 884 cents vs ET: 900
  minor_seventh: -18, // Pure: 982 cents vs ET: 1000
  major_seventh: -12, // Pure: 1088 cents vs ET: 1100
};

// Memory limits
const MAX_PITCH_HISTORY = 500; // ~10 seconds at 50Hz
const MAX_NOTE_READINGS_PER_MIDI = 100;
const MAX_TENDENCIES_PER_NOTE = 200;
const MAX_UNIQUE_NOTES = 24; // 2 octaves worth of notes

// Intonation Analyzer Class
export class IntonationAnalyzer {
  private sampleRate = 44100;
  private pitchHistory: PitchSample[] = [];
  private noteReadings: Map<number, IntonationReading[]> = new Map();
  private tendencies: Map<string, number[]> = new Map();
  
  constructor() {}
  
  // Convert frequency to cents deviation from nearest note
  frequencyToCents(frequency: number): { note: string; midi: number; cents: number } {
    if (frequency <= 0) return { note: 'N/A', midi: 0, cents: 0 };
    
    const midiFloat = 12 * Math.log2(frequency / A4_FREQUENCY) + 69;
    const midi = Math.round(midiFloat);
    const cents = Math.round((midiFloat - midi) * 100);
    
    const octave = Math.floor((midi - 12) / 12);
    const noteIndex = (midi - 12) % 12;
    const note = `${NOTE_NAMES[noteIndex]}${octave}`;
    
    return { note, midi, cents };
  }
  
  // Add a pitch sample for analysis
  addSample(frequency: number, amplitude: number): void {
    if (frequency <= 0 || amplitude < 0.01) return;
    
    const timestamp = performance.now();
    const { note, midi, cents } = this.frequencyToCents(frequency);
    
    // Add to pitch history with size limit
    this.pitchHistory.push({ frequency, timestamp, amplitude });
    
    // Keep only recent history (last 10 seconds) and enforce max size
    const cutoff = timestamp - 10000;
    this.pitchHistory = this.pitchHistory.filter(s => s.timestamp > cutoff);
    if (this.pitchHistory.length > MAX_PITCH_HISTORY) {
      this.pitchHistory = this.pitchHistory.slice(-MAX_PITCH_HISTORY);
    }
    
    // Enforce max unique notes limit by removing oldest entries
    if (this.noteReadings.size >= MAX_UNIQUE_NOTES && !this.noteReadings.has(midi)) {
      // Remove the oldest note (first entry in map)
      const firstKey = this.noteReadings.keys().next().value;
      if (firstKey !== undefined) {
        this.noteReadings.delete(firstKey);
      }
    }
    
    // Add to note readings
    if (!this.noteReadings.has(midi)) {
      this.noteReadings.set(midi, []);
    }
    
    const tendency = cents > CENTS_THRESHOLD_SHARP ? 'sharp' :
                     cents < -CENTS_THRESHOLD_SHARP ? 'flat' : 'accurate';
    
    const readings = this.noteReadings.get(midi)!;
    readings.push({
      note,
      midi,
      cents,
      frequency,
      timestamp,
      tendency,
    });
    
    // Enforce max readings per note
    if (readings.length > MAX_NOTE_READINGS_PER_MIDI) {
      this.noteReadings.set(midi, readings.slice(-MAX_NOTE_READINGS_PER_MIDI));
    }
    
    // Track tendencies by note name (across octaves)
    const noteName = note.replace(/\d+$/, ''); // Remove octave
    if (!this.tendencies.has(noteName)) {
      this.tendencies.set(noteName, []);
    }
    
    const noteTendencies = this.tendencies.get(noteName)!;
    noteTendencies.push(cents);
    
    // Enforce max tendencies per note
    if (noteTendencies.length > MAX_TENDENCIES_PER_NOTE) {
      this.tendencies.set(noteName, noteTendencies.slice(-MAX_TENDENCIES_PER_NOTE));
    }
  }
  
  // Analyze vibrato in recent samples for a specific note
  analyzeVibrato(midi: number): VibratoAnalysis {
    const readings = this.noteReadings.get(midi) || [];
    const recentReadings = readings.filter(
      r => r.timestamp > performance.now() - 2000
    );
    
    if (recentReadings.length < 10) {
      return {
        present: false,
        rate: 0,
        width: 0,
        consistency: 0,
        quality: 'irregular',
      };
    }
    
    // Extract cents values
    const cents = recentReadings.map(r => r.cents);
    const timestamps = recentReadings.map(r => r.timestamp);
    
    // Find zero crossings to estimate frequency
    let crossings = 0;
    const mean = cents.reduce((a, b) => a + b, 0) / cents.length;
    for (let i = 1; i < cents.length; i++) {
      if ((cents[i - 1] - mean) * (cents[i] - mean) < 0) {
        crossings++;
      }
    }
    
    const duration = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000;
    const rate = duration > 0 ? (crossings / 2) / duration : 0;
    
    // Calculate width (peak-to-peak)
    const maxCents = Math.max(...cents);
    const minCents = Math.min(...cents);
    const width = maxCents - minCents;
    
    // Calculate consistency (standard deviation of peaks)
    const peaks: number[] = [];
    const troughs: number[] = [];
    for (let i = 1; i < cents.length - 1; i++) {
      if (cents[i] > cents[i - 1] && cents[i] > cents[i + 1]) {
        peaks.push(cents[i]);
      } else if (cents[i] < cents[i - 1] && cents[i] < cents[i + 1]) {
        troughs.push(cents[i]);
      }
    }
    
    let consistency = 100;
    if (peaks.length > 1) {
      const peakMean = peaks.reduce((a, b) => a + b, 0) / peaks.length;
      const peakVariance = peaks.reduce((sum, p) => sum + Math.pow(p - peakMean, 2), 0) / peaks.length;
      const peakStdDev = Math.sqrt(peakVariance);
      consistency = Math.max(0, 100 - peakStdDev * 2);
    }
    
    // Determine vibrato presence and quality
    const present = rate >= VIBRATO_MIN_RATE && rate <= VIBRATO_MAX_RATE && width >= 15;
    
    let quality: VibratoAnalysis['quality'] = 'irregular';
    if (present) {
      if (width < 20) quality = 'narrow';
      else if (width > 60) quality = 'wide';
      else if (rate < 4.5) quality = 'slow';
      else if (rate > 7) quality = 'fast';
      else if (consistency > 70) quality = 'good';
    }
    
    return {
      present,
      rate,
      width,
      consistency,
      quality,
    };
  }
  
  // Get report for a specific note
  getNoteReport(midi: number): NoteIntonationReport | null {
    const readings = this.noteReadings.get(midi);
    if (!readings || readings.length === 0) return null;
    
    const cents = readings.map(r => r.cents);
    const averageCents = cents.reduce((a, b) => a + b, 0) / cents.length;
    
    // Calculate stability (inverse of standard deviation)
    const variance = cents.reduce((sum, c) => sum + Math.pow(c - averageCents, 2), 0) / cents.length;
    const stdDev = Math.sqrt(variance);
    const stability = Math.max(0, 100 - stdDev * 3);
    
    // Determine overall tendency
    const tendency = averageCents > CENTS_THRESHOLD_ACCURATE ? 'sharp' :
                     averageCents < -CENTS_THRESHOLD_ACCURATE ? 'flat' : 'accurate';
    
    const vibrato = this.analyzeVibrato(midi);
    
    // Generate suggestion
    let suggestion: string | undefined;
    if (Math.abs(averageCents) > 20) {
      const direction = averageCents > 0 ? 'lower' : 'raise';
      suggestion = `Try to ${direction} this note by about ${Math.abs(Math.round(averageCents))} cents`;
    } else if (stability < 50) {
      suggestion = 'Work on pitch stability - the note is wavering';
    } else if (vibrato.present && vibrato.quality === 'wide') {
      suggestion = 'Vibrato is too wide - try a narrower, more controlled vibrato';
    } else if (vibrato.present && vibrato.quality === 'narrow') {
      suggestion = 'Vibrato is too narrow - allow for more pitch variation';
    }
    
    return {
      note: readings[0].note,
      midi,
      averageCents,
      tendency,
      stability,
      vibrato,
      samples: readings.length,
      suggestion,
    };
  }
  
  // Get full analysis result
  getAnalysis(): IntonationAnalysisResult {
    const noteReports: NoteIntonationReport[] = [];
    const problematicNotes: string[] = [];
    let totalCentsDeviation = 0;
    let totalSamples = 0;
    let vibratoRates: number[] = [];
    let vibratoWidths: number[] = [];
    
    // Generate reports for each detected note
    for (const midi of this.noteReadings.keys()) {
      const report = this.getNoteReport(midi);
      if (report) {
        noteReports.push(report);
        totalCentsDeviation += Math.abs(report.averageCents) * report.samples;
        totalSamples += report.samples;
        
        if (Math.abs(report.averageCents) > 15 || report.stability < 60) {
          problematicNotes.push(report.note);
        }
        
        if (report.vibrato.present) {
          vibratoRates.push(report.vibrato.rate);
          vibratoWidths.push(report.vibrato.width);
        }
      }
    }
    
    const averageDeviation = totalSamples > 0 ? totalCentsDeviation / totalSamples : 0;
    const overallAccuracy = Math.max(0, 100 - averageDeviation * 2);
    
    // Build tendencies summary
    const tendenciesSummary: Record<string, { avgCents: number; count: number }> = {};
    for (const [noteName, centsList] of this.tendencies.entries()) {
      const avg = centsList.reduce((a, b) => a + b, 0) / centsList.length;
      tendenciesSummary[noteName] = { avgCents: avg, count: centsList.length };
    }
    
    // Generate suggestions
    const suggestions: string[] = [];
    
    // Check for consistent sharp/flat tendency
    const allCents = Array.from(this.tendencies.values()).flat();
    if (allCents.length > 0) {
      const overallAvg = allCents.reduce((a, b) => a + b, 0) / allCents.length;
      if (overallAvg > 10) {
        suggestions.push('You tend to play sharp overall - try adjusting your finger placement slightly back');
      } else if (overallAvg < -10) {
        suggestions.push('You tend to play flat overall - try adjusting your finger placement slightly forward');
      }
    }
    
    // Check for specific problem notes
    for (const [noteName, data] of Object.entries(tendenciesSummary)) {
      if (Math.abs(data.avgCents) > 20 && data.count >= 3) {
        const direction = data.avgCents > 0 ? 'sharp' : 'flat';
        suggestions.push(`${noteName} tends to be ${direction} - pay attention to this note`);
      }
    }
    
    // Vibrato feedback
    const avgVibratoRate = vibratoRates.length > 0
      ? vibratoRates.reduce((a, b) => a + b, 0) / vibratoRates.length
      : 0;
    const avgVibratoWidth = vibratoWidths.length > 0
      ? vibratoWidths.reduce((a, b) => a + b, 0) / vibratoWidths.length
      : 0;
    
    if (vibratoRates.length > 0) {
      if (avgVibratoRate < 4.5) {
        suggestions.push('Your vibrato is a bit slow - try speeding it up slightly');
      } else if (avgVibratoRate > 7) {
        suggestions.push('Your vibrato is quite fast - try for a more moderate speed');
      }
    }
    
    return {
      overallAccuracy,
      averageDeviation,
      noteReports: noteReports.sort((a, b) => a.midi - b.midi),
      tendencies: tendenciesSummary,
      problematicNotes,
      suggestions: suggestions.slice(0, 5),
      vibratoPresent: vibratoRates.length > 0,
      averageVibratoRate: avgVibratoRate,
      averageVibratoWidth: avgVibratoWidth,
    };
  }
  
  // Get pure intonation suggestions for double stops
  getPureIntonationSuggestions(lowerNote: number, upperNote: number): PureIntonationSuggestion[] {
    const interval = upperNote - lowerNote;
    const suggestions: PureIntonationSuggestion[] = [];
    
    const intervalMap: Record<number, { name: string; key: keyof typeof PURE_INTERVALS }> = {
      1: { name: 'minor second', key: 'minor_second' },
      2: { name: 'major second', key: 'major_second' },
      3: { name: 'minor third', key: 'minor_third' },
      4: { name: 'major third', key: 'major_third' },
      5: { name: 'perfect fourth', key: 'perfect_fourth' },
      6: { name: 'tritone', key: 'tritone' },
      7: { name: 'perfect fifth', key: 'perfect_fifth' },
      8: { name: 'minor sixth', key: 'minor_sixth' },
      9: { name: 'major sixth', key: 'major_sixth' },
      10: { name: 'minor seventh', key: 'minor_seventh' },
      11: { name: 'major seventh', key: 'major_seventh' },
    };
    
    if (intervalMap[interval]) {
      const { name, key } = intervalMap[interval];
      const adjustment = PURE_INTERVALS[key];
      
      if (Math.abs(adjustment) > 5) {
        suggestions.push({
          interval: name,
          adjustment,
          reason: `For a pure ${name}, adjust the upper note by ${adjustment > 0 ? '+' : ''}${adjustment} cents for better resonance`,
        });
      }
    }
    
    return suggestions;
  }
  
  // Reset all data
  reset(): void {
    this.pitchHistory = [];
    this.noteReadings.clear();
    this.tendencies.clear();
  }
}

// Singleton instance
let intonationAnalyzerInstance: IntonationAnalyzer | null = null;

export const getIntonationAnalyzer = (): IntonationAnalyzer => {
  if (!intonationAnalyzerInstance) {
    intonationAnalyzerInstance = new IntonationAnalyzer();
  }
  return intonationAnalyzerInstance;
};

export const disposeIntonationAnalyzer = (): void => {
  if (intonationAnalyzerInstance) {
    intonationAnalyzerInstance.reset();
    intonationAnalyzerInstance = null;
  }
};
