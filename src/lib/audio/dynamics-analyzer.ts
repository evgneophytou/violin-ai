import type { TimeRange } from '@/types';

export interface DynamicsData {
  amplitudeEnvelope: { time: number; amplitude: number }[];
  dynamicRange: { min: number; max: number };
  averageAmplitude: number;
  crescendos: TimeRange[];
  diminuendos: TimeRange[];
  dynamicVariety: number; // 0-100 score
}

export interface ExpressionAnalysis {
  dynamics: DynamicsData;
  phrasing: {
    peakMoments: number[]; // timestamps of peak moments
    breathPoints: number[]; // suggested breath/phrase points
    musicality: number; // 0-100
  };
  interpretation: {
    detected: string; // 'joyful', 'melancholic', 'intense', etc.
    suggestions: string[];
  };
}

// Analyze amplitude envelope from audio buffer
export const analyzeDynamics = (audioBuffer: AudioBuffer): DynamicsData => {
  const rawData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  // Calculate RMS amplitude for windows of audio
  const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
  const amplitudeEnvelope: { time: number; amplitude: number }[] = [];
  
  for (let i = 0; i < rawData.length; i += windowSize) {
    let sumSquares = 0;
    const end = Math.min(i + windowSize, rawData.length);
    
    for (let j = i; j < end; j++) {
      sumSquares += rawData[j] * rawData[j];
    }
    
    const rms = Math.sqrt(sumSquares / (end - i));
    const dbValue = 20 * Math.log10(Math.max(rms, 0.0001));
    const normalizedDb = Math.max(0, Math.min(100, (dbValue + 60) * (100 / 60)));
    
    amplitudeEnvelope.push({
      time: i / sampleRate,
      amplitude: normalizedDb,
    });
  }
  
  // Calculate dynamic range
  const amplitudes = amplitudeEnvelope.map((e) => e.amplitude);
  const minAmplitude = Math.min(...amplitudes);
  const maxAmplitude = Math.max(...amplitudes);
  const averageAmplitude = amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length;
  
  // Detect crescendos and diminuendos
  const crescendos: TimeRange[] = [];
  const diminuendos: TimeRange[] = [];
  
  const smoothedEnvelope = smoothArray(amplitudes, 5);
  
  let trendStart = 0;
  let trendDirection: 'up' | 'down' | null = null;
  const threshold = 5; // minimum amplitude change to count as trend
  
  for (let i = 1; i < smoothedEnvelope.length; i++) {
    const diff = smoothedEnvelope[i] - smoothedEnvelope[i - 1];
    
    if (Math.abs(diff) > 1) {
      const currentDirection = diff > 0 ? 'up' : 'down';
      
      if (trendDirection === null) {
        trendDirection = currentDirection;
        trendStart = i - 1;
      } else if (currentDirection !== trendDirection) {
        // Trend changed, record previous trend if significant
        const trendChange = Math.abs(
          smoothedEnvelope[i - 1] - smoothedEnvelope[trendStart]
        );
        
        if (trendChange > threshold) {
          const range = {
            start: amplitudeEnvelope[trendStart].time,
            end: amplitudeEnvelope[i - 1].time,
          };
          
          if (trendDirection === 'up') {
            crescendos.push(range);
          } else {
            diminuendos.push(range);
          }
        }
        
        trendDirection = currentDirection;
        trendStart = i - 1;
      }
    }
  }
  
  // Calculate dynamic variety score
  const dynamicVariety = calculateDynamicVariety(amplitudes, minAmplitude, maxAmplitude);
  
  return {
    amplitudeEnvelope,
    dynamicRange: { min: minAmplitude, max: maxAmplitude },
    averageAmplitude,
    crescendos,
    diminuendos,
    dynamicVariety,
  };
};

// Analyze phrasing based on amplitude patterns
export const analyzePhrasing = (
  dynamicsData: DynamicsData,
  duration: number
): ExpressionAnalysis['phrasing'] => {
  const { amplitudeEnvelope } = dynamicsData;
  
  // Find peak moments (local maxima)
  const peakMoments: number[] = [];
  for (let i = 1; i < amplitudeEnvelope.length - 1; i++) {
    const prev = amplitudeEnvelope[i - 1].amplitude;
    const curr = amplitudeEnvelope[i].amplitude;
    const next = amplitudeEnvelope[i + 1].amplitude;
    
    if (curr > prev && curr > next && curr > dynamicsData.averageAmplitude + 10) {
      peakMoments.push(amplitudeEnvelope[i].time);
    }
  }
  
  // Find natural breath/phrase points (significant dips)
  const breathPoints: number[] = [];
  for (let i = 1; i < amplitudeEnvelope.length - 1; i++) {
    const prev = amplitudeEnvelope[i - 1].amplitude;
    const curr = amplitudeEnvelope[i].amplitude;
    const next = amplitudeEnvelope[i + 1].amplitude;
    
    if (curr < prev && curr < next && curr < dynamicsData.averageAmplitude - 10) {
      breathPoints.push(amplitudeEnvelope[i].time);
    }
  }
  
  // Calculate musicality score based on dynamic variation and phrasing
  const musicality = calculateMusicalityScore(dynamicsData, peakMoments, breathPoints);
  
  return {
    peakMoments,
    breathPoints,
    musicality,
  };
};

