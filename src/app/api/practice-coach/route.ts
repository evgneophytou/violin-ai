import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  formatConversationForAPI, 
  generateLocalCoachResponse 
} from '@/lib/ai/practice-coach-agent';
import {
  validateBody,
  createErrorResponse,
  practiceCoachSchema,
  sanitizeString,
  sanitizeArray,
  LIMITS,
  logError,
} from '@/lib/validation';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.AI_COACH, 'practice-coach');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    // Validate body
    const bodyResult = await validateBody(request, practiceCoachSchema);
    if (!bodyResult.success) {
      return bodyResult.error;
    }
    
    const { message, context, conversationHistory } = bodyResult.data;

    // Sanitize message
    const sanitizedMessage = sanitizeString(message, LIMITS.MAX_MESSAGE_LENGTH);

    // Build a proper CoachContext from the simplified request context
    // The request context has simplified types, we need to convert to full CoachContext
    const safeContext = {
      currentExercise: undefined, // Would need ExerciseMetadata type from exercise
      recentPerformance: undefined, // Would need PerformanceAnalysis type
      userLevel: context?.userLevel ?? 1,
      practiceHistory: undefined,
    };

    // Limit and sanitize conversation history (type matches ChatMessage)
    const limitedHistory = conversationHistory 
      ? sanitizeArray(conversationHistory, LIMITS.MAX_CONVERSATION_HISTORY).map(msg => ({
          id: msg.id,
          role: msg.role,
          content: sanitizeString(msg.content, LIMITS.MAX_MESSAGE_LENGTH),
          timestamp: msg.timestamp,
        }))
      : [];

    // Check if Google AI API key is available
    if (!process.env.GOOGLE_AI_API_KEY) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('No Google AI API key, using local coach response');
      }
      const localResponse = generateLocalCoachResponse(sanitizedMessage, safeContext);
      return new Response(
        JSON.stringify({ message: localResponse }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      // Format conversation for API
      const formattedMessages = formatConversationForAPI(limitedHistory, safeContext);
      
      // Build the conversation history for Gemini
      const systemPrompt = formattedMessages.find(m => m.role === 'system')?.content || '';
      const chatHistory = formattedMessages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

      // Get the model with streaming
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-001',
        systemInstruction: systemPrompt,
      });

      // Start a chat session
      const chat = model.startChat({
        history: chatHistory as { role: 'user' | 'model'; parts: { text: string }[] }[],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      });

      // Send the message and get streaming response
      const streamResult = await chat.sendMessageStream(sanitizedMessage);

      // Create a ReadableStream to stream the response
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamResult.stream) {
              const text = chunk.text();
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (apiError) {
      logError('practice-coach/gemini', apiError);
      // Fallback to local response
      const localResponse = generateLocalCoachResponse(sanitizedMessage, safeContext);
      return new Response(
        JSON.stringify({ message: localResponse }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    logError('practice-coach', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
