import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaInitialized: boolean;
};

/**
 * Get or create the Prisma client (lazy initialization)
 * This prevents build-time errors when DATABASE_URL is not set
 */
const getPrismaClient = (): PrismaClient => {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Create PostgreSQL adapter for Prisma 7
  const adapter = new PrismaPg({ connectionString: databaseUrl });

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
};

// Export a proxy that lazily initializes the Prisma client
// This prevents the client from being created at import time during builds
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

// Helper to get or create the default user (for anonymous usage)
const DEFAULT_USER_ID = 'default-user';

export const getOrCreateDefaultUser = async () => {
  let user = await prisma.user.findUnique({
    where: { id: DEFAULT_USER_ID },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: DEFAULT_USER_ID,
      },
    });
  }

  return user;
};

export const getUserWithStats = async (userId: string = DEFAULT_USER_ID) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      achievements: {
        include: {
          achievement: true,
        },
      },
      sessions: {
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: {
          performances: true,
        },
      },
      reviewItems: {
        where: {
          nextReview: {
            lte: new Date(),
          },
        },
        orderBy: { nextReview: 'asc' },
        take: 10,
      },
    },
  });

  return user;
};

export const updateUserXP = async (userId: string, xpToAdd: number) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      xp: { increment: xpToAdd },
    },
  });

  return user;
};

export const updateUserStreak = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  const now = new Date();
  const lastPractice = user.lastPracticeAt;
  
  let newStreak = user.currentStreak;
  
  if (!lastPractice) {
    // First practice ever
    newStreak = 1;
  } else {
    const lastPracticeDate = new Date(lastPractice);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDate = new Date(lastPracticeDate.getFullYear(), lastPracticeDate.getMonth(), lastPracticeDate.getDate());
    
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Already practiced today, no change
    } else if (diffDays === 1) {
      // Consecutive day
      newStreak = user.currentStreak + 1;
    } else {
      // Streak broken
      newStreak = 1;
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      longestStreak: Math.max(user.longestStreak, newStreak),
      lastPracticeAt: now,
    },
  });

  return updatedUser;
};

export const createPracticeSession = async (
  userId: string,
  focusArea?: string,
  difficulty?: number
) => {
  const session = await prisma.practiceSession.create({
    data: {
      userId,
      focusArea,
      difficulty: difficulty ?? 3,
    },
  });

  return session;
};

export const endPracticeSession = async (
  sessionId: string,
  stats: {
    durationMins: number;
    exerciseCount: number;
    avgScore: number;
    xpEarned: number;
  }
) => {
  const session = await prisma.practiceSession.update({
    where: { id: sessionId },
    data: {
      endedAt: new Date(),
      ...stats,
    },
  });

  return session;
};

export const recordPerformance = async (
  sessionId: string,
  data: {
    exerciseId: string;
    exerciseTitle?: string;
    score: number;
    pitchAcc: number;
    rhythmAcc: number;
    dynamicsScore?: number;
    phrasingScore?: number;
  }
) => {
  const performance = await prisma.performance.create({
    data: {
      sessionId,
      ...data,
    },
  });

  return performance;
};

export type { User, PracticeSession, Performance, Achievement, UserAchievement, ReviewItem } from '@prisma/client';
