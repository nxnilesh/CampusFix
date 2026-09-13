import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

export function generateToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function setAuthCookie(res: Response, token: string) {
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
  let token = req.cookies?.[COOKIE_NAME];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token && typeof req.headers['x-auth-token'] === 'string') {
    token = req.headers['x-auth-token'];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
  } catch (err) {
    // Expired or invalid token; leave req.user undefined
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to continue.',
    });
  }
  next();
}

export function requireRole(expectedRoles: UserRole | UserRole[] | string | string[]) {
  const allowed = Array.isArray(expectedRoles) ? expectedRoles : [expectedRoles];
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in to continue.',
      });
    }

    const userRole = req.user.role;
    // Admin has access to administrative and resolver/staff endpoints
    const hasPermission =
      allowed.includes(userRole) ||
      (userRole === 'admin' && (allowed.includes('resolver') || allowed.includes('staff')));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: `Access denied. This action requires ${allowed.join(' or ')} privileges.`,
      });
    }

    next();
  };
}
