import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma, getOrCreateDefaultUser } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  createErrorResponse,
  validateBody,
  validateQuery,
  sanitizeString,
  sanitizeNumber,
  sanitizeArray,
  LIMITS,
  journalEntrySchema,
  idSchema,
} from '@/lib/validation';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Query schema for GET
const journalQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(LIMITS.MAX_LIMIT).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  startDate: z.string().optional().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Invalid startDate format' }
  ),
  endDate: z.string().optional().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Invalid endDate format' }
  ),
});

// Update schema for PUT
const journalUpdateSchema = z.object({
  id: idSchema,
  content: z.string().min(1).max(LIMITS.MAX_STRING_LENGTH).optional(),
  mood: z.coerce.number().int().min(1).max(5).optional().nullable(),
  energy: z.coerce.number().int().min(1).max(5).optional().nullable(),
  goals: z.array(z.string().max(500)).max(20).optional().nullable(),
  recordingIds: z.array(z.string()).max(50).optional().nullable(),
  practiceMinutes: z.coerce.number().int().min(0).max(LIMITS.MAX_PRACTICE_MINUTES).optional().nullable(),
});

// Delete schema
const journalDeleteSchema = z.object({
  id: idSchema,
});

// GET - Fetch journal entries for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.STANDARD, 'journal-get');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryResult = validateQuery(searchParams, journalQuerySchema);
    if (!queryResult.success) {
      return queryResult.error;
    }
    
    const { limit, offset, startDate, endDate } = queryResult.data;

    // Get authenticated user (server-side only)
    const user = await getOrCreateDefaultUser();

    const where: Record<string, unknown> = { userId: user.id };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.date as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.journalEntry.count({ where });

    // Transform entries to match the frontend type
    const transformedEntries = entries.map((entry) => {
      let goals: string[] | undefined;
      let recordingIds: string[] | undefined;
      
      // Safely parse JSON fields
      if (entry.goals) {
        try {
          goals = JSON.parse(entry.goals);
        } catch {
          goals = undefined;
        }
      }
      
      if (entry.recordingIds) {
        try {
          recordingIds = JSON.parse(entry.recordingIds);
        } catch {
          recordingIds = undefined;
        }
      }
      
      return {
        id: entry.id,
        date: entry.date.getTime(),
        content: entry.content,
        mood: entry.mood,
        energy: entry.energy,
        goals,
        recordingIds,
        practiceMinutes: entry.practiceMinutes,
        aiSummary: entry.aiSummary,
        createdAt: entry.createdAt.getTime(),
        updatedAt: entry.updatedAt.getTime(),
      };
    });

    return NextResponse.json({ entries: transformedEntries, total });
  } catch (error) {
    return createErrorResponse('Failed to fetch journal entries', 500, error);
  }
}

// POST - Create a new journal entry for authenticated user
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.STANDARD, 'journal-post');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Validate body
    const bodyResult = await validateBody(request, journalEntrySchema);
    if (!bodyResult.success) {
      return bodyResult.error;
    }
    
    const { content, mood, energy, goals, recordingIds, practiceMinutes, generateSummary } = bodyResult.data;

    // Sanitize content
    const sanitizedContent = sanitizeString(content, LIMITS.MAX_STRING_LENGTH);
    
    // Sanitize arrays
    const validGoals = goals ? sanitizeArray(goals.map(g => sanitizeString(g, 500)), 20) : null;
    const validRecordingIds = recordingIds ? sanitizeArray(recordingIds, 50) : null;

    // Get authenticated user (server-side only)
    const user = await getOrCreateDefaultUser();

    // Generate AI summary if requested
    let aiSummary: string | null = null;
    if (generateSummary && process.env.GOOGLE_AI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
        
        const prompt = `You are a helpful assistant that summarizes practice journal entries. Create a brief, encouraging summary (2-3 sentences) highlighting key accomplishments and areas of focus.

Summarize this practice journal entry:

${sanitizedContent}${mood ? `\nMood: ${mood}/5` : ''}${energy ? `\nEnergy: ${energy}/5` : ''}${practiceMinutes ? `\nPractice time: ${practiceMinutes} minutes` : ''}`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150,
          },
        });
        
        aiSummary = result.response.text() || null;
      } catch (aiError) {
        // Log but don't fail the request
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error generating AI summary:', aiError);
        }
      }
    }

    const entry = await prisma.journalEntry.create({
      data: {
        userId: user.id,
        content: sanitizedContent,
        mood: mood ?? null,
        energy: energy ?? null,
        goals: validGoals ? JSON.stringify(validGoals) : null,
        recordingIds: validRecordingIds ? JSON.stringify(validRecordingIds) : null,
        practiceMinutes: practiceMinutes ?? null,
        aiSummary,
      },
    });

    return NextResponse.json({
      entry: {
        id: entry.id,
        date: entry.date.getTime(),
        content: entry.content,
        mood: entry.mood,
        energy: entry.energy,
        goals: validGoals ?? undefined,
        recordingIds: validRecordingIds ?? undefined,
        practiceMinutes: entry.practiceMinutes,
        aiSummary: entry.aiSummary,
        createdAt: entry.createdAt.getTime(),
        updatedAt: entry.updatedAt.getTime(),
      },
    });
  } catch (error) {
    return createErrorResponse('Failed to create journal entry', 500, error);
  }
}

