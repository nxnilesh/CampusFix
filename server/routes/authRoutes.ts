import { Router, Request, Response } from 'express';
import { randomBytes, randomInt, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import {
  prisma,
  isDatabaseConnectionError,
  logDatabaseError,
  DATABASE_UNAVAILABLE_MESSAGE,
} from '../db.js';
import {
  EMAIL_DELIVERY_ERROR,
  isEmailDeliveryError,
  sendAuthOTPEmail,
} from '../email.js';
import {
  hashPassword,
  hashAuthSecret,
  comparePassword,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  AuthenticatedRequest,
  requireAuth,
  UserRole,
} from '../auth.js';
import { logActivity } from '../activityLog.js';
import { z } from 'zod';

const router = Router();
const LOGIN_FAILURE_LIMIT = 5;
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const GENERIC_LOGIN_ERROR = 'Unable to sign in. Check your credentials or try again later.';
let dummyPasswordHash: Promise<string> | undefined;

class OTPResendCooldownError extends Error {
  constructor() {
    super('Please wait before requesting another code.');
    this.name = 'OTPResendCooldownError';
  }
}

function enforceOTPResendCooldown(createdAt?: Date): void {
  if (createdAt && Date.now() - createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw new OTPResendCooldownError();
  }
}

async function compareLoginPassword(password: string, passwordHash?: string): Promise<boolean> {
  if (passwordHash) return comparePassword(password, passwordHash);
  dummyPasswordHash ??= hashPassword(randomBytes(32).toString('hex'));
  await comparePassword(password, await dummyPasswordHash);
  return false;
}

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------
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
}).strict();

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or User ID is required').transform((val) => val.trim()),
  password: z.string().min(1, 'Password is required'),
  expectedRole: z.enum(['student', 'resolver', 'admin']).optional(),
});

const resolverRegisterSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(80),
  email: z.string().email('Please enter a valid email address').transform((val) => val.trim().toLowerCase()),
  employeeId: z.string().trim().min(1, 'Staff ID is required').max(30),
  department: z.string().min(2, 'Department is required'),
}).strict();

const emailOTPRequestSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
});

const emailOTPVerifySchema = emailOTPRequestSchema.extend({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit verification code'),
});

const passwordResetSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

function hashOTP(value: string): string {
  return hashAuthSecret(value);
}

