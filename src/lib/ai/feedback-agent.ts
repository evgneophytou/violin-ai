import type { PerformanceAnalysis, Note, ExerciseMetadata } from '@/types';

export const generateFeedbackPrompt = (
  expectedNotes: Note[],
  exerciseMetadata: ExerciseMetadata
): string => {
  const notesList = expectedNotes.map((n, i) => 
    `${i + 1}. ${n.pitch} (${n.duration} beats at ${n.startTime})`
  ).join('\n');
  
  return `You are an expert violin teacher analyzing a student's performance. The student played an exercise with the following expected notes:

${notesList}

Exercise details:
- Title: ${exerciseMetadata.title}
- Difficulty: ${exerciseMetadata.difficulty}/10
- Key: ${exerciseMetadata.key}
- Tempo: ${exerciseMetadata.tempo} BPM
- Focus: ${exerciseMetadata.focus}
- Techniques: ${exerciseMetadata.techniques.join(', ')}

Listen to the audio recording and analyze the performance. Provide detailed feedback on:

1. PITCH ACCURACY (0-100%):
   - Overall intonation quality
   - Specific notes that were sharp or flat
   - Suggestions for improvement

2. RHYTHM ACCURACY (0-100%):
   - Tempo consistency
   - Note duration accuracy
   - Any rushing or dragging tendencies
   - Problem areas (measure/beat numbers)

3. DYNAMICS:
   - Whether dynamic markings were followed
   - Dynamic range achieved
   - Suggestions for expression

4. PHRASING:
   - Musical line and breath marks
   - Legato quality
   - Articulation clarity

5. OVERALL SCORE (0-100):
   - Weighted average of all aspects

6. ENCOURAGEMENT:
   - A positive, constructive message

7. NEXT FOCUS:
   - The single most important area to work on next

Respond in JSON format matching this structure:
{
  "pitch": {
    "accuracy": number,
    "sharpNotes": ["note strings"],
    "flatNotes": ["note strings"],
    "averageDeviation": number,
    "suggestions": ["string"]
  },
  "rhythm": {
    "accuracy": number,
    "rushingTendency": boolean,
    "draggingTendency": boolean,
    "problemAreas": [{"start": number, "end": number}],
    "tempoConsistency": number,
    "suggestions": ["string"]
  },
  "dynamics": {
    "followedMarkings": boolean,
    "dynamicRange": {"min": number, "max": number},
    "crescendoControl": number,
    "diminuendoControl": number,
    "suggestions": ["string"]
  },
  "phrasing": {
    "breathMarks": boolean,
    "musicalLine": "string",
    "legato": number,
    "articulation": number,
    "suggestions": ["string"]
  },
  "overallScore": number,
  "encouragement": "string",
  "nextFocus": "string"
}`;
};

export const parseFeedbackResponse = (response: string): PerformanceAnalysis | null => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and ensure all required fields exist
    const analysis: PerformanceAnalysis = {
      pitch: {
        accuracy: parsed.pitch?.accuracy ?? 75,
        sharpNotes: parsed.pitch?.sharpNotes?.map((n: string) => ({ pitch: n, frequency: 0, duration: 0, startTime: 0 })) ?? [],
        flatNotes: parsed.pitch?.flatNotes?.map((n: string) => ({ pitch: n, frequency: 0, duration: 0, startTime: 0 })) ?? [],
        averageDeviation: parsed.pitch?.averageDeviation ?? 10,
        suggestions: parsed.pitch?.suggestions ?? [],
      },
      rhythm: {
        accuracy: parsed.rhythm?.accuracy ?? 75,
        rushingTendency: parsed.rhythm?.rushingTendency ?? false,
        draggingTendency: parsed.rhythm?.draggingTendency ?? false,
        problemAreas: parsed.rhythm?.problemAreas ?? [],
        tempoConsistency: parsed.rhythm?.tempoConsistency ?? 80,
        suggestions: parsed.rhythm?.suggestions ?? [],
      },
      dynamics: {
        followedMarkings: parsed.dynamics?.followedMarkings ?? true,
        dynamicRange: parsed.dynamics?.dynamicRange ?? { min: 40, max: 90 },
        crescendoControl: parsed.dynamics?.crescendoControl ?? 70,
        diminuendoControl: parsed.dynamics?.diminuendoControl ?? 70,
        suggestions: parsed.dynamics?.suggestions ?? [],
      },
      phrasing: {
        breathMarks: parsed.phrasing?.breathMarks ?? true,
        musicalLine: parsed.phrasing?.musicalLine ?? 'Good overall phrasing',
        legato: parsed.phrasing?.legato ?? 75,
        articulation: parsed.phrasing?.articulation ?? 75,
        suggestions: parsed.phrasing?.suggestions ?? [],
      },
      overallScore: parsed.overallScore ?? 75,
      encouragement: parsed.encouragement ?? 'Good effort! Keep practicing.',
      nextFocus: parsed.nextFocus ?? 'Continue working on intonation',
      timestamp: Date.now(),
    };
    
    return analysis;
  } catch (error) {
    console.error('Error parsing feedback response:', error);
    return null;
  }
};

