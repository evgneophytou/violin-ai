// Free Spaced Repetition Scheduler (FSRS) Algorithm
// Based on https://github.com/open-spaced-repetition/fsrs4anki
// NOTE: This file contains server-only code (database operations)
// For client-safe types/constants, import from './spaced-repetition-types'

import { prisma } from '@/lib/db';
import type { ReviewItem } from '@prisma/client';
import type { Rating, FSRSState, SchedulingInfo } from './spaced-repetition-types';

// Re-export types and constants for backward compatibility
export type { Rating, FSRSState, SchedulingInfo } from './spaced-repetition-types';
export { RATING_LABELS } from './spaced-repetition-types';

// FSRS-4.5 parameters (default, can be optimized per user)
const DEFAULT_PARAMS = {
  w: [
    0.4, 0.6, 2.4, 5.8,  // Initial stability for ratings 1-4
    4.93, 0.94, 0.86, 0.01, // Difficulty parameters
    1.49, 0.14, 0.94, 2.18, // Stability parameters
    0.05, 0.34, 1.26, 0.29, 2.61 // Factor parameters
  ],
  requestRetention: 0.9, // Target retention rate (90%)
  maximumInterval: 365,  // Max interval in days
  easyBonus: 1.3,
  hardInterval: 1.2,
};

// Calculate initial stability based on rating
const initStability = (rating: Rating, w: number[]): number => {
  return Math.max(0.1, w[rating - 1]);
};

// Calculate initial difficulty based on rating
const initDifficulty = (rating: Rating, w: number[]): number => {
  return Math.min(10, Math.max(1, w[4] - (rating - 3) * w[5]));
};

// Calculate next difficulty
const nextDifficulty = (d: number, rating: Rating, w: number[]): number => {
  const newD = d - w[6] * (rating - 3);
  return Math.min(10, Math.max(1, w[7] * (w[4] - d) + newD));
};

// Calculate stability after recall
const nextRecallStability = (
  d: number,
  s: number,
  r: number,
  rating: Rating,
  w: number[]
): number => {
  const hardPenalty = rating === 2 ? w[15] : 1;
  const easyBonus = rating === 4 ? w[16] : 1;
  
  return s * (
    1 +
    Math.exp(w[8]) *
    (11 - d) *
    Math.pow(s, -w[9]) *
    (Math.exp((1 - r) * w[10]) - 1) *
    hardPenalty *
    easyBonus
  );
};

// Calculate stability after forgetting (lapse)
const nextForgetStability = (d: number, s: number, r: number, w: number[]): number => {
  return Math.max(
    0.1,
    w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14])
  );
};

// Calculate retrievability (probability of recall)
const retrievability = (elapsedDays: number, stability: number): number => {
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
};

// Calculate next interval based on desired retention
const nextInterval = (stability: number, requestRetention: number, maxInterval: number): number => {
  const interval = Math.round(9 * stability * (1 / requestRetention - 1));
  return Math.min(maxInterval, Math.max(1, interval));
};

