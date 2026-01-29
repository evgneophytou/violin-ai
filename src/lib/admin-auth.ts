/**
 * Admin Authentication Module
 * Simple JWT-based authentication for admin dashboard access
 */

import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

// Secret key for JWT signing (MUST be set via environment variable in production)
// The check is done lazily to avoid build-time errors
const getJwtSecret = (): string => {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_JWT_SECRET environment variable must be set in production');
  }
  return secret || 'dev-only-secret-do-not-use-in-production';
};
const TOKEN_EXPIRY_HOURS = 24;
const COOKIE_NAME = 'violin_admin_token';

// Admin roles
export type AdminRole = 'viewer' | 'developer' | 'admin';

export interface AdminPayload {
  userId: string;
  email: string;
  role: AdminRole;
  exp: number;
}

/**
 * Hash a password using Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + getJwtSecret());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * Create a JWT token (simple implementation without external library)
 */
export function createToken(payload: Omit<AdminPayload, 'exp'>): string {
  const exp = Math.floor(Date.now() / 1000) + (TOKEN_EXPIRY_HOURS * 60 * 60);
  const fullPayload: AdminPayload = { ...payload, exp };
  
  // Base64 encode the header and payload
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadStr = btoa(JSON.stringify(fullPayload));
  
  // Create signature (simple hash for demonstration - use proper JWT library in production)
  const encoder = new TextEncoder();
  const signatureData = encoder.encode(`${header}.${payloadStr}.${getJwtSecret()}`);
  
  // Use a sync hash for signature
  let hash = 0;
  const dataStr = new TextDecoder().decode(signatureData);
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const signature = btoa(Math.abs(hash).toString(36));
  
  return `${header}.${payloadStr}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): AdminPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, payloadStr, signature] = parts;
    
    // Verify signature
    const encoder = new TextEncoder();
    const signatureData = encoder.encode(`${header}.${payloadStr}.${getJwtSecret()}`);
    let hash = 0;
    const dataStr = new TextDecoder().decode(signatureData);
    for (let i = 0; i < dataStr.length; i++) {
      const char = dataStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const expectedSignature = btoa(Math.abs(hash).toString(36));
    
    if (signature !== expectedSignature) return null;
    
    // Decode payload
    const payload: AdminPayload = JSON.parse(atob(payloadStr));
    
    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Authenticate an admin user
 */
export async function authenticateAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const admin = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin) {
      return { success: false, error: 'Invalid email or password' };
    }

    const isValid = await verifyPassword(password, admin.password);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    // Create token
    const token = createToken({
      userId: admin.id,
      email: admin.email,
      role: admin.role as AdminRole,
    });

    return { success: true, token };
  } catch (error) {
    console.error('[admin-auth] Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Get admin session from cookies
 */
export async function getAdminSession(): Promise<AdminPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!token) return null;
    
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Set admin session cookie
 */
export async function setAdminSession(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_EXPIRY_HOURS * 60 * 60,
    path: '/',
  });
}

/**
 * Clear admin session cookie
 */
export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Check if user has required role
 */
export function hasRole(session: AdminPayload | null, requiredRole: AdminRole): boolean {
  if (!session) return false;
  
  const roleHierarchy: Record<AdminRole, number> = {
    viewer: 1,
    developer: 2,
    admin: 3,
  };
  
  return roleHierarchy[session.role] >= roleHierarchy[requiredRole];
}

/**
 * Create initial admin user (for setup)
 */
export async function createAdminUser(
  email: string,
  password: string,
  role: AdminRole = 'admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return { success: false, error: 'Admin user already exists' };
    }

    const passwordHash = await hashPassword(password);
    
    await prisma.adminUser.create({
      data: {
        email: email.toLowerCase(),
        password: passwordHash,
        role,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[admin-auth] Create user error:', error);
    return { success: false, error: 'Failed to create admin user' };
  }
}

/**
 * Require admin authentication middleware helper
 */
export async function requireAdmin(requiredRole: AdminRole = 'viewer'): Promise<{
  authorized: boolean;
  session: AdminPayload | null;
  error?: string;
}> {
  const session = await getAdminSession();
  
  if (!session) {
    return { authorized: false, session: null, error: 'Not authenticated' };
  }
  
  if (!hasRole(session, requiredRole)) {
    return { authorized: false, session, error: 'Insufficient permissions' };
  }
  
  return { authorized: true, session };
}
