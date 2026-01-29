import * as Tone from 'tone';

export type Subdivision = 'quarter' | 'eighth' | 'triplet' | 'sixteenth';
export type TimeSignature = '4/4' | '3/4' | '2/4' | '6/8' | '5/4' | '7/8';

export interface MetronomeConfig {
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  accentFirst: boolean;
  volume: number;
}

const DEFAULT_CONFIG: MetronomeConfig = {
  bpm: 120,
  timeSignature: '4/4',
  subdivision: 'quarter',
  accentFirst: true,
  volume: 0.8,
};

export class MetronomeService {
  private config: MetronomeConfig;
  private isPlaying: boolean = false;
  private synth: Tone.MembraneSynth | null = null;
  private clickSynth: Tone.NoiseSynth | null = null;
  private loop: Tone.Loop | null = null;
  private currentBeat: number = 0;
  private onBeatCallback: ((beat: number, isAccent: boolean) => void) | null = null;
  private isInitialized: boolean = false;

  constructor(config: Partial<MetronomeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await Tone.start();

    // Create synths for different sounds
    this.synth = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.1,
      },
    }).toDestination();

    this.clickSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0,
        release: 0.01,
      },
    }).toDestination();

    this.isInitialized = true;
  }

  setOnBeatCallback(callback: (beat: number, isAccent: boolean) => void): void {
    this.onBeatCallback = callback;
  }

  private getBeatsPerMeasure(): number {
    const [beats] = this.config.timeSignature.split('/').map(Number);
    return beats;
  }

  private getSubdivisionMultiplier(): number {
    switch (this.config.subdivision) {
      case 'eighth':
        return 2;
      case 'triplet':
        return 3;
      case 'sixteenth':
        return 4;
      default:
        return 1;
    }
  }

  private getNoteValue(): string {
    const multiplier = this.getSubdivisionMultiplier();
    switch (multiplier) {
      case 2:
        return '8n';
      case 3:
        return '8t';
      case 4:
        return '16n';
      default:
        return '4n';
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isPlaying) return;

    this.isPlaying = true;
    this.currentBeat = 0;

    Tone.Transport.bpm.value = this.config.bpm;

    const beatsPerMeasure = this.getBeatsPerMeasure();
    const subdivisions = this.getSubdivisionMultiplier();
    const totalSubdivisions = beatsPerMeasure * subdivisions;

    this.loop = new Tone.Loop((time) => {
      const isMainBeat = this.currentBeat % subdivisions === 0;
      const beatNumber = Math.floor(this.currentBeat / subdivisions);
      const isFirstBeat = beatNumber === 0 && isMainBeat;
      const isAccent = this.config.accentFirst && isFirstBeat;

      // Play sound
      if (isMainBeat) {
        // Main beat - louder, lower pitch
        const volume = isAccent ? this.config.volume : this.config.volume * 0.8;
        const pitch = isAccent ? 'C3' : 'C4';
        this.synth?.triggerAttackRelease(pitch, '32n', time, volume);
      } else {
        // Subdivision click - quieter, shorter
        this.clickSynth?.triggerAttackRelease('32n', time, this.config.volume * 0.3);
      }

      // Callback for visual feedback
      if (this.onBeatCallback && isMainBeat) {
        this.onBeatCallback(beatNumber, isAccent);
      }

      this.currentBeat = (this.currentBeat + 1) % totalSubdivisions;
    }, this.getNoteValue());

    this.loop.start(0);
    Tone.Transport.start();
  }

  stop(): void {
    this.isPlaying = false;
    this.currentBeat = 0;

    if (this.loop) {
      this.loop.stop();
      this.loop.dispose();
      this.loop = null;
    }

    Tone.Transport.stop();
    Tone.Transport.position = 0;
  }

  setBPM(bpm: number): void {
    this.config.bpm = Math.max(20, Math.min(300, bpm));
    if (this.isPlaying) {
      Tone.Transport.bpm.value = this.config.bpm;
    }
  }

  setTimeSignature(timeSignature: TimeSignature): void {
    this.config.timeSignature = timeSignature;
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  setSubdivision(subdivision: Subdivision): void {
    this.config.subdivision = subdivision;
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  setAccentFirst(accent: boolean): void {
    this.config.accentFirst = accent;
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  getConfig(): MetronomeConfig {
    return { ...this.config };
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentBeat(): number {
    return Math.floor(this.currentBeat / this.getSubdivisionMultiplier());
  }

  dispose(): void {
    this.stop();
    
    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }
    
    if (this.clickSynth) {
      this.clickSynth.dispose();
      this.clickSynth = null;
    }
    
    this.isInitialized = false;
  }
}

// Singleton instance
let metronomeInstance: MetronomeService | null = null;

export const getMetronome = (): MetronomeService => {
  if (!metronomeInstance) {
    metronomeInstance = new MetronomeService();
  }
  return metronomeInstance;
};

export const disposeMetronome = (): void => {
  if (metronomeInstance) {
    metronomeInstance.dispose();
    metronomeInstance = null;
  }
};

// Tap tempo utility
export class TapTempo {
  private taps: number[] = [];
  private maxTaps: number = 4;
  private timeout: number = 2000; // Reset after 2 seconds

  tap(): number | null {
    const now = Date.now();
    
    // Reset if too much time has passed
    if (this.taps.length > 0 && now - this.taps[this.taps.length - 1] > this.timeout) {
      this.taps = [];
    }
    
    this.taps.push(now);
    
    // Keep only recent taps
    if (this.taps.length > this.maxTaps) {
      this.taps.shift();
    }
    
    // Need at least 2 taps to calculate BPM
    if (this.taps.length < 2) {
      return null;
    }
    
    // Calculate average interval
    let totalInterval = 0;
    for (let i = 1; i < this.taps.length; i++) {
      totalInterval += this.taps[i] - this.taps[i - 1];
    }
    const avgInterval = totalInterval / (this.taps.length - 1);
    
    // Convert to BPM
    const bpm = Math.round(60000 / avgInterval);
    return Math.max(20, Math.min(300, bpm));
  }
  
  reset(): void {
    this.taps = [];
  }
}
