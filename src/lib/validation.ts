import { z } from 'zod';
import { NextResponse } from 'next/server';

// ============================================================================
// Constants
// ============================================================================

export const LIMITS = {
  MAX_STRING_LENGTH: 10000,
  MAX_MESSAGE_LENGTH: 5000,
  MAX_CONVERSATION_HISTORY: 50,
  MAX_ARRAY_LENGTH: 100,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_AUDIO_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_LIMIT: 100,
  MAX_PRACTICE_MINUTES: 1440, // 24 hours
  MAX_XP: 1000000,
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 10,
} as const;

export const ALLOWED_AUDIO_TYPES = [
  'audio/webm',
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/x-wav',
  'audio/wave',
] as const;

// ============================================================================
// Sanitization Helpers
// ============================================================================

/**
 * Sanitize a string by trimming and limiting length
 */
export const sanitizeString = (str: string, maxLength: number = LIMITS.MAX_STRING_LENGTH): string => {
  return str.trim().slice(0, maxLength);
};

/**
 * Sanitize a number within bounds
 */
export const sanitizeNumber = (
  value: number,
  min: number,
  max: number,
  defaultValue: number
): number => {
  if (isNaN(value) || !isFinite(value)) {
    return defaultValue;
  }
  return Math.min(max, Math.max(min, value));
};

/**
 * Sanitize an array by limiting its length
 */
export const sanitizeArray = <T>(arr: T[], maxLength: number = LIMITS.MAX_ARRAY_LENGTH): T[] => {
  return arr.slice(0, maxLength);
};

/**
 * Parse integer with default value
 */
export const parseIntSafe = (value: string | null, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// ============================================================================
// Validation Schemas
// ============================================================================

// Common schemas
export const uuidSchema = z.string().uuid();
export const idSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const dateStringSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid date format',
});

// Pagination schemas
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(LIMITS.MAX_LIMIT).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Journal schemas
export const journalEntrySchema = z.object({
  content: z.string().min(1).max(LIMITS.MAX_STRING_LENGTH),
  mood: z.coerce.number().int().min(1).max(5).optional(),
  energy: z.coerce.number().int().min(1).max(5).optional(),
  goals: z.array(z.string().max(500)).max(20).optional(),
  recordingIds: z.array(z.string()).max(50).optional(),
  practiceMinutes: z.coerce.number().int().min(0).max(LIMITS.MAX_PRACTICE_MINUTES).optional(),
  generateSummary: z.boolean().optional(),
});

// Practice coach schemas
export const practiceCoachSchema = z.object({
  message: z.string().min(1).max(LIMITS.MAX_MESSAGE_LENGTH),
  context: z.object({
    currentExercise: z.string().optional(),
    recentFeedback: z.string().optional(),
    userLevel: z.number().optional(),
  }).optional(),
  conversationHistory: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    content: z.string().max(LIMITS.MAX_MESSAGE_LENGTH),
    timestamp: z.number(),
  })).max(LIMITS.MAX_CONVERSATION_HISTORY).optional(),
});

// Generate exercise schemas
export const generateExerciseSchema = z.object({
  difficulty: z.coerce.number().int().min(LIMITS.MIN_DIFFICULTY).max(LIMITS.MAX_DIFFICULTY).default(3),
  focus: z.enum(['scales', 'arpeggios', 'bowing', 'intonation', 'rhythm', 'mixed']).default('scales'),
  // previousFeedback can be null, undefined, string, or object (from frontend currentAnalysis)
  previousFeedback: z.unknown().optional(),
});

// Session schemas
export const sessionActionSchema = z.enum(['start', 'recordPerformance', 'end']);

export const sessionStartSchema = z.object({
  exerciseId: z.string().max(100).optional(),
  exerciseType: z.string().max(50).optional(),
});

export const sessionRecordPerformanceSchema = z.object({
  sessionId: idSchema,
  pitchAccuracy: z.coerce.number().min(0).max(100),
  rhythmAccuracy: z.coerce.number().min(0).max(100),
  dynamicsScore: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
});

export const sessionEndSchema = z.object({
  sessionId: idSchema,
  durationMins: z.coerce.number().int().min(0).max(LIMITS.MAX_PRACTICE_MINUTES),
});

