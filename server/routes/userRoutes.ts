import { Router, Response } from 'express';
import { prisma } from '../db.js';
import {
  AuthenticatedRequest,
  requireAuth,
  hashPassword,
  comparePassword,
  generateToken,
  setAuthCookie,
  UserRole,
} from '../auth.js';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

// GET /api/users/login-activity — Recent successful logins for the current user
router.get('/login-activity', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const activity = await prisma.activityLog.findMany({
      where: { userId: req.user!.id, action: 'LOGIN' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        details: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    return res.json({ success: true, data: activity });
  } catch (error) {
    console.error('Error fetching login activity:', error);
    return res.status(500).json({ success: false, error: 'Failed to load login activity.' });
  }
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  department: z.string().optional().nullable(),
  year: z.string().optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

const updateSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  compactMode: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  statusAlerts: z.boolean().optional(),
});

// GET /api/users/profile
router.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        status: true,
        department: true,
        year: true,
        studentId: true,
        phone: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        settings: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch profile.' });
  }
});

// PATCH /api/users/profile
router.patch('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Invalid profile data',
      });
    }

    const { name, department, year } = parseResult.data;

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name,
        department: department || null,
        year: year || null,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        status: true,
        department: true,
        year: true,
        studentId: true,
        phone: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
});

// PATCH /api/users/password
router.patch('/password', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Validation failed',
      });
    }

    const { currentPassword, newPassword } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect.',
      });
    }

    if (user.mustChangePassword && await comparePassword(newPassword, user.passwordHash)) {
      return res.status(400).json({
        success: false,
        error: 'Choose a new password different from your temporary password.',
      });
    }

    const newHash = await hashPassword(newPassword);

    const changed = await prisma.user.updateMany({
      where: { id: user.id, tokenVersion: req.user!.tokenVersion ?? 0 },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
    });
    if (changed.count !== 1) {
      return res.status(401).json({
        success: false,
        error: 'Your session has expired. Please sign in again.',
      });
    }

    const tokenVersion = (req.user!.tokenVersion ?? 0) + 1;
    const token = generateToken({
      id: user.id,
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      tokenVersion,
    });
    setAuthCookie(res, token, user.role as UserRole);

    return res.json({
      success: true,
      message: 'Password changed successfully.',
      data: { token, mustChangePassword: false },
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ success: false, error: 'Failed to update password.' });
  }
});

// GET /api/users/settings
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let settings = await prisma.userSettings.findUnique({
      where: { userId: req.user!.id },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: req.user!.id,
          theme: 'system',
          compactMode: false,
          emailNotifications: true,
          statusAlerts: true,
        },
      });
    }

    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ success: false, error: 'Failed to load user settings.' });
  }
});

// PATCH /api/users/settings
router.patch('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = updateSettingsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Invalid settings data',
      });
    }

    const updated = await prisma.userSettings.upsert({
      where: { userId: req.user!.id },
      update: parseResult.data,
      create: {
        userId: req.user!.id,
        theme: parseResult.data.theme || 'system',
        compactMode: parseResult.data.compactMode ?? false,
        emailNotifications: parseResult.data.emailNotifications ?? true,
        statusAlerts: parseResult.data.statusAlerts ?? true,
      },
    });

    return res.json({
      success: true,
      message: 'Settings saved successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ success: false, error: 'Failed to update settings.' });
  }
});

export default router;