// PUT - Update a journal entry (only owner can update)
export async function PUT(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.STANDARD, 'journal-put');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get authenticated user (server-side only)
    const user = await getOrCreateDefaultUser();

    // Validate body
    const bodyResult = await validateBody(request, journalUpdateSchema);
    if (!bodyResult.success) {
      return bodyResult.error;
    }
    
    const { id, content, mood, energy, goals, recordingIds, practiceMinutes } = bodyResult.data;

    // Verify ownership before update
    const existingEntry = await prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return createErrorResponse('Journal entry not found', 404);
    }

    if (existingEntry.userId !== user.id) {
      return createErrorResponse('Access denied', 403);
    }

    // Build update data, only including provided fields
    const updateData: Record<string, unknown> = {};
    
    if (content !== undefined) {
      updateData.content = sanitizeString(content, LIMITS.MAX_STRING_LENGTH);
    }
    if (mood !== undefined) {
      updateData.mood = mood;
    }
    if (energy !== undefined) {
      updateData.energy = energy;
    }
    if (goals !== undefined) {
      updateData.goals = goals ? JSON.stringify(sanitizeArray(goals.map(g => sanitizeString(g, 500)), 20)) : null;
    }
    if (recordingIds !== undefined) {
      updateData.recordingIds = recordingIds ? JSON.stringify(sanitizeArray(recordingIds, 50)) : null;
    }
    if (practiceMinutes !== undefined) {
      updateData.practiceMinutes = practiceMinutes;
    }

    const entry = await prisma.journalEntry.update({
      where: { id },
      data: updateData,
    });

    let parsedGoals: string[] | undefined;
    let parsedRecordingIds: string[] | undefined;
    
    if (entry.goals) {
      try {
        parsedGoals = JSON.parse(entry.goals);
      } catch {
        parsedGoals = undefined;
      }
    }
    
    if (entry.recordingIds) {
      try {
        parsedRecordingIds = JSON.parse(entry.recordingIds);
      } catch {
        parsedRecordingIds = undefined;
      }
    }

    return NextResponse.json({
      entry: {
        id: entry.id,
        date: entry.date.getTime(),
        content: entry.content,
        mood: entry.mood,
        energy: entry.energy,
        goals: parsedGoals,
        recordingIds: parsedRecordingIds,
        practiceMinutes: entry.practiceMinutes,
        aiSummary: entry.aiSummary,
        createdAt: entry.createdAt.getTime(),
        updatedAt: entry.updatedAt.getTime(),
      },
    });
  } catch (error) {
    return createErrorResponse('Failed to update journal entry', 500, error);
  }
}

// DELETE - Delete a journal entry (only owner can delete)
export async function DELETE(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.STANDARD, 'journal-delete');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get authenticated user (server-side only)
    const user = await getOrCreateDefaultUser();

    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryResult = validateQuery(searchParams, journalDeleteSchema);
    if (!queryResult.success) {
      return queryResult.error;
    }
    
    const { id } = queryResult.data;

    // Verify ownership before delete
    const existingEntry = await prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return createErrorResponse('Journal entry not found', 404);
    }

    if (existingEntry.userId !== user.id) {
      return createErrorResponse('Access denied', 403);
    }

    await prisma.journalEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse('Failed to delete journal entry', 500, error);
  }
}