// User schemas
export const userUpdateSchema = z.object({
  action: z.enum(['addXP', 'addPracticeTime']),
  xp: z.coerce.number().int().min(0).max(LIMITS.MAX_XP).optional(),
  minutes: z.coerce.number().int().min(0).max(LIMITS.MAX_PRACTICE_MINUTES).optional(),
});

// Review queue schemas
export const reviewItemSchema = z.object({
  itemType: z.enum(['scale', 'arpeggio', 'exercise', 'piece', 'technique']),
  itemKey: z.string().min(1).max(100),
  itemName: z.string().min(1).max(200),
});

export const reviewRatingSchema = z.object({
  itemId: idSchema,
  rating: z.coerce.number().int().min(1).max(5),
});

// Exam schemas
export const examComponentResultSchema = z.object({
  componentType: z.string().max(50),
  score: z.coerce.number().min(0).max(100),
  maxScore: z.coerce.number().min(0).max(100),
  analysis: z.record(z.string(), z.unknown()).optional(),
  feedback: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
});

// ============================================================================
// Error Handling
// ============================================================================

export type ApiError = {
  error: string;
  details?: string;
};

/**
 * Create a standardized error response
 */
export const createErrorResponse = (
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiError> => {
  // In development, include details; in production, use generic messages
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (isDev && details) {
    console.error(`API Error: ${message}`, details);
  }

  return NextResponse.json<ApiError>(
    { 
      error: message,
      ...(isDev && details ? { details: String(details) } : {})
    },
    { status }
  );
};

/**
 * Log errors safely without exposing sensitive information
 * In production: Only logs context and message
 * In development: Logs full error for debugging
 */
export const logError = (context: string, error: unknown): void => {
  const isDev = process.env.NODE_ENV !== 'production';
  const message = error instanceof Error ? error.message : 'Unknown error';
  
  if (isDev) {
    // In development, log more details for debugging
    console.error(`[${context}]`, error);
  } else {
    // In production, only log sanitized message
    console.error(`[${context}] ${message}`);
  }
};

/**
 * Safely parse JSON with error handling
 */
export const safeJsonParse = <T>(
  json: string,
  fallback?: T
): { success: true; data: T } | { success: false; error: string } => {
  try {
    const data = JSON.parse(json) as T;
    return { success: true, data };
  } catch (error) {
    if (fallback !== undefined) {
      return { success: true, data: fallback };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid JSON' 
    };
  }
};

/**
 * Validate request body with Zod schema
 */
export const validateBody = async <T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: NextResponse<ApiError> }> => {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return {
        success: false,
        error: createErrorResponse(
          'Validation failed',
          400,
          result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        ),
      };
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: createErrorResponse('Invalid JSON body', 400, error),
    };
  }
};

/**
 * Validate query parameters with Zod schema
 */
export const validateQuery = <T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: NextResponse<ApiError> } => {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  const result = schema.safeParse(params);
  
  if (!result.success) {
    return {
      success: false,
      error: createErrorResponse(
        'Invalid query parameters',
        400,
        result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      ),
    };
  }
  
  return { success: true, data: result.data };
};

/**
 * Validate file upload
 */
export const validateFile = (
  file: File | null,
  options: {
    required?: boolean;
    maxSize?: number;
    allowedTypes?: readonly string[];
  } = {}
): { success: true; file: File | null } | { success: false; error: NextResponse<ApiError> } => {
  const { 
    required = false, 
    maxSize = LIMITS.MAX_FILE_SIZE, 
    allowedTypes 
  } = options;

  if (!file) {
    if (required) {
      return {
        success: false,
        error: createErrorResponse('File is required', 400),
      };
    }
    return { success: true, file: null };
  }

  if (file.size > maxSize) {
    return {
      success: false,
      error: createErrorResponse(
        `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`,
        400
      ),
    };
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: createErrorResponse(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        400
      ),
    };
  }

  return { success: true, file };
};

/**
 * Wrap an async handler with error handling
 */
export const withErrorHandling = <T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiError>> => {
  return handler().catch((error: unknown) => {
    console.error('Unhandled API error:', error instanceof Error ? error.message : error);
    return createErrorResponse('Internal server error', 500);
  });
};
