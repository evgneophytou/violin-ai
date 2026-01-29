import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateDefaultUser } from '@/lib/db';
import { 
  getReviewQueue, 
  getUpcomingReviews, 
  getReviewStats,
  recordReview,
  type Rating 
} from '@/lib/ai/spaced-repetition-agent';
import {
  validateBody,
  createErrorResponse,
  sanitizeString,
} from '@/lib/validation';

// Review item schema
const reviewItemSchema = z.object({
  itemType: z.enum(['scale', 'arpeggio', 'exercise', 'piece', 'technique']),
  itemKey: z.string().min(1).max(100),
  itemName: z.string().min(1).max(200).optional(),
  rating: z.coerce.number().int().min(1).max(4),
});

// GET /api/review-queue - Get items due for review
export async function GET() {
  try {
    const user = await getOrCreateDefaultUser();
    
    const [dueItems, upcomingItems, stats] = await Promise.all([
      getReviewQueue(user.id, 10),
      getUpcomingReviews(user.id, 7),
      getReviewStats(user.id),
    ]);
    
    return NextResponse.json({
      dueItems,
      upcomingItems,
      stats,
    });
  } catch (error) {
    return createErrorResponse('Failed to get review queue', 500, error);
  }
}

// POST /api/review-queue - Record a review
export async function POST(request: NextRequest) {
  try {
    // Validate body
    const bodyResult = await validateBody(request, reviewItemSchema);
    if (!bodyResult.success) {
      return bodyResult.error;
    }
    
    const { itemType, itemKey, itemName, rating } = bodyResult.data;
    const user = await getOrCreateDefaultUser();
    
    // Sanitize strings
    const sanitizedItemKey = sanitizeString(itemKey, 100);
    const sanitizedItemName = itemName ? sanitizeString(itemName, 200) : sanitizedItemKey;
    
    const reviewItem = await recordReview(
      user.id,
      itemType,
      sanitizedItemKey,
      sanitizedItemName,
      rating as Rating
    );
    
    // Get updated stats
    const stats = await getReviewStats(user.id);
    
    return NextResponse.json({
      reviewItem,
      stats,
    });
  } catch (error) {
    return createErrorResponse('Failed to record review', 500, error);
  }
}
