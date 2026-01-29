import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  generateMusicPrompt, 
  createExerciseFromMusicXML, 
  generateFallbackExercise 
} from '@/lib/ai/music-generator';
import {
  validateBody,
  createErrorResponse,
  generateExerciseSchema,
  logError,
} from '@/lib/validation';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type { GenerateExerciseResponse } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.AI_GENERATE, 'generate-exercise');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    // Validate body
    const bodyResult = await validateBody(request, generateExerciseSchema);
    if (!bodyResult.success) {
      return bodyResult.error;
    }
    
    const { difficulty, focus, previousFeedback } = bodyResult.data;

    // Note: previousFeedback is a text string from the request
    // The generateMusicPrompt function expects PerformanceAnalysis, so we pass undefined
    // In a full implementation, you would parse/validate previousFeedback into PerformanceAnalysis
    const _ = previousFeedback; // Acknowledge but don't use raw string

    // Check if Google AI API key is available
    if (!process.env.GOOGLE_AI_API_KEY) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('No Google AI API key, using fallback exercise generator');
      }
      const exercise = generateFallbackExercise(difficulty, focus);
      return NextResponse.json<GenerateExerciseResponse>({ exercise });
    }

    try {
      // Generate the prompt (previousFeedback not used for now as it needs to be PerformanceAnalysis type)
      const prompt = generateMusicPrompt(difficulty, focus);

      // Call Google Gemini API
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
      
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ 
            text: `You are an expert violin pedagogy assistant that generates valid MusicXML exercises. Always output complete, well-formed MusicXML documents.\n\n${prompt}` 
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        },
      });

      let musicXML = result.response.text();

      if (!musicXML) {
        throw new Error('No response from Gemini');
      }

      // Strip markdown code blocks if present (Gemini sometimes wraps XML in ```xml...```)
      musicXML = musicXML
        .replace(/^```xml\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      // Validate that it looks like MusicXML
      if (!musicXML.includes('<?xml') || !musicXML.includes('score-partwise')) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Invalid MusicXML response, using fallback');
        }
        const exercise = generateFallbackExercise(difficulty, focus);
        return NextResponse.json<GenerateExerciseResponse>({ exercise });
      }

      // Create the exercise object
      const exercise = createExerciseFromMusicXML(musicXML, difficulty, focus);

      return NextResponse.json<GenerateExerciseResponse>({ exercise });
    } catch (apiError) {
      logError('generate-exercise/gemini', apiError);
      // Fallback to local generation
      const exercise = generateFallbackExercise(difficulty, focus);
      return NextResponse.json<GenerateExerciseResponse>({ exercise });
    }
  } catch (error) {
    return createErrorResponse('Failed to generate exercise', 500, error);
  }
}
