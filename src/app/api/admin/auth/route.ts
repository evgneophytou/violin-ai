import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  authenticateAdmin, 
  setAdminSession, 
  clearAdminSession, 
  getAdminSession,
  createAdminUser 
} from '@/lib/admin-auth';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { logError } from '@/lib/validation';

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Setup schema (for initial admin creation)
const setupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  setupKey: z.string(), // Must match ADMIN_SETUP_KEY env var
});

/**
 * POST /api/admin/auth - Login
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit login attempts
    const rateLimitResponse = rateLimit(request, {
      maxTokens: 5,
      refillRate: 5,
      refillInterval: 60 * 1000, // 5 attempts per minute
    }, 'admin-login');
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();
    
    // Check if this is a setup request
    if (body.setupKey !== undefined) {
      const parseResult = setupSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: 'Invalid setup data' },
          { status: 400 }
        );
      }

      const { email, password, setupKey } = parseResult.data;
      
      // Verify setup key
      const expectedKey = process.env.ADMIN_SETUP_KEY;
      if (!expectedKey || setupKey !== expectedKey) {
        return NextResponse.json(
          { error: 'Invalid setup key' },
          { status: 403 }
        );
      }

      const result = await createAdminUser(email, password, 'admin');
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, message: 'Admin user created' });
    }
    
    // Regular login
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid email or password format' },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;
    const result = await authenticateAdmin(email, password);

    if (!result.success || !result.token) {
      return NextResponse.json(
        { error: result.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Set session cookie
    await setAdminSession(result.token);

    return NextResponse.json({
      success: true,
      message: 'Logged in successfully',
    });
  } catch (error) {
    logError('admin/auth/login', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/auth - Check session
 */
export async function GET() {
  try {
    const session = await getAdminSession();
    
    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        email: session.email,
        role: session.role,
      },
    });
  } catch (error) {
    logError('admin/auth/check', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/auth - Logout
 */
export async function DELETE() {
  try {
    await clearAdminSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    logError('admin/auth/logout', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
