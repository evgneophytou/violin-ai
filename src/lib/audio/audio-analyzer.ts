import type { DetectedPitch } from '@/types';
import { getPitchDetector } from './pitch-detector';

export interface AudioAnalysisResult {
  detectedNotes: Array<{
    pitch: DetectedPitch;
    timestamp: number;
    duration: number;
  }>;
  averageVolume: number;
  volumeRange: { min: number; max: number };
  tempo: number | null;
}

// Memory limits
const MAX_RECORDING_CHUNKS = 600; // ~60 seconds at 100ms intervals
const MAX_RECORDING_SIZE_BYTES = 100 * 1024 * 1024; // 100MB max

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordedSize: number = 0;
  private isRecording: boolean = false;
  private animationFrameId: number | null = null;
  
  // Reusable buffers to avoid allocation on every frame
  private timeDomainBuffer: Float32Array<ArrayBuffer> | null = null;
  private frequencyBuffer: Uint8Array<ArrayBuffer> | null = null;
  
  private onPitchDetected: ((pitch: DetectedPitch | null) => void) | null = null;
  private onRecordingComplete: ((blob: Blob) => void) | null = null;

  async initialize(): Promise<void> {
    try {
      this.audioContext = new AudioContext({ sampleRate: 44100 });
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;
      
      // Pre-allocate buffers
      this.timeDomainBuffer = new Float32Array(this.analyserNode.fftSize);
      this.frequencyBuffer = new Uint8Array(this.analyserNode.frequencyBinCount);
      
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.analyserNode);
      
      // Initialize pitch detector
      getPitchDetector(this.audioContext.sampleRate, this.analyserNode.fftSize);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to initialize audio analyzer:', error);
      }
      throw new Error('Microphone access denied or unavailable');
    }
  }

  setOnPitchDetected(callback: (pitch: DetectedPitch | null) => void): void {
    this.onPitchDetected = callback;
  }

  setOnRecordingComplete(callback: (blob: Blob) => void): void {
    this.onRecordingComplete = callback;
  }

  startPitchDetection(): void {
    if (!this.analyserNode || !this.audioContext || !this.timeDomainBuffer) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Audio analyzer not initialized');
      }
      return;
    }

    const pitchDetector = getPitchDetector();
    const dataArray = this.timeDomainBuffer;

    const detectPitch = () => {
      if (!this.analyserNode) return;
      
      // Reuse the pre-allocated buffer
      this.analyserNode.getFloatTimeDomainData(dataArray);
      const pitch = pitchDetector.detectPitch(dataArray);
      
      if (this.onPitchDetected) {
        this.onPitchDetected(pitch);
      }
      
      this.animationFrameId = requestAnimationFrame(detectPitch);
    };

    detectPitch();
  }

  stopPitchDetection(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  startRecording(): void {
    if (!this.mediaStream) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Media stream not available');
      }
      return;
    }

    // Reset recording state
    this.recordedChunks = [];
    this.recordedSize = 0;
    
    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // Check memory limits
        if (this.recordedChunks.length >= MAX_RECORDING_CHUNKS) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Recording chunk limit reached, stopping recording');
          }
          this.stopRecording();
          return;
        }
        
        if (this.recordedSize + event.data.size > MAX_RECORDING_SIZE_BYTES) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Recording size limit reached, stopping recording');
          }
          this.stopRecording();
          return;
        }
        
        this.recordedChunks.push(event.data);
        this.recordedSize += event.data.size;
      }
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      if (this.onRecordingComplete) {
        this.onRecordingComplete(blob);
      }
      // Clear chunks after creating blob to free memory
      this.recordedChunks = [];
      this.recordedSize = 0;
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
    this.isRecording = true;
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  getVolume(): number {
    if (!this.analyserNode || !this.timeDomainBuffer) return 0;

    // Reuse the pre-allocated buffer
    this.analyserNode.getFloatTimeDomainData(this.timeDomainBuffer);

    let sum = 0;
    const bufferLength = this.timeDomainBuffer.length;
    for (let i = 0; i < bufferLength; i++) {
      sum += this.timeDomainBuffer[i] * this.timeDomainBuffer[i];
    }
    
    return Math.sqrt(sum / bufferLength);
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyserNode || !this.frequencyBuffer) {
      return new Uint8Array(0);
    }

    // Reuse the pre-allocated buffer
    this.analyserNode.getByteFrequencyData(this.frequencyBuffer);
    
    return this.frequencyBuffer;
  }

  dispose(): void {
    this.stopPitchDetection();
    this.stopRecording();
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyserNode = null;
    this.mediaRecorder = null;
    
    // Clear buffers
    this.timeDomainBuffer = null;
    this.frequencyBuffer = null;
    this.recordedChunks = [];
    this.recordedSize = 0;
  }
}

// Singleton instance
let analyzerInstance: AudioAnalyzer | null = null;

export const getAudioAnalyzer = (): AudioAnalyzer => {
  if (!analyzerInstance) {
    analyzerInstance = new AudioAnalyzer();
  }
  return analyzerInstance;
};

export const disposeAudioAnalyzer = (): void => {
  if (analyzerInstance) {
    analyzerInstance.dispose();
    analyzerInstance = null;
  }
};
