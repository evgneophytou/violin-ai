/**
 * In-memory rate limiter using token bucket algorithm
 * No external dependencies (Redis) required - suitable for free tier deployments
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxTokens: number;      // Maximum tokens in bucket
  refillRate: number;     // Tokens added per interval
  refillInterval: number; // Interval in milliseconds
}

// Store rate limit entries by IP
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const ENTRY_TTL = 10 * 60 * 1000; // Remove entries not accessed in 10 minutes

let cleanupTimer: NodeJS.Timeout | null = null;

const startCleanup = () => {
  if (cleanupTimer) return;
  
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.lastRefill > ENTRY_TTL) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  
  // Don't prevent Node.js from exiting
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
};

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // AI endpoints - expensive, limit heavily
  AI_GENERATE: {
    maxTokens: 10,
    refillRate: 10,
    refillInterval: 60 * 1000, // 10 requests per minute
  },
  AI_ANALYZE: {
    maxTokens: 10,
    refillRate: 10,
    refillInterval: 60 * 1000, // 10 requests per minute
  },
  AI_COACH: {
    maxTokens: 20,
    refillRate: 20,
    refillInterval: 60 * 1000, // 20 requests per minute
  },
  // File processing - resource intensive
  FILE_PROCESS: {
    maxTokens: 5,
    refillRate: 5,
    refillInterval: 60 * 1000, // 5 requests per minute
  },
  // Standard API endpoints
  STANDARD: {
    maxTokens: 60,
    refillRate: 60,
    refillInterval: 60 * 1000, // 60 requests per minute
  },
} as const;

/**
 * Get client IP from request headers
 */
export const getClientIP = (request: Request): string => {
  // Check common headers for proxied requests
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback for local development
  return '127.0.0.1';
};

/**
 * Check if request is rate limited
 * @returns null if allowed, or object with retry info if limited
 */
export const checkRateLimit = (
  identifier: string,
  config: RateLimitConfig
): { limited: boolean; retryAfter?: number; remaining?: number } => {
  startCleanup();
  
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitStore.get(key);
  
  if (!entry) {
    // First request - create new entry with max tokens
    entry = {
      tokens: config.maxTokens,
      lastRefill: now,
    };
    rateLimitStore.set(key, entry);
  } else {
    // Refill tokens based on time elapsed
    const timePassed = now - entry.lastRefill;
    const tokensToAdd = Math.floor(timePassed / config.refillInterval) * config.refillRate;
    
    if (tokensToAdd > 0) {
      entry.tokens = Math.min(config.maxTokens, entry.tokens + tokensToAdd);
      entry.lastRefill = now;
    }
  }
  
  // Check if we have tokens available
  if (entry.tokens > 0) {
    entry.tokens -= 1;
    return { limited: false, remaining: entry.tokens };
  }
  
  // Rate limited - calculate retry time
  const retryAfter = Math.ceil((config.refillInterval - (now - entry.lastRefill)) / 1000);
  
  return {
    limited: true,
    retryAfter: Math.max(1, retryAfter),
    remaining: 0,
  };
};

/**
 * Create rate limit response
 */
export const createRateLimitResponse = (retryAfter: number): Response => {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
};

/**
 * Rate limit middleware helper for API routes
 * @param request - The incoming request
 * @param config - Rate limit configuration
 * @param endpointId - Optional endpoint identifier for more granular limiting
 * @returns Response if rate limited, null if allowed
 */
export const rateLimit = (
  request: Request,
  config: RateLimitConfig,
  endpointId?: string
): Response | null => {
  const ip = getClientIP(request);
  const identifier = endpointId ? `${ip}:${endpointId}` : ip;
  
  const result = checkRateLimit(identifier, config);
  
  if (result.limited && result.retryAfter) {
    return createRateLimitResponse(result.retryAfter);
  }
  
  return null;
};

/**
 * Get rate limit headers to add to successful responses
 */
export const getRateLimitHeaders = (
  request: Request,
  config: RateLimitConfig,
  endpointId?: string
): Record<string, string> => {
  const ip = getClientIP(request);
  const identifier = endpointId ? `${ip}:${endpointId}` : ip;
  const entry = rateLimitStore.get(identifier);
  
  return {
    'X-RateLimit-Limit': config.maxTokens.toString(),
    'X-RateLimit-Remaining': (entry?.tokens ?? config.maxTokens).toString(),
    'X-RateLimit-Reset': Math.ceil(Date.now() / 1000 + config.refillInterval / 1000).toString(),
  };
};
