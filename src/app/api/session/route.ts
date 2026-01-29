import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma, getOrCreateDefaultUser, createPracticeSession, endPracticeSession, recordPerformance } from '@/lib/db';
import { calculateExerciseXP, calculateStreakXP } from '@/lib/gamification/xp-calculator';
import { checkLevelUp } from '@/lib/gamification/level-system';
import { calculateNewStreak } from '@/lib/gamification/streak-tracker';
import { checkAndUnlockAchievements, type UserStats } from '@/lib/gamification/achievements';
import { recordReview, type Rating } from '@/lib/ai/spaced-repetition-agent';
import {
  validateBody,
  validateQuery,
  createErrorResponse,
  sanitizeNumber,
  idSchema,
  LIMITS,
} from '@/lib/validation';

// Query schema for GET
const sessionQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(LIMITS.MAX_LIMIT).default(10),
});

// Action schemas for POST
const sessionActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('start'),
    data: z.object({
      focusArea: z.enum(['scales', 'arpeggios', 'bowing', 'intonation', 'rhythm', 'mixed']).optional(),
      difficulty: z.coerce.number().int().min(LIMITS.MIN_DIFFICULTY).max(LIMITS.MAX_DIFFICULTY).optional(),
    }),
  }),
  z.object({
    action: z.literal('recordPerformance'),
    data: z.object({
      sessionId: idSchema,
      exerciseId: z.string().max(100).optional(),
      exerciseTitle: z.string().max(200).optional(),
      score: z.coerce.number().min(0).max(100),
      pitchAcc: z.coerce.number().min(0).max(100).optional(),
      rhythmAcc: z.coerce.number().min(0).max(100).optional(),
      dynamicsScore: z.coerce.number().min(0).max(100).optional(),
      phrasingScore: z.coerce.number().min(0).max(100).optional(),
      focusArea: z.string().max(50).optional(),
    }),
  }),
  z.object({
    action: z.literal('end'),
    data: z.object({
      sessionId: idSchema,
      durationMins: z.coerce.number().int().min(0).max(LIMITS.MAX_PRACTICE_MINUTES),
    }),
  }),
]);

// GET /api/session - Get user's practice sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryResult = validateQuery(searchParams, sessionQuerySchema);
    if (!queryResult.success) {
      return queryResult.error;
    }
    
    const { limit } = queryResult.data;
    const user = await getOrCreateDefaultUser();
    
    const sessions = await prisma.practiceSession.findMany({
      where: { userId: user.id },
      include: { performances: true },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    
    return NextResponse.json({ sessions });
  } catch (error) {
    return createErrorResponse('Failed to get sessions', 500, error);
  }
}

