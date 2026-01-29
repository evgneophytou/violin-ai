import * as Tone from 'tone';
import type { Note, LoopConfig } from '@/types';

export class PlaybackService {
  private synth: Tone.PolySynth | null = null;
  private isInitialized: boolean = false;
  private isPlaying: boolean = false;
  private scheduledEvents: number[] = [];
  private onNotePlay: ((noteIndex: number) => void) | null = null;
  private onPlaybackComplete: (() => void) | null = null;
  private onLoopComplete: (() => void) | null = null;
  
  // Slow practice mode state
  private baseTempo: number = 120;
  private tempoPercent: number = 100;
  private loopConfig: LoopConfig | null = null;
  private currentNotes: Note[] = [];
  private loopCount: number = 0;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await Tone.start();
    
    // Create a synth that sounds somewhat like a violin
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sawtooth',
      },
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.8,
        release: 0.5,
      },
    }).toDestination();

    // Add some reverb for a more natural sound
    const reverb = new Tone.Reverb({
      decay: 1.5,
      wet: 0.3,
    }).toDestination();
    
    this.synth.connect(reverb);
    
    this.isInitialized = true;
  }

  setOnNotePlay(callback: (noteIndex: number) => void): void {
    this.onNotePlay = callback;
  }

  setOnPlaybackComplete(callback: () => void): void {
    this.onPlaybackComplete = callback;
  }

  setOnLoopComplete(callback: () => void): void {
    this.onLoopComplete = callback;
  }

  // Slow practice mode methods
  setTempoPercent(percent: number): void {
    this.tempoPercent = Math.max(25, Math.min(100, percent));
  }

  getTempoPercent(): number {
    return this.tempoPercent;
  }

  setLoop(config: LoopConfig | null): void {
    this.loopConfig = config;
    this.loopCount = 0;
  }

  getLoopConfig(): LoopConfig | null {
    return this.loopConfig;
  }

  getLoopCount(): number {
    return this.loopCount;
  }

  clearLoop(): void {
    this.loopConfig = null;
    this.loopCount = 0;
  }

  getEffectiveTempo(): number {
    return Math.round(this.baseTempo * (this.tempoPercent / 100));
  }

  async playNotes(notes: Note[], tempo: number = 120): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!notes || notes.length === 0) {
      throw new Error('No notes to play');
    }

    // Always stop and reset before starting new playback
    this.stop();

    // Ensure Tone.js audio context is started (requires user gesture)
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
    
    this.isPlaying = true;
    this.baseTempo = tempo;
    this.currentNotes = notes;
    
    // Apply tempo percent for slow practice mode
    const effectiveTempo = this.getEffectiveTempo();
    const beatDuration = 60 / effectiveTempo;
    
    // Determine which notes to play (all or looped section)
    let notesToPlay = notes;
    let noteIndexOffset = 0;
    
    if (this.loopConfig?.enabled) {
      const startIdx = this.loopConfig.startNoteIndex;
      const endIdx = this.loopConfig.endNoteIndex;
      notesToPlay = notes.slice(startIdx, endIdx + 1);
      noteIndexOffset = startIdx;
      
      // Adjust start times relative to the loop start
      const loopStartTime = notes[startIdx]?.startTime || 0;
      notesToPlay = notesToPlay.map(note => ({
        ...note,
        startTime: note.startTime - loopStartTime
      }));
    }
    
    // Use setTimeout-based scheduling for more reliable playback
    const startTimeMs = performance.now();
    let lastScheduledEndTime = 0;
    
    // Schedule all notes using setTimeout
    notesToPlay.forEach((note, index) => {
      const noteStartMs = note.startTime * beatDuration * 1000;
      const duration = Math.max(0.1, note.duration * beatDuration);
      const noteEndTime = note.startTime + note.duration;
      lastScheduledEndTime = Math.max(lastScheduledEndTime, noteEndTime);
      
      // Validate pitch format (should be like "C4", "G#5", "Bb3")
      const pitchRegex = /^[A-G][#b]?\d+$/;
      if (!pitchRegex.test(note.pitch)) {
        console.warn(`Invalid pitch format: ${note.pitch}, skipping`);
        return;
      }
      
      // Schedule the note using setTimeout
      const timeoutId = setTimeout(() => {
        if (this.synth && this.isPlaying) {
          try {
            this.synth.triggerAttackRelease(
              note.pitch,
              duration,
              undefined,
              (note.velocity || 100) / 127
            );
          } catch (err) {
            console.warn(`Failed to play note ${note.pitch}:`, err);
          }
          
          if (this.onNotePlay) {
            this.onNotePlay(index + noteIndexOffset);
          }
        }
      }, noteStartMs);
      
      // Store timeout ID for cleanup (cast to number for compatibility)
      this.scheduledEvents.push(timeoutId as unknown as number);
    });

    // Schedule playback/loop complete
    if (notesToPlay.length > 0) {
      const endTimeMs = lastScheduledEndTime * beatDuration * 1000 + 100; // Add small buffer
      
      const completeTimeoutId = setTimeout(() => {
        if (this.loopConfig?.enabled && this.isPlaying) {
          this.loopCount++;
          if (this.onLoopComplete) {
            this.onLoopComplete();
          }
          // Continue looping
          this.scheduleLoop();
        } else if (this.isPlaying) {
          this.isPlaying = false;
          if (this.onPlaybackComplete) {
            this.onPlaybackComplete();
          }
        }
      }, endTimeMs);
      
      this.scheduledEvents.push(completeTimeoutId as unknown as number);
    }
  }

  private scheduleLoop(): void {
    if (!this.loopConfig?.enabled || !this.isPlaying) return;
    
    // Clear previous timeouts
    this.scheduledEvents.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.scheduledEvents = [];
    
    const effectiveTempo = this.getEffectiveTempo();
    const beatDuration = 60 / effectiveTempo;
    
    const startIdx = this.loopConfig.startNoteIndex;
    const endIdx = this.loopConfig.endNoteIndex;
    let notesToPlay = this.currentNotes.slice(startIdx, endIdx + 1);
    
    // Adjust start times relative to the loop start
    const loopStartTime = this.currentNotes[startIdx]?.startTime || 0;
    notesToPlay = notesToPlay.map(note => ({
      ...note,
      startTime: note.startTime - loopStartTime
    }));
    
    let lastScheduledEndTime = 0;
    
    notesToPlay.forEach((note, index) => {
      const noteStartMs = note.startTime * beatDuration * 1000;
      const duration = Math.max(0.1, note.duration * beatDuration);
      const noteEndTime = note.startTime + note.duration;
      lastScheduledEndTime = Math.max(lastScheduledEndTime, noteEndTime);
      
      // Validate pitch format
      const pitchRegex = /^[A-G][#b]?\d+$/;
      if (!pitchRegex.test(note.pitch)) {
        return;
      }
      
      const timeoutId = setTimeout(() => {
        if (this.synth && this.isPlaying) {
          try {
            this.synth.triggerAttackRelease(
              note.pitch,
              duration,
              undefined,
              (note.velocity || 100) / 127
            );
          } catch (err) {
            // Silent catch for loop
          }
          
          if (this.onNotePlay) {
            this.onNotePlay(index + startIdx);
          }
        }
      }, noteStartMs);
      
      this.scheduledEvents.push(timeoutId as unknown as number);
    });

    if (notesToPlay.length > 0) {
      const endTimeMs = lastScheduledEndTime * beatDuration * 1000 + 100;
      
      const completeTimeoutId = setTimeout(() => {
        if (this.loopConfig?.enabled && this.isPlaying) {
          this.loopCount++;
          if (this.onLoopComplete) {
            this.onLoopComplete();
          }
          this.scheduleLoop();
        } else if (this.isPlaying) {
          this.isPlaying = false;
          if (this.onPlaybackComplete) {
            this.onPlaybackComplete();
          }
        }
      }, endTimeMs);
      
      this.scheduledEvents.push(completeTimeoutId as unknown as number);
    }
  }

  async playNote(pitch: string, duration: number = 0.5): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.synth) {
      this.synth.triggerAttackRelease(pitch, duration);
    }
  }

  stop(): void {
    this.isPlaying = false;
    
    // Clear all scheduled timeouts
    this.scheduledEvents.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.scheduledEvents = [];
    
    // Release any playing notes
    if (this.synth) {
      this.synth.releaseAll();
    }
  }

  pause(): void {
    Tone.Transport.pause();
    this.isPlaying = false;
  }

  resume(): void {
    Tone.Transport.start();
    this.isPlaying = true;
  }

  setTempo(bpm: number): void {
    Tone.Transport.bpm.value = bpm;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  dispose(): void {
    this.stop();
    
    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }
    
    this.isInitialized = false;
  }
}

// Singleton instance
let playbackInstance: PlaybackService | null = null;

export const getPlaybackService = (): PlaybackService => {
  if (!playbackInstance) {
    playbackInstance = new PlaybackService();
  }
  return playbackInstance;
};

export const disposePlaybackService = (): void => {
  if (playbackInstance) {
    playbackInstance.dispose();
    playbackInstance = null;
  }
};