// Generate interpretation suggestions
export const analyzeInterpretation = (
  dynamicsData: DynamicsData,
  phrasingData: ExpressionAnalysis['phrasing']
): ExpressionAnalysis['interpretation'] => {
  const suggestions: string[] = [];
  
  // Detect overall character
  let detected = 'neutral';
  
  if (dynamicsData.dynamicRange.max - dynamicsData.dynamicRange.min > 40) {
    if (dynamicsData.crescendos.length > dynamicsData.diminuendos.length) {
      detected = 'intense';
      suggestions.push('Great dynamic build-up! Consider adding more contrast in softer passages.');
    } else {
      detected = 'melancholic';
      suggestions.push('Nice fading dynamics. Try building more towards climactic moments.');
    }
  } else if (dynamicsData.averageAmplitude > 60) {
    detected = 'powerful';
    suggestions.push('Strong playing! Add more quiet moments for contrast.');
  } else if (dynamicsData.averageAmplitude < 40) {
    detected = 'gentle';
    suggestions.push('Delicate touch! Try adding more dynamic peaks for expression.');
  }
  
  // Add specific suggestions based on analysis
  if (dynamicsData.dynamicVariety < 30) {
    suggestions.push('Increase your dynamic range - try playing some passages much softer or louder.');
  }
  
  if (phrasingData.peakMoments.length < 2) {
    suggestions.push('Create more musical peaks to shape your phrases.');
  }
  
  if (dynamicsData.crescendos.length === 0 && dynamicsData.diminuendos.length === 0) {
    suggestions.push('Add gradual crescendos and diminuendos for more musical flow.');
  }
  
  if (phrasingData.musicality < 50) {
    suggestions.push('Think about the shape of each phrase - where does it want to go?');
  }
  
  return {
    detected,
    suggestions,
  };
};

// Full expression analysis
export const analyzeExpression = async (
  audioBlob: Blob
): Promise<ExpressionAnalysis> => {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const dynamics = analyzeDynamics(audioBuffer);
  const phrasing = analyzePhrasing(dynamics, audioBuffer.duration);
  const interpretation = analyzeInterpretation(dynamics, phrasing);
  
  audioContext.close();
  
  return {
    dynamics,
    phrasing,
    interpretation,
  };
};

// Helper functions
function smoothArray(arr: number[], windowSize: number): number[] {
  const result: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let i = 0; i < arr.length; i++) {
    let sum = 0;
    let count = 0;
    
    for (let j = Math.max(0, i - halfWindow); j <= Math.min(arr.length - 1, i + halfWindow); j++) {
      sum += arr[j];
      count++;
    }
    
    result.push(sum / count);
  }
  
  return result;
}

function calculateDynamicVariety(
  amplitudes: number[],
  min: number,
  max: number
): number {
  const range = max - min;
  if (range === 0) return 0;
  
  // Calculate standard deviation as a measure of variety
  const mean = amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length;
  const variance = amplitudes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amplitudes.length;
  const stdDev = Math.sqrt(variance);
  
  // Normalize to 0-100 scale
  const varietyScore = Math.min(100, (stdDev / (range / 2)) * 100);
  return Math.round(varietyScore);
}

function calculateMusicalityScore(
  dynamics: DynamicsData,
  peaks: number[],
  breaths: number[]
): number {
  let score = 50; // Base score
  
  // Good dynamic variety
  score += Math.min(20, dynamics.dynamicVariety * 0.2);
  
  // Presence of crescendos and diminuendos
  const dynamicChanges = dynamics.crescendos.length + dynamics.diminuendos.length;
  score += Math.min(15, dynamicChanges * 3);
  
  // Good phrasing (peaks and breaths)
  score += Math.min(10, peaks.length * 2);
  score += Math.min(5, breaths.length);
  
  return Math.min(100, Math.round(score));
}