function matchesOTP(value: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashOTP(value), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

async function hashOTPWithBcrypt(otp: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
}

async function verifyOTPBcrypt(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

function generateRegistrationOTP(): string {
  // Production-grade cryptographically secure 6-digit OTP using crypto.randomInt()
  return randomInt(100000, 1_000_000).toString();
}

// ---------------------------------------------------------------------------
// Helper: generate unique userId
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// POST /api/auth/register/student
// ---------------------------------------------------------------------------
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

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      if (!existingEmail.emailVerified) {
        enforceOTPResendCooldown(existingEmail.otpCreatedAt || undefined);
        const otp = generateRegistrationOTP();
        const otpHash = await hashOTPWithBcrypt(otp);
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        const otpCreatedAt = new Date();

        await prisma.user.update({
          where: { id: existingEmail.id },
          data: {
            otpHash,
            otpExpires,
            otpAttempts: 0,
            otpCreatedAt,
          },
        });

        await sendAuthOTPEmail(existingEmail.email, otp, 'verification');

        return res.status(200).json({
          success: true,
          message: 'A verification code has been sent to your email.',
          data: { email: existingEmail.email },
        });
      }
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
    const otp = generateRegistrationOTP();
    const otpHash = await hashOTPWithBcrypt(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const otpCreatedAt = new Date();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        userId,
        studentId: studentId || userId,
        role: 'student',         // Role is ALWAYS assigned by backend
        status: 'ACTIVE',
        emailVerified: false,
        department,
        year: year || '1st Year',
        passwordHash,
        isActive: true,
        otpHash,
        otpExpires,
        otpAttempts: 0,
        otpCreatedAt,
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
        email: true,
      },
    });

    try {
      await sendAuthOTPEmail(user.email, otp, 'verification');
    } catch (error) {
      logDatabaseError('Failed to send verification email:', error);
      throw error;
    }

    void logActivity({
      userId: user.id,
      action: 'STUDENT_REGISTERED',
      entityId: user.id,
      entityType: 'USER',
      details: { email: user.email },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'A verification code has been sent to your email.',
      data: { email: user.email },
    });
  } catch (error: unknown) {
    console.error('Error in student registration:', error);
    if (isEmailDeliveryError(error)) {
      return res.status(503).json({
        success: false,
        error: EMAIL_DELIVERY_ERROR,
      });
    }
    if (error instanceof OTPResendCooldownError) {
      return res.status(429).json({ success: false, error: error.message });
    }
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while creating your account. Please try again.',
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/verification/resend
// ---------------------------------------------------------------------------
router.post('/verification/resend', async (req: Request, res: Response) => {
  try {
    const parsed = emailOTPRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (user && !user.emailVerified) {
      enforceOTPResendCooldown(user.otpCreatedAt || undefined);
      const otp = generateRegistrationOTP();
      const otpHash = await hashOTPWithBcrypt(otp);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpHash,
          otpExpires: new Date(Date.now() + 10 * 60 * 1000),
          otpAttempts: 0,
          otpCreatedAt: new Date(),
        },
      });
      await sendAuthOTPEmail(user.email, otp, 'verification');
    }
    return res.json({
      success: true,
      message: 'If the account is awaiting verification, a new code has been sent.',
    });
  } catch (error: unknown) {
    console.error('Error resending verification code:', error);
    if (error instanceof OTPResendCooldownError) {
      return res.json({
        success: true,
        message: 'If the account is awaiting verification, a new code has been sent.',
      });
    }
    if (isEmailDeliveryError(error)) {
      return res.status(503).json({ success: false, error: EMAIL_DELIVERY_ERROR });
    }
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    return res.status(500).json({ success: false, error: 'Unable to send a verification code. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// Verification Handler (used by /verify-registration and /verification/verify)
// ---------------------------------------------------------------------------
const handleVerifyRegistration = async (req: Request, res: Response) => {
  try {
    const parsed = emailOTPVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid verification code.',
      });
    }

    const { email, otp } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'No account found with this email address.',
      });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Email is already verified. Please sign in.',
      });
    }

    if (!user.otpHash || !user.otpExpires) {
      return res.status(400).json({
        success: false,
        error: 'No active verification code found. Please request a new code.',
      });
    }

    // Maximum verification attempts: 5. After 5 wrong attempts: invalidate OTP.
    if (user.otpAttempts >= 5) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpHash: null,
          otpExpires: null,
          otpAttempts: 5,
        },
      });
      return res.status(400).json({
        success: false,
        error: 'Maximum verification attempts exceeded. Please request a new code.',
      });
    }

    // Expiry check: 10 minutes
    if (new Date() > user.otpExpires) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpHash: null,
          otpExpires: null,
        },
      });
      return res.status(400).json({
        success: false,
        error: 'The verification code has expired. Please request a new code.',
      });
    }

    // Hash OTP using bcrypt & verify
    const isValid = await verifyOTPBcrypt(otp, user.otpHash);

    if (!isValid) {
      const newAttempts = user.otpAttempts + 1;
      const isExceeded = newAttempts >= 5;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpAttempts: newAttempts,
          ...(isExceeded ? { otpHash: null, otpExpires: null } : {}),
        },
      });

      if (isExceeded) {
        return res.status(400).json({
          success: false,
          error: 'Maximum verification attempts exceeded. The code has been invalidated. Please request a new code.',
        });
      }

      const remaining = 5 - newAttempts;
      return res.status(400).json({
        success: false,
        error: `Invalid verification code. You have ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      });
    }

    // If OTP valid, not expired, attempts below limit:
    // emailVerified = true, Clear OTP fields.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        otpHash: null,
        otpExpires: null,
        otpAttempts: 0,
        otpCreatedAt: null,
      },
    });

    void logActivity({
      userId: user.id,
      action: 'STUDENT_EMAIL_VERIFIED',
      entityId: user.id,
      entityType: 'USER',
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now sign in.',
    });
  } catch (error: unknown) {
    console.error('Error verifying registration:', error);
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    return res.status(500).json({
      success: false,
      error: 'Unable to verify your email. Please try again.',
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/verify-registration (Requested primary endpoint)
// POST /api/auth/verification/verify (Backwards-compatible alias)
// ---------------------------------------------------------------------------
router.post('/verify-registration', handleVerifyRegistration);
router.post('/verification/verify', handleVerifyRegistration);

// ---------------------------------------------------------------------------
// POST /api/auth/password/forgot
// ---------------------------------------------------------------------------
router.post('/password/forgot', async (req: Request, res: Response) => {
  try {
    const parsed = emailOTPRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (user) {
      const latest = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      enforceOTPResendCooldown(latest?.createdAt);

      const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
      const [, resetRecord] = await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            otp: hashOTP(otp),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        }),
      ]);
      try {
        await sendAuthOTPEmail(user.email, otp, 'password-reset');
      } catch (error) {
        try {
          await prisma.passwordResetToken.deleteMany({ where: { id: resetRecord.id } });
        } catch (cleanupError) {
          logDatabaseError('Failed to remove undelivered password reset code:', cleanupError);
        }
        throw error;
      }
    }

    return res.json({
      success: true,
      message: 'If an account exists for that email, a password reset code has been sent.',
    });
  } catch (error: unknown) {
    console.error('Error requesting password reset:', error);
    if (error instanceof OTPResendCooldownError) {
      return res.json({
        success: true,
        message: 'If an account exists for that email, a password reset code has been sent.',
      });
    }
    if (isEmailDeliveryError(error)) {
      return res.json({
        success: true,
        message: 'If an account exists for that email, a password reset code has been sent.',
      });
    }
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    return res.status(500).json({ success: false, error: 'Unable to send a reset code. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/password/verify
// ---------------------------------------------------------------------------
router.post('/password/verify', async (req: Request, res: Response) => {
  try {
    const parsed = emailOTPVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid verification code.',
      });
    }

    const reset = await prisma.passwordResetToken.findFirst({
      where: {
        user: { email: parsed.data.email },
        otp: { not: null },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!reset?.otp || !matchesOTP(parsed.data.otp, reset.otp)) {
      return res.status(400).json({ success: false, error: 'The reset code is invalid or expired.' });
    }

    const rawToken = randomBytes(32).toString('hex');
    const updated = await prisma.passwordResetToken.updateMany({
      where: { id: reset.id, otp: reset.otp, expiresAt: { gt: new Date() } },
      data: {
        otp: null,
        token: hashOTP(rawToken),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    if (updated.count !== 1) {
      return res.status(400).json({ success: false, error: 'The reset code is invalid or expired.' });
    }
    return res.json({ success: true, data: { token: rawToken } });
  } catch (error: unknown) {
    console.error('Error verifying password reset code:', error);
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    return res.status(500).json({ success: false, error: 'Unable to verify the reset code. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/password/reset
// ---------------------------------------------------------------------------
router.post('/password/reset', async (req: Request, res: Response) => {
  try {
    const parsed = passwordResetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Please enter a valid new password.',
      });
    }

    const hashedToken = hashOTP(parsed.data.token);
    const passwordHash = await hashPassword(parsed.data.password);
    const changed = await prisma.$transaction(async (tx) => {
      const resetRecord = await tx.passwordResetToken.findFirst({
        where: { token: hashedToken, otp: null, expiresAt: { gt: new Date() } },
        select: { id: true, userId: true },
      });
      if (!resetRecord) return false;
      const consumed = await tx.passwordResetToken.deleteMany({
        where: { id: resetRecord.id, token: hashedToken, otp: null, expiresAt: { gt: new Date() } },
      });
      if (consumed.count !== 1) return false;
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          mustChangePassword: false,
          tokenVersion: { increment: 1 },
        },
      });
      return true;
    });
    if (!changed) {
      return res.status(400).json({ success: false, error: 'The password reset session is invalid or expired.' });
    }
    return res.json({ success: true, message: 'Password reset successfully. Please sign in.' });
  } catch (error: unknown) {
    console.error('Error resetting password:', error);
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    return res.status(500).json({ success: false, error: 'Unable to reset your password. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/register/resolver
// Resolver accounts are pending and inactive until an admin approves them.
// ---------------------------------------------------------------------------
router.post('/register/resolver', async (req: Request, res: Response) => {
  try {
    const parseResult = resolverRegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Validation failed',
      });
    }

    const { name, email, employeeId, department } = parseResult.data;
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in or contact campus administration.',
      });
    }

    const duplicateStaffId = await prisma.resolverRequest.findFirst({
      where: { employeeId: { equals: employeeId, mode: 'insensitive' } },
      select: { id: true },
    });
    if (duplicateStaffId) {
      return res.status(409).json({
        success: false,
        error: 'This Staff ID is already associated with a resolver application.',
      });
    }

    const userId = await generateUniqueUserId('RES');
    const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
    const otp = generateRegistrationOTP();
    const otpHash = await hashOTPWithBcrypt(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const otpCreatedAt = new Date();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        userId,
        role: 'resolver',
        status: 'PENDING',
        emailVerified: false,
        department,
        year: 'Staff',
        passwordHash,
        isActive: false,
        otpHash,
        otpExpires,
        otpAttempts: 0,
        otpCreatedAt,
        settings: {
          create: {
            theme: 'system',
            compactMode: false,
            emailNotifications: true,
            statusAlerts: true,
          },
        },
        resolverRequests: {
          create: {
            fullName: name,
            email,
            employeeId,
            department,
            reason: `Resolver account registration for staff ID ${employeeId}.`,
            status: 'PENDING',
          },
        },
      },
      select: { id: true, email: true, userId: true },
    });

    try {
      await sendAuthOTPEmail(user.email, otp, 'verification');
    } catch (error) {
      logDatabaseError('Failed to send resolver verification email:', error);
      throw error;
    }

    const admins = await prisma.user.findMany({
      where: { role: 'admin', isActive: true },
      select: { id: true },
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          message: `New resolver registration from ${name} (${user.userId}) — awaiting email verification and review.`,
          type: 'RESOLVER_REQUEST',
        })),
      });
    }

    void logActivity({
      userId: user.id,
      action: 'RESOLVER_REGISTERED',
      entityId: user.id,
      entityType: 'USER',
      details: { employeeId },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'A verification code has been sent to your email.',
      data: { email: user.email },
    });
  } catch (error: unknown) {
    console.error('Error in resolver registration:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'An account or application already exists for these details.',
      });
    }
    if (isEmailDeliveryError(error)) {
      return res.status(503).json({ success: false, error: EMAIL_DELIVERY_ERROR });
    }
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while registering. Please try again.',
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/apply/resolver — retired student-to-resolver application flow
// ---------------------------------------------------------------------------
router.post('/apply/resolver', (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'The student resolver application flow has been retired. Register through the resolver portal instead.',
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', async (req: Request, res: Response) => {
  try {
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

    let user = lowerIdentifier.includes('@')
      ? await prisma.user.findUnique({
          where: { email: lowerIdentifier },
          include: { settings: true },
        })
      : await prisma.user.findUnique({
          where: { userId: upperIdentifier },
          include: { settings: true },
        });

    if (!user && !lowerIdentifier.includes('@') && identifier !== upperIdentifier) {
      user = await prisma.user.findUnique({
        where: { userId: identifier },
        include: { settings: true },
      });
    }

    const now = new Date();
    const wasLocked = !!user?.lockedUntil && user.lockedUntil > now;
    if (user?.lockedUntil && !wasLocked) {
      await prisma.user.updateMany({
        where: { id: user.id, lockedUntil: { lte: now } },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }

    const isValidPassword = await compareLoginPassword(password, user?.passwordHash);
    if (!user || wasLocked) {
      return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR });
    }

    if (!isValidPassword) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true },
      });
      if (updatedUser.failedLoginAttempts >= LOGIN_FAILURE_LIMIT) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lockedUntil: new Date(Date.now() + LOGIN_LOCK_DURATION_MS) },
        });
      }
      void logActivity({
        userId: user.id,
        action: 'LOGIN_FAILED',
        details: {
          reason: 'wrong_password',
          failedAttempts: updatedUser.failedLoginAttempts,
          locked: updatedUser.failedLoginAttempts >= LOGIN_FAILURE_LIMIT,
        },
        req,
      });
      return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR });
    }

    if (!user.emailVerified) {
      return res.status(401).json({
        success: false,
        error: 'Your email address is not verified. Please complete OTP verification before signing in.',
        requiresVerification: true,
      });
    }

    if (expectedRole === 'resolver') {
      const latestRequest = await prisma.resolverRequest.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { status: true },
      });
      if (
        latestRequest?.status === 'PENDING' ||
        (user.role === 'resolver' && user.status === 'PENDING')
      ) {
        return res.status(403).json({
          success: false,
          error: 'Your application is under review. You will receive an email when an administrator approves your application.',
        });
      }
      if (
        (user.role === 'resolver' && user.status === 'SUSPENDED') ||
        latestRequest?.status === 'SUSPENDED'
      ) {
        return res.status(403).json({
          success: false,
          error: 'Your resolver access is suspended. Please contact campus administration.',
        });
      }
      if (
        (user.role === 'resolver' && user.status === 'BLOCKED') ||
        latestRequest?.status === 'REJECTED'
      ) {
        return res.status(403).json({
          success: false,
          error: 'Your resolver application was not approved. Please contact campus administration if you need assistance.',
        });
      }
    }

    if (
      !user.isActive ||
      user.status !== 'ACTIVE'
    ) {
      return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR });
    }

    if (expectedRole) {
      const roleMatches =
        user.role === expectedRole ||
        (user.role === 'admin' && expectedRole === 'resolver');

      if (!roleMatches) {
        return res.status(401).json({
          success: false,
          error: GENERIC_LOGIN_ERROR,
        });
      }
    }

    const ipAddress =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      null;
    const userAgent = req.get('user-agent')?.slice(0, 512) || 'Unknown device';
    const deviceType = /tablet|ipad/i.test(userAgent)
      ? 'Tablet'
      : /mobile|iphone|android/i.test(userAgent)
      ? 'Mobile'
      : 'Desktop';

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          details: JSON.stringify({
            role: user.role,
            device: { type: deviceType, userAgent },
          }),
          ipAddress,
        },
      }),
    ]);

    const token = generateToken({
      id: user.id,
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      tokenVersion: user.tokenVersion,
    });

    setAuthCookie(res, token, user.role as UserRole);

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
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        emailVerified: user.emailVerified,
        department: user.department,
        year: user.year,
        studentId: user.studentId,
        phone: user.phone,
        createdAt: user.createdAt.toISOString(),
        settings: user.settings,
      },
    });
  } catch (error: unknown) {
    console.error('Error in login:', error);
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during login. Please try again.',
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    await logActivity({
      userId: req.user.id,
      action: 'LOGOUT',
      req,
    });
  }
  clearAuthCookie(res);
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me — Refresh session
// ---------------------------------------------------------------------------
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
        status: true,
        emailVerified: true,
        department: true,
        year: true,
        studentId: true,
        phone: true,
        avatar: true,
        isActive: true,
        mustChangePassword: true,
        tokenVersion: true,
        createdAt: true,
        updatedAt: true,
        settings: true,
      },
    });

    if (
      !user ||
      !user.isActive ||
      !user.emailVerified ||
      user.status === 'DELETED' ||
      user.status === 'SUSPENDED' ||
      user.status === 'BLOCKED'
    ) {
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
      tokenVersion: user.tokenVersion,
    });
    setAuthCookie(res, token, user.role as UserRole);

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
    return res.status(500).json({ success: false, error: 'Failed to retrieve session.' });
  }
});

export default router;