// POST /api/session - Create, update, or complete session
export async function POST(request: NextRequest) {
  try {
    // Validate body
    const bodyResult = await validateBody(request, sessionActionSchema);
    if (!bodyResult.success) {
      return bodyResult.error;
    }
    
    const { action, data } = bodyResult.data;
    const user = await getOrCreateDefaultUser();
    
    switch (action) {
      case 'start': {
        const { focusArea, difficulty } = data;
        const session = await createPracticeSession(user.id, focusArea, difficulty);
        
        // Update streak
        const { newStreak, isNewDay } = calculateNewStreak(
          user.currentStreak,
          user.lastPracticeAt
        );
        
        let streakXP = 0;
        if (isNewDay) {
          const streakResult = calculateStreakXP(newStreak, user.currentStreak);
          streakXP = streakResult.xp;
        }
        
        // Update user streak and XP
        await prisma.user.update({
          where: { id: user.id },
          data: {
            currentStreak: newStreak,
            longestStreak: Math.max(user.longestStreak, newStreak),
            lastPracticeAt: new Date(),
            xp: { increment: streakXP },
          },
        });
        
        return NextResponse.json({ 
          session, 
          streakXP,
          newStreak,
          isNewDay,
        });
      }
      
      case 'recordPerformance': {
        const { sessionId, exerciseId, exerciseTitle, score, pitchAcc, rhythmAcc, dynamicsScore, phrasingScore, focusArea } = data;
        
        // Sanitize scores
        const sanitizedScore = sanitizeNumber(score, 0, 100, 0);
        
        // Record the performance
        const performance = await recordPerformance(sessionId, {
          exerciseId: exerciseId ?? 'unknown',
          exerciseTitle,
          score: sanitizedScore,
          pitchAcc: pitchAcc !== undefined ? sanitizeNumber(pitchAcc, 0, 100, 0) : 0,
          rhythmAcc: rhythmAcc !== undefined ? sanitizeNumber(rhythmAcc, 0, 100, 0) : 0,
          dynamicsScore: dynamicsScore !== undefined ? sanitizeNumber(dynamicsScore, 0, 100, 0) : undefined,
          phrasingScore: phrasingScore !== undefined ? sanitizeNumber(phrasingScore, 0, 100, 0) : undefined,
        });
        
        // Calculate XP
        const { xp: exerciseXP, events } = calculateExerciseXP(sanitizedScore);
        
        // Update user XP
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            xp: { increment: exerciseXP },
          },
        });
        
        // Check for level up
        const levelUp = checkLevelUp(user.xp, updatedUser.xp);
        if (levelUp.leveledUp) {
          await prisma.user.update({
            where: { id: user.id },
            data: { level: levelUp.newLevel },
          });
        }
        
        // Add to spaced repetition
        const itemKey = `${focusArea || 'mixed'}_${exerciseId || 'unknown'}`;
        const rating: Rating = sanitizedScore >= 85 ? 4 : sanitizedScore >= 70 ? 3 : sanitizedScore >= 50 ? 2 : 1;
        await recordReview(user.id, focusArea || 'mixed', itemKey, exerciseTitle || 'Exercise', rating);
        
        // Update session stats
        const sessionPerformances = await prisma.performance.findMany({
          where: { sessionId },
        });
        const avgScore = sessionPerformances.length > 0 
          ? sessionPerformances.reduce((sum, p) => sum + p.score, 0) / sessionPerformances.length
          : 0;
        
        await prisma.practiceSession.update({
          where: { id: sessionId },
          data: {
            exerciseCount: { increment: 1 },
            avgScore,
            xpEarned: { increment: exerciseXP },
          },
        });
        
        return NextResponse.json({
          performance,
          xpEarned: exerciseXP,
          events,
          levelUp: levelUp.leveledUp ? levelUp : null,
        });
      }
      
      case 'end': {
        const { sessionId, durationMins } = data;
        
        // Sanitize duration
        const sanitizedDuration = sanitizeNumber(durationMins, 0, LIMITS.MAX_PRACTICE_MINUTES, 0);
        
        // Get session to calculate final stats
        const session = await prisma.practiceSession.findUnique({
          where: { id: sessionId },
          include: { performances: true },
        });
        
        if (!session) {
          return createErrorResponse('Session not found', 404);
        }
        
        // End the session
        const endedSession = await endPracticeSession(sessionId, {
          durationMins: sanitizedDuration,
          exerciseCount: session.exerciseCount,
          avgScore: session.avgScore,
          xpEarned: session.xpEarned,
        });
        
        // Update user's total practice time
        await prisma.user.update({
          where: { id: user.id },
          data: {
            totalPracticeMinutes: { increment: sanitizedDuration },
          },
        });
        
        // Get updated user stats for achievement checking
        const [totalExercises, perfectScores, scalesCount, arpeggiosCount, sessionsCount] = await Promise.all([
          prisma.performance.count({ where: { session: { userId: user.id } } }),
          prisma.performance.count({ where: { session: { userId: user.id }, score: { gte: 95 } } }),
          prisma.practiceSession.count({ where: { userId: user.id, focusArea: 'scales' } }),
          prisma.practiceSession.count({ where: { userId: user.id, focusArea: 'arpeggios' } }),
          prisma.practiceSession.count({ where: { userId: user.id } }),
        ]);
        
        const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
        
        const userStats: UserStats = {
          totalExercises,
          totalPracticeMinutes: updatedUser?.totalPracticeMinutes || 0,
          currentStreak: updatedUser?.currentStreak || 0,
          longestStreak: updatedUser?.longestStreak || 0,
          level: updatedUser?.level || 1,
          perfectScores,
          scalesCompleted: scalesCount,
          arpeggiosCompleted: arpeggiosCount,
          avgScore: session.avgScore,
          sessionsCount,
        };
        
        // Check for achievements
        const { unlocked, xpEarned } = await checkAndUnlockAchievements(user.id, userStats);
        
        if (xpEarned > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: { xp: { increment: xpEarned } },
          });
        }
        
        return NextResponse.json({
          session: endedSession,
          achievements: unlocked,
          achievementXP: xpEarned,
        });
      }
      
      default:
        return createErrorResponse('Invalid action', 400);
    }
  } catch (error) {
    return createErrorResponse('Failed to process session', 500, error);
  }
}
