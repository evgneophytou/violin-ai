import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  generateFeedbackPrompt, 
  parseFeedbackResponse,
  generateLocalFeedback 
} from '@/lib/ai/feedback-agent';
import {
  createErrorResponse,
  validateFile,
  safeJsonParse,
  LIMITS,
  ALLOWED_AUDIO_TYPES,
  logError,
} from '@/lib/validation';
import type { AnalyzePerformanceResponse, Note, ExerciseMetadata } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const audioFile = formData.get('audio') as File | null;
    const expectedNotesStr = formData.get('expectedNotes') as string;
    const metadataStr = formData.get('metadata') as string;
    
    // Validate required fields
    if (!expectedNotesStr || !metadataStr) {
      return createErrorResponse('Missing required fields: expectedNotes and metadata', 400);
    }
    
    // Validate audio file if provided
    const fileValidation = validateFile(audioFile, {
      required: false,
      maxSize: LIMITS.MAX_AUDIO_FILE_SIZE,
      allowedTypes: ALLOWED_AUDIO_TYPES,
    });
    
    if (!fileValidation.success) {
      return fileValidation.error;
    }
    
    // Safely parse JSON fields
    const notesResult = safeJsonParse<Note[]>(expectedNotesStr);
    if (!notesResult.success) {
      return createErrorResponse('Invalid expectedNotes JSON', 400, notesResult.error);
    }
    const expectedNotes = notesResult.data;
    
    const metadataResult = safeJsonParse<ExerciseMetadata>(metadataStr);
    if (!metadataResult.success) {
      return createErrorResponse('Invalid metadata JSON', 400, metadataResult.error);
    }
    const metadata = metadataResult.data;

    // Validate metadata fields
    if (metadata.difficulty !== undefined) {
      metadata.difficulty = Math.min(LIMITS.MAX_DIFFICULTY, Math.max(LIMITS.MIN_DIFFICULTY, metadata.difficulty));
    }

    // Check if Google AI API key is available
    if (!process.env.GOOGLE_AI_API_KEY) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('No Google AI API key, using local feedback');
      }
      const analysis = generateLocalFeedback([], expectedNotes, metadata);
      return NextResponse.json<AnalyzePerformanceResponse>({ analysis });
    }

    try {
      // Generate the feedback prompt
      const textPrompt = generateFeedbackPrompt(expectedNotes, metadata);

      // Note: For full audio analysis, you would need to use audio processing APIs.
      // For this implementation, we use text-based analysis with Gemini.
      let contextualInfo = '';
      if (fileValidation.file) {
        contextualInfo = `
Note: An audio recording was provided but audio analysis requires specialized processing.
For this session, please provide feedback based on typical beginner/intermediate student patterns
at difficulty level ${metadata.difficulty}.
`;
      }

      // Call Google Gemini API for text-based feedback
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
      
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ 
            text: `You are an expert violin teacher providing constructive feedback. Provide detailed, encouraging feedback in the specified JSON format.\n\n${textPrompt}${contextualInfo}` 
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
        },
      });

      const responseText = result.response.text();

      if (!responseText) {
        throw new Error('No response from Gemini');
      }

      // Parse the feedback response
      const analysis = parseFeedbackResponse(responseText);

      if (!analysis) {
        throw new Error('Failed to parse feedback response');
      }

      return NextResponse.json<AnalyzePerformanceResponse>({ analysis });
    } catch (apiError) {
      logError('analyze-performance/gemini', apiError);
      // Fallback to local analysis
      const analysis = generateLocalFeedback([], expectedNotes, metadata);
      return NextResponse.json<AnalyzePerformanceResponse>({ analysis });
    }
  } catch (error) {
    return createErrorResponse('Failed to analyze performance', 500, error);
  }
}