export const scheduleReview = (
  item: ReviewItem | null,
  rating: Rating,
  params = DEFAULT_PARAMS
): SchedulingInfo => {
  const w = params.w;
  const now = new Date();
  
  if (!item || item.repetitions === 0) {
    // New item - first review
    const stability = initStability(rating, w);
    const difficulty = initDifficulty(rating, w);
    
    let interval: number;
    if (rating === 1) {
      // Again - review again soon
      interval = 1;
    } else {
      interval = nextInterval(stability, params.requestRetention, params.maximumInterval);
    }
    
    const nextReviewDate = new Date(now);
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    
    return {
      nextReview: nextReviewDate,
      interval,
      newState: {
        difficulty,
        stability,
        retrievability: 1,
      },
    };
  }
  
  // Existing item - calculate based on current state
  const lastReview = item.lastReview ? new Date(item.lastReview) : now;
  const elapsedDays = Math.max(0, (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24));
  const currentR = retrievability(elapsedDays, item.stability);
  
  let newStability: number;
  let newDifficulty: number;
  
  if (rating === 1) {
    // Forgot - lapse
    newStability = nextForgetStability(item.difficulty, item.stability, currentR, w);
    newDifficulty = nextDifficulty(item.difficulty, rating, w);
  } else {
    // Remembered
    newStability = nextRecallStability(item.difficulty, item.stability, currentR, rating, w);
    newDifficulty = nextDifficulty(item.difficulty, rating, w);
  }
  
  let interval: number;
  if (rating === 1) {
    // Review again soon after forgetting
    interval = 1;
  } else {
    interval = nextInterval(newStability, params.requestRetention, params.maximumInterval);
  }
  
  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);
  
  return {
    nextReview: nextReviewDate,
    interval,
    newState: {
      difficulty: newDifficulty,
      stability: newStability,
      retrievability: rating === 1 ? 1 : currentR,
    },
  };
};

// Database operations
export const getReviewQueue = async (
  userId: string,
  limit: number = 10
): Promise<ReviewItem[]> => {
  return prisma.reviewItem.findMany({
    where: {
      userId,
      nextReview: {
        lte: new Date(),
      },
    },
    orderBy: [
      { nextReview: 'asc' },
      { retrievability: 'asc' },
    ],
    take: limit,
  });
};

export const getUpcomingReviews = async (
  userId: string,
  days: number = 7
): Promise<ReviewItem[]> => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return prisma.reviewItem.findMany({
    where: {
      userId,
      nextReview: {
        gt: new Date(),
        lte: futureDate,
      },
    },
    orderBy: { nextReview: 'asc' },
  });
};

export const recordReview = async (
  userId: string,
  itemType: string,
  itemKey: string,
  itemName: string,
  rating: Rating
): Promise<ReviewItem> => {
  // Get or create the review item
  let item = await prisma.reviewItem.findUnique({
    where: {
      userId_itemType_itemKey: {
        userId,
        itemType,
        itemKey,
      },
    },
  });
  
  // Calculate new schedule
  const schedule = scheduleReview(item, rating);
  
  if (!item) {
    // Create new item
    return prisma.reviewItem.create({
      data: {
        userId,
        itemType,
        itemKey,
        itemName,
        difficulty: schedule.newState.difficulty,
        stability: schedule.newState.stability,
        retrievability: schedule.newState.retrievability,
        lastReview: new Date(),
        nextReview: schedule.nextReview,
        repetitions: 1,
        lapses: rating === 1 ? 1 : 0,
      },
    });
  }
  
  // Update existing item
  return prisma.reviewItem.update({
    where: { id: item.id },
    data: {
      difficulty: schedule.newState.difficulty,
      stability: schedule.newState.stability,
      retrievability: schedule.newState.retrievability,
      lastReview: new Date(),
      nextReview: schedule.nextReview,
      repetitions: item.repetitions + 1,
      lapses: rating === 1 ? item.lapses + 1 : item.lapses,
    },
  });
};

export const getReviewStats = async (userId: string): Promise<{
  dueToday: number;
  dueThisWeek: number;
  totalItems: number;
  avgRetention: number;
}> => {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const [dueToday, dueThisWeek, allItems] = await Promise.all([
    prisma.reviewItem.count({
      where: {
        userId,
        nextReview: { lte: todayEnd },
      },
    }),
    prisma.reviewItem.count({
      where: {
        userId,
        nextReview: { lte: weekEnd },
      },
    }),
    prisma.reviewItem.findMany({
      where: { userId },
      select: { retrievability: true },
    }),
  ]);
  
  const avgRetention = allItems.length > 0
    ? allItems.reduce((sum, item) => sum + item.retrievability, 0) / allItems.length
    : 0;
  
  return {
    dueToday,
    dueThisWeek,
    totalItems: allItems.length,
    avgRetention: Math.round(avgRetention * 100),
  };
};