// Generate feedback without AI (based on pitch detection data)
export const generateLocalFeedback = (
  detectedPitches: Array<{ pitch: string; cents: number; clarity: number }>,
  expectedNotes: Note[],
  exerciseMetadata: ExerciseMetadata
): PerformanceAnalysis => {
  // Calculate pitch accuracy
  let correctPitches = 0;
  const sharpNotes: Note[] = [];
  const flatNotes: Note[] = [];
  let totalDeviation = 0;
  
  detectedPitches.forEach((detected, index) => {
    const expected = expectedNotes[index];
    if (!expected) return;
    
    // Check if pitch matches (within 50 cents)
    const expectedPitch = expected.pitch.replace(/\d/g, '');
    const detectedPitch = detected.pitch;
    
    if (expectedPitch === detectedPitch && Math.abs(detected.cents) < 50) {
      correctPitches++;
    }
    
    if (detected.cents > 15) {
      sharpNotes.push(expected);
    } else if (detected.cents < -15) {
      flatNotes.push(expected);
    }
    
    totalDeviation += Math.abs(detected.cents);
  });
  
  const pitchAccuracy = detectedPitches.length > 0 
    ? Math.round((correctPitches / detectedPitches.length) * 100)
    : 0;
  
  const averageDeviation = detectedPitches.length > 0
    ? Math.round(totalDeviation / detectedPitches.length)
    : 0;
  
  // Generate suggestions based on analysis
  const pitchSuggestions: string[] = [];
  if (sharpNotes.length > flatNotes.length) {
    pitchSuggestions.push('You tend to play sharp. Try relaxing your left hand slightly.');
  } else if (flatNotes.length > sharpNotes.length) {
    pitchSuggestions.push('You tend to play flat. Ensure your fingers are pressing firmly.');
  }
  if (averageDeviation > 20) {
    pitchSuggestions.push('Practice with a tuner to improve overall intonation.');
  }
  
  // Generate rhythm feedback (simplified without timing data)
  const rhythmAccuracy = Math.max(50, pitchAccuracy - 10 + Math.floor(Math.random() * 20));
  
  // Generate overall score
  const overallScore = Math.round(
    (pitchAccuracy * 0.4) + 
    (rhythmAccuracy * 0.3) + 
    (75 * 0.15) + // dynamics placeholder
    (75 * 0.15)   // phrasing placeholder
  );
  
  // Generate encouragement based on score
  let encouragement: string;
  if (overallScore >= 90) {
    encouragement = 'Excellent work! Your playing shows great musicality and precision.';
  } else if (overallScore >= 75) {
    encouragement = 'Good job! You\'re making solid progress. Keep up the focused practice.';
  } else if (overallScore >= 60) {
    encouragement = 'Nice effort! With continued practice, you\'ll see improvement.';
  } else {
    encouragement = 'Keep practicing! Every session builds your skills.';
  }
  
  // Determine next focus
  let nextFocus: string;
  if (pitchAccuracy < rhythmAccuracy) {
    nextFocus = 'Focus on intonation - practice slow scales with a tuner';
  } else {
    nextFocus = 'Focus on rhythm - practice with a metronome';
  }
  
  return {
    pitch: {
      accuracy: pitchAccuracy,
      sharpNotes,
      flatNotes,
      averageDeviation,
      suggestions: pitchSuggestions,
    },
    rhythm: {
      accuracy: rhythmAccuracy,
      rushingTendency: false,
      draggingTendency: false,
      problemAreas: [],
      tempoConsistency: rhythmAccuracy,
      suggestions: ['Practice with a metronome for better tempo control'],
    },
    dynamics: {
      followedMarkings: true,
      dynamicRange: { min: 50, max: 85 },
      crescendoControl: 70,
      diminuendoControl: 70,
      suggestions: ['Experiment with a wider dynamic range'],
    },
    phrasing: {
      breathMarks: true,
      musicalLine: 'Developing musical phrasing',
      legato: 75,
      articulation: 75,
      suggestions: ['Think about the shape of each phrase'],
    },
    overallScore,
    encouragement,
    nextFocus,
    timestamp: Date.now(),
  };
};
