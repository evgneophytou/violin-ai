import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { logError } from '@/lib/validation';
import { FEATURES } from '@/lib/analytics/tracking';

// Validation schema for incoming events
const eventSchema = z.object({
  event: z.string().min(1).max(100),
  feature: z.string().min(1).max(50),
  properties: z.record(z.string(), z.unknown()).optional(),
  duration: z.number().int().min(0).max(86400).optional(), // Max 24 hours
  timestamp: z.number().int().positive(),
});

const requestSchema = z.object({
  sessionId: z.string().min(1).max(100),
  events: z.array(eventSchema).min(1).max(50), // Max 50 events per batch
});

// Validate feature name
const validFeatures = new Set(Object.values(FEATURES));

/**
 * POST /api/analytics/events
 * Receives batched analytics events from the client
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (100 events per minute)
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.STANDARD, 'analytics-events');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request format', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { sessionId, events } = parseResult.data;

    // Filter and validate events
    const validEvents = events.filter(event => {
      // Check if feature is valid
      if (!validFeatures.has(event.feature as typeof FEATURES[keyof typeof FEATURES])) {
        return false;
      }
      
      // Check timestamp is reasonable (within last hour)
      const hourAgo = Date.now() - 60 * 60 * 1000;
      if (event.timestamp < hourAgo) {
        return false;
      }
      
      return true;
    });

    if (validEvents.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    // Hash user identification for privacy (use IP as fallback)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIP = forwardedFor?.split(',')[0].trim() || 'unknown';
    const userHash = await hashString(`${clientIP}-${sessionId}`);

    // Batch insert events
    await prisma.analyticsEvent.createMany({
      data: validEvents.map(event => ({
        sessionId,
        userId: userHash,
        event: event.event,
        feature: event.feature,
        properties: event.properties ? JSON.parse(JSON.stringify(event.properties)) : undefined,
        duration: event.duration,
        timestamp: new Date(event.timestamp),
      })),
    });

    // Track/update feature sessions based on events
    await updateFeatureSessions(sessionId, userHash, validEvents);

    return NextResponse.json({
      success: true,
      processed: validEvents.length,
    });
  } catch (error) {
    logError('analytics/events', error);
    return NextResponse.json(
      { error: 'Failed to process analytics events' },
      { status: 500 }
    );
  }
}

/**
 * Update feature sessions based on incoming events
 */
async function updateFeatureSessions(
  sessionId: string,
  userId: string,
  events: z.infer<typeof eventSchema>[]
): Promise<void> {
  // Group events by feature to track sessions
  const featureEvents = new Map<string, { start?: number; end?: number; duration?: number }>();

  for (const event of events) {
    const existing = featureEvents.get(event.feature) || {};
    
    if (event.event === 'tab_viewed' || event.event === 'session_started') {
      existing.start = event.timestamp;
    } else if (event.event === 'session_ended') {
      existing.end = event.timestamp;
      existing.duration = event.duration;
    }
    
    featureEvents.set(event.feature, existing);
  }

  // Upsert feature sessions
  for (const [feature, data] of featureEvents) {
    if (data.start) {
      // Create or update session
      await prisma.featureSession.upsert({
        where: {
          id: `${sessionId}-${feature}-${Math.floor(data.start / 60000)}`, // Round to minute for dedup
        },
        create: {
          id: `${sessionId}-${feature}-${Math.floor(data.start / 60000)}`,
          sessionId,
          userId,
          feature,
          startedAt: new Date(data.start),
          endedAt: data.end ? new Date(data.end) : undefined,
          duration: data.duration,
        },
        update: {
          endedAt: data.end ? new Date(data.end) : undefined,
          duration: data.duration,
        },
      });
    }
  }
}

/**
 * Simple hash function for privacy
 */
async function hashString(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }
  
  // Fallback for environments without crypto.subtle
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).slice(0, 16);
}
