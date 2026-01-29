import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma, getOrCreateDefaultUser, getUserWithStats, updateUserStreak } from '@/lib/db';
import { calculateLevel } from '@/lib/gamification/level-system';
import { seedAchievements } from '@/lib/gamification/achievements';
import {
  validateBody,
  createErrorResponse,
  sanitizeNumber,
  LIMITS,
} from '@/lib/validation';

// Action schemas
const userActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('addXP'),
    data: z.object({
      xp: z.coerce.number().int().min(0).max(LIMITS.MAX_XP),
    }),
  }),
  z.object({
    action: z.literal('updateStreak'),
    data: z.object({}).optional(),
  }),
  z.object({
    action: z.literal('updatePracticeTime'),
    data: z.object({
      minutes: z.coerce.number().int().min(0).max(LIMITS.MAX_PRACTICE_MINUTES),
    }),
  }),
]);

// GET /api/user - Get current user with stats
export async function GET() {
  try {
    // Ensure achievements are seeded
    await seedAchievements();
    
    // Get or create the default user
    const user = await getOrCreateDefaultUser();
    const userWithStats = await getUserWithStats(user.id);
    
    return NextResponse.json({ user: userWithStats });
  } catch (error) {
    return createErrorResponse('Failed to get user', 500, error);
  }
}

// POST /api/user - Update user (XP, streak, etc.)
export async function POST(request: NextRequest) {
  try {
    // Validate body
    const bodyResult = await validateBody(request, userActionSchema);
    if (!bodyResult.success) {
      return bodyResult.error;
    }
    
    const { action, data } = bodyResult.data;
    const user = await getOrCreateDefaultUser();
    
    switch (action) {
      case 'addXP': {
        // Sanitize XP to be within bounds
        const xp = sanitizeNumber(data.xp, 0, LIMITS.MAX_XP, 0);
        
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            xp: { increment: xp },
            level: calculateLevel(user.xp + xp),
          },
        });
        return NextResponse.json({ user: updatedUser });
      }
      
      case 'updateStreak': {
        const updatedUser = await updateUserStreak(user.id);
        return NextResponse.json({ user: updatedUser });
      }
      
      case 'updatePracticeTime': {
        // Sanitize minutes
        const minutes = sanitizeNumber(data.minutes, 0, LIMITS.MAX_PRACTICE_MINUTES, 0);
        
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            totalPracticeMinutes: { increment: minutes },
          },
        });
        return NextResponse.json({ user: updatedUser });
      }
      
      default:
        return createErrorResponse('Invalid action', 400);
    }
  } catch (error) {
    return createErrorResponse('Failed to update user', 500, error);
  }
}
