import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  AuthenticatedRequest,
  requireAuth,
  UserRole,
} from '../auth.js';
import { z } from 'zod';

const router = Router();

// Validation Schemas
const studentRegisterSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters').max(60),
  email: z.string().email('Please enter a valid institutional email address').transform((val) => val.trim().toLowerCase()),
  userId: z
    .string()
    .min(3, 'Student ID must be at least 3 characters')
    .max(20, 'Student ID must be under 20 characters')
    .optional()
    .transform((val) => (val ? val.trim().toUpperCase() : undefined)),
  studentId: z.string().max(30).optional(),
  department: z.string().min(2, 'Please select your department'),
  year: z.string().min(1, 'Please select your study year'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const resolverRegisterSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters').max(60),
  email: z.string().email('Please enter a valid staff email address').transform((val) => val.trim().toLowerCase()),
  userId: z
    .string()
    .min(3, 'Resolver ID must be at least 3 characters')
    .max(20, 'Resolver ID must be under 20 characters')
    .optional()
    .transform((val) => (val ? val.trim().toUpperCase() : undefined)),
  department: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const loginSchema = z.object({
  // Can be email or userId
  identifier: z.string().min(1, 'Email or User ID is required').transform((val) => val.trim()),
  password: z.string().min(1, 'Password is required'),
  expectedRole: z.enum(['student', 'resolver', 'admin']).optional(),
});

// Helper to generate unique identifier if user didn't specify one
async function generateUniqueUserId(prefix: string): Promise<string> {
  let attempts = 0;
  while (attempts < 20) {
    const candidate = `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await prisma.user.findUnique({ where: { userId: candidate } });
    if (!exists) return candidate;
    attempts++;
  }
  return `${prefix}${Date.now().toString().slice(-4)}`;
}

// POST /api/auth/register/student
router.post('/register/student', async (req: Request, res: Response) => {
  try {
    const parseResult = studentRegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Validation failed',
      });
    }

    const { name, email, department, year, password, studentId } = parseResult.data;
    let userId = parseResult.data.userId;

    // Check duplicate email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in.',
      });
    }

    if (!userId) {
      userId = await generateUniqueUserId('STU');
    } else {
      const existingId = await prisma.user.findUnique({ where: { userId } });
      if (existingId) {
        return res.status(400).json({
          success: false,
          error: 'This Student ID is already registered. Please choose another or sign in.',
        });
      }
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        userId,
        studentId: studentId || userId,
        role: 'student',
        department,
        year,
        passwordHash,
        isActive: true,
        settings: {
          create: {
            theme: 'system',
            compactMode: false,
            emailNotifications: true,
            statusAlerts: true,
          },
        },
      },
      select: {
        id: true,
        userId: true,
        email: true,
        name: true,
        role: true,
        department: true,
        year: true,
        createdAt: true,
      },
    });

    const token = generateToken({
      id: user.id,
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    });
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        token,
        ...user,
      },
    });
  } catch (error: any) {
    console.error('Error in student registration:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while creating your account. Please try again.',
    });
  }
});

// POST /api/auth/register/resolver
router.post('/register/resolver', async (req: Request, res: Response) => {
  try {
    const parseResult = resolverRegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Validation failed',
      });
    }

    const { name, email, department, password } = parseResult.data;
    let userId = parseResult.data.userId;

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in.',
      });
    }

    if (!userId) {
      userId = await generateUniqueUserId('RES');
    } else {
      const existingId = await prisma.user.findUnique({ where: { userId } });
      if (existingId) {
        return res.status(400).json({
          success: false,
          error: 'This Resolver ID is already registered. Please choose another or sign in.',
        });
      }
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        userId,
        role: 'resolver',
        department: department || 'Campus Facilities & Maintenance',
        year: 'Staff',
        passwordHash,
        isActive: true,
        settings: {
          create: {
            theme: 'system',
            compactMode: false,
            emailNotifications: true,
            statusAlerts: true,
          },
        },
      },
      select: {
        id: true,
        userId: true,
        email: true,
        name: true,
        role: true,
        department: true,
        year: true,
        createdAt: true,
      },
    });

    const token = generateToken({
      id: user.id,
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    });
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Resolver account created successfully.',
      data: {
        token,
        ...user,
      },
    });
  } catch (error: any) {
    console.error('Error in resolver registration:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while creating your account.',
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Accommodate both `identifier` and legacy `userId` key
    const rawData = {
      ...req.body,
      identifier: req.body.identifier || req.body.userId,
    };

    const parseResult = loginSchema.safeParse(rawData);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your email or User ID, and password.',
      });
    }

    const { identifier, password, expectedRole } = parseResult.data;
    const lowerIdentifier = identifier.toLowerCase();
    const upperIdentifier = identifier.toUpperCase();

    // Look up user by email OR userId
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: lowerIdentifier },
          { userId: upperIdentifier },
          { userId: identifier },
        ],
      },
      include: {
        settings: true,
      },
    });

    const GENERIC_ERROR = 'Incorrect email, ID, or password.';

    if (!user) {
      return res.status(401).json({
        success: false,
        error: GENERIC_ERROR,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'This account has been deactivated. Please contact campus administration.',
      });
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: GENERIC_ERROR,
      });
    }

    if (expectedRole) {
      // Allow admin into resolver portal as well
      const roleMatches =
        user.role === expectedRole ||
        (user.role === 'admin' && expectedRole === 'resolver');

      if (!roleMatches) {
        return res.status(401).json({
          success: false,
          error: `This is a ${user.role} account. Please access the corresponding portal.`,
        });
      }
    }

    const token = generateToken({
      id: user.id,
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    });

    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        id: user.id,
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        year: user.year,
        studentId: user.studentId,
        phone: user.phone,
        createdAt: user.createdAt.toISOString(),
        settings: user.settings,
      },
    });
  } catch (error: any) {
    console.error('Error in login:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during login. Please try again.',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        userId: true,
        email: true,
        name: true,
        role: true,
        department: true,
        year: true,
        studentId: true,
        phone: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        settings: true,
      },
    });

    if (!user || !user.isActive) {
      clearAuthCookie(res);
      return res.status(401).json({
        success: false,
        error: 'User account not found or deactivated.',
      });
    }

    const token = generateToken({
      id: user.id,
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    });
    setAuthCookie(res, token);

    return res.json({
      success: true,
      data: {
        token,
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in /me:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve session.',
    });
  }
});

export default router;
