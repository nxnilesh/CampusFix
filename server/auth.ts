import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createHmac } from 'crypto';
import { prisma } from './db.js';

const configuredSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === 'production' && !configuredSecret) {
  throw new Error('SESSION_SECRET must be configured in production.');
}
const JWT_SECRET = configuredSecret || 'campusfix_prod_default_secret_99812_secure';
export const COOKIE_NAME = 'campusfix_token';

export type UserRole = 'student' | 'resolver' | 'admin';

export interface AuthUserPayload {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  tokenVersion?: number;
  status?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  mustChangePassword?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashAuthSecret(value: string): string {
  return createHmac('sha256', JWT_SECRET).update(value).digest('hex');
}

export function generateToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function setAuthCookie(res: Response, token: string, role: UserRole) {
  if (role === 'student') {
    clearAuthCookie(res);
    return;
  }

  const isHttps = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export function clearAuthCookie(res: Response) {
  const isHttps = process.env.NODE_ENV === 'production';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
  });
}

export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const explicitToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : typeof req.headers['x-auth-token'] === 'string'
      ? req.headers['x-auth-token']
      : null;
  const cookieToken = req.cookies?.[COOKIE_NAME];
  let token = explicitToken || cookieToken;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    if (!explicitToken && decoded.role === 'student') {
      clearAuthCookie(res);
      return next();
    }
    req.user = decoded;
  } catch (err) {
    // Expired or invalid token; leave req.user undefined
  }
  next();
}

async function loadCurrentUser(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to continue.',
    });
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        userId: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isActive: true,
        emailVerified: true,
        mustChangePassword: true,
        tokenVersion: true,
      },
    });

    if (
      !user ||
      !user.isActive ||
      !user.emailVerified ||
      user.status !== 'ACTIVE' ||
      (req.user.tokenVersion ?? 0) !== user.tokenVersion
    ) {
      clearAuthCookie(res);
      res.status(401).json({
        success: false,
        error: 'Your session is no longer valid. Please sign in again.',
      });
      return null;
    }

    req.user = {
      ...user,
      role: user.role as UserRole,
    };
    return user;
  } catch (error) {
    console.error('Error validating authenticated user:', error);
    res.status(503).json({
      success: false,
      error: 'Unable to validate your session. Please try again.',
    });
    return null;
  }
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = await loadCurrentUser(req, res);
  if (user) next();
}

export function requireRole(expectedRoles: UserRole | UserRole[] | string | string[]) {
  const allowed = Array.isArray(expectedRoles) ? expectedRoles : [expectedRoles];
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const currentUser = await loadCurrentUser(req, res);
    if (!currentUser || !req.user) return;

    const userRole = req.user.role;
    // Admin has access to administrative and resolver/staff endpoints
    const hasPermission =
      allowed.includes(userRole) ||
      (userRole === 'admin' && (allowed.includes('resolver') || allowed.includes('staff')));

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: `Access denied. This action requires ${allowed.join(' or ')} privileges.`,
      });
      return;
    }

    if (userRole === 'resolver' && allowed.includes('resolver') && currentUser.mustChangePassword) {
      res.status(403).json({
        success: false,
        error: 'Change your temporary password before accessing resolver services.',
        requiresPasswordChange: true,
      });
      return;
    }

    next();
  };
}
