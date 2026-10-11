/**
 * Admin Routes — /api/admin/*
 *
 * SECURITY: Every route in this file requires role === "admin".
 * Admin users have full oversight: manage users, resolver requests, issues, view activity logs.
 *
 * Never returns plaintext passwords. Uses bcrypt hash management only.
 */
import { Router, Response } from 'express';
import { randomInt } from 'crypto';
import { prisma } from '../db.js';
import { AuthenticatedRequest, requireRole, hashPassword } from '../auth.js';
import { logActivity } from '../activityLog.js';
import { isEmailDeliveryError, sendEmail } from '../email.js';
import { z } from 'zod';

const router = Router();

// All admin routes require admin role
router.use(requireRole('admin'));

// ---------------------------------------------------------------------------
// GET /api/admin/dashboard — Overview statistics
// ---------------------------------------------------------------------------
router.get('/dashboard', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      totalStudents,
      totalResolvers,
      pendingRequests,
      totalIssues,
      resolvedIssues,
      openIssues,
      highPriorityIssues,
      recentLogs,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'student' } }),
      prisma.user.count({ where: { role: 'resolver', status: 'ACTIVE' } }),
      prisma.resolverRequest.count({ where: { status: 'PENDING' } }),
      prisma.issue.count(),
      prisma.issue.count({ where: { status: 'Resolved' } }),
      prisma.issue.count({
        where: { status: { notIn: ['Resolved', 'Closed', 'Rejected'] } },
      }),
      prisma.issue.count({ where: { priority: 'High', status: { notIn: ['Resolved', 'Closed'] } } }),
      prisma.activityLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, userId: true, role: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        totalStudents,
        totalResolvers,
        pendingRequests,
        totalIssues,
        resolvedIssues,
        openIssues,
        highPriorityIssues,
        recentLogs,
      },
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load dashboard.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/users — List users with search / filter
// ---------------------------------------------------------------------------
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, role, status, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * take;

    const where: any = {};

    if (role === 'student' || role === 'resolver' || role === 'admin') {
      where.role = { equals: role, mode: 'insensitive' };
    }
    if (status && status !== 'all') where.status = status as string;

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { userId: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          role: true,
          status: true,
          department: true,
          year: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { issuesReported: true },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
      },
    });
  } catch (err) {
    console.error('Admin list users error:', err);
    return res.status(500).json({ success: false, error: 'Failed to list users.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/users/:id — Single user detail
// ---------------------------------------------------------------------------
router.get('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
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
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { issuesReported: true, issuesAssigned: true },
        },
        resolverRequests: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch user.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id/status — Suspend / block / activate
// ---------------------------------------------------------------------------
const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED', 'DELETED']),
  reason: z.string().optional(),
});

router.patch('/users/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = updateUserStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: parseResult.error.issues[0]?.message });
    }

    const { status, reason } = parseResult.data;
    const targetId = req.params.id;

    // Prevent admin from suspending themselves
    if (targetId === req.user!.id) {
      return res.status(400).json({ success: false, error: 'You cannot modify your own account status.' });
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ success: false, error: 'User not found.' });

    // Prevent modifying other admins
    if (target.role === 'admin') {
      return res.status(403).json({ success: false, error: 'Admin accounts cannot be modified here.' });
    }
    if (target.role === 'resolver' && target.status === 'PENDING') {
      return res.status(409).json({
        success: false,
        error: 'Pending resolver accounts must be approved or rejected from resolver applications.',
      });
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        status,
        isActive: status === 'ACTIVE',
      },
      select: { id: true, userId: true, name: true, role: true, status: true },
    });

    await logActivity({
      userId: req.user!.id,
      action: `USER_STATUS_CHANGED_${status}`,
      entityId: targetId,
      entityType: 'USER',
      details: { reason, targetUserId: target.userId, newStatus: status },
      req,
    });

    return res.json({ success: true, message: `User account status updated to ${status}.`, data: updated });
  } catch (err) {
    console.error('Admin update user status error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update user status.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/:id/reset-password — Force password reset
// ---------------------------------------------------------------------------
const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
});

router.post('/users/:id/reset-password', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: parseResult.error.issues[0]?.message });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ success: false, error: 'User not found.' });
    if (target.role === 'admin') {
      return res.status(403).json({ success: false, error: 'Cannot reset another admin password.' });
    }

    const newHash = await hashPassword(parseResult.data.newPassword);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash: newHash },
    });

    await logActivity({
      userId: req.user!.id,
      action: 'USER_PASSWORD_RESET',
      entityId: req.params.id,
      entityType: 'USER',
      details: { targetUserId: target.userId },
      req,
    });

    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to reset password.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:id — Soft-delete user
// ---------------------------------------------------------------------------
router.delete('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ success: false, error: 'User not found.' });
    if (target.id === req.user!.id) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own account.' });
    }
    if (target.role === 'admin') {
      return res.status(403).json({ success: false, error: 'Admin accounts cannot be deleted here.' });
    }

    // Soft delete — set status DELETED and deactivate
    await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'DELETED', isActive: false },
    });

    await logActivity({
      userId: req.user!.id,
      action: 'USER_DELETED',
      entityId: req.params.id,
      entityType: 'USER',
      details: { targetUserId: target.userId, name: target.name },
      req,
    });

    return res.json({ success: true, message: 'User account deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to delete user.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/resolver-requests — List all applications
// ---------------------------------------------------------------------------
router.get('/resolver-requests', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (status && status !== 'all') where.status = status as string;

    const [total, requests] = await Promise.all([
      prisma.resolverRequest.count({ where }),
      prisma.resolverRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              userId: true,
              name: true,
              email: true,
              role: true,
              status: true,
              emailVerified: true,
              department: true,
            },
          },
          reviewedBy: {
            select: { id: true, userId: true, name: true },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: requests,
      pagination: { total, page: pageNum, limit: take, totalPages: Math.ceil(total / take) || 1 },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to load resolver requests.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/resolver-requests/:id — Approve / reject / suspend
// ---------------------------------------------------------------------------
const reviewRequestSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  adminNote: z.string().max(500).optional(),
  rejectionReason: z.string().trim().min(1).max(500).optional(),
  department: z.string().optional(), // Optionally override department on approval
}).superRefine((data, context) => {
  if (data.action === 'REJECT' && !data.rejectionReason) {
    context.addIssue({
      code: 'custom',
      path: ['rejectionReason'],
      message: 'A rejection reason is required.',
    });
  }
});

class ResolverApplicationReviewConflictError extends Error {}

router.patch('/resolver-requests/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = reviewRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: parseResult.error.issues[0]?.message });
    }

    const { action, adminNote, rejectionReason, department } = parseResult.data;

    const application = await prisma.resolverRequest.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!application) {
      return res.status(404).json({ success: false, error: 'Resolver application not found.' });
    }

    if (action === 'APPROVE' && application.status === 'APPROVED') {
      return res.status(409).json({
        success: false,
        error: 'This application is already approved and the resolver account already exists. If the credential email was not delivered, ask the applicant to use Forgot Password; do not approve again.',
      });
    }

    if (application.userId === req.user!.id) {
      return res.status(403).json({ success: false, error: 'You cannot review your own resolver application.' });
    }
    const isExistingStudentApplication = application.user.role === 'student';
    const isPendingResolverRegistration =
      application.user.role === 'resolver' && application.user.status === 'PENDING';
    if (!isExistingStudentApplication && !isPendingResolverRegistration) {
      return res.status(409).json({ success: false, error: 'This account is not awaiting resolver approval.' });
    }
    if (action === 'APPROVE' && !application.user.emailVerified) {
      return res.status(409).json({ success: false, error: 'The applicant must verify their email before approval.' });
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const reviewedAt = new Date();
    const temporaryPassword = action === 'APPROVE'
      ? `${application.fullName.trim().split(/\s+/)[0]}@123`
      : null;
    const approvalPasswordHash = temporaryPassword
      ? await hashPassword(temporaryPassword)
      : null;

    const approvedResolverId = await prisma.$transaction(async (tx) => {
      let resolverId: string | null = null;
      if (action === 'APPROVE') {
        for (let attempt = 0; attempt < 20; attempt++) {
          const candidate = `RES${randomInt(10_000_000, 100_000_000)}`;
          const existing = await tx.user.findUnique({ where: { userId: candidate }, select: { id: true } });
          if (!existing) {
            resolverId = candidate;
            break;
          }
        }
        if (!resolverId) {
          throw new Error('Unable to allocate a unique resolver ID.');
        }
      }

      const review = await tx.resolverRequest.updateMany({
        where: { id: application.id, status: 'PENDING' },
        data: {
          status: newStatus,
          adminNote: action === 'APPROVE' ? adminNote || null : null,
          rejectionReason: action === 'REJECT' ? rejectionReason! : null,
          reviewedById: req.user!.id,
          reviewedAt,
          ...(department ? { department } : {}),
        },
      });
      if (review.count !== 1) {
        throw new ResolverApplicationReviewConflictError('Only pending applications can be reviewed.');
      }

      const userWhere = {
        id: application.userId,
        role: application.user.role,
        ...(isPendingResolverRegistration ? { status: 'PENDING' } : {}),
      };
      let roleTransition;
      if (action === 'APPROVE') {
        if (!resolverId || !approvalPasswordHash) {
          throw new Error('Approved resolver credentials were not generated.');
        }
        roleTransition = await tx.user.updateMany({
          where: userWhere,
          data: {
            role: 'resolver',
            status: 'ACTIVE',
            isActive: true,
            userId: resolverId,
            passwordHash: approvalPasswordHash,
            mustChangePassword: true,
            tokenVersion: { increment: 1 },
            ...(department ? { department } : {}),
          },
        });
      } else {
        roleTransition = await tx.user.updateMany({
          where: userWhere,
          data: isPendingResolverRegistration
            ? { status: 'BLOCKED', isActive: false }
            : { role: 'student' },
        });
      }
      if (roleTransition.count !== 1) {
        throw new ResolverApplicationReviewConflictError('The applicant is no longer a student.');
      }

      const messageMap = {
        APPROVE: `Congratulations! Your resolver application has been approved. You now have resolver access.`,
        REJECT: `Your resolver application has been reviewed. Unfortunately it was not approved at this time. Reason: ${rejectionReason}`,
      };

      await tx.notification.create({
        data: {
          userId: application.userId,
          message: messageMap[action],
          type: `RESOLVER_${action}`,
        },
      });

      const forwardedFor = req.headers['x-forwarded-for'];
      await tx.activityLog.create({
        data: {
          userId: req.user!.id,
          action: `RESOLVER_REQUEST_${action === 'APPROVE' ? 'APPROVED' : 'REJECTED'}`,
          entityId: application.userId,
          entityType: 'USER',
          details: JSON.stringify({
            requestId: application.id,
            targetUserId: application.userId,
            targetUserCode: resolverId ?? application.user.userId,
            rejectionReason: action === 'REJECT' ? rejectionReason : null,
          }),
          ipAddress:
            (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : null) ||
            req.socket.remoteAddress ||
            null,
          createdAt: reviewedAt,
        },
      });
      return resolverId;
    }, { timeout: 30000 });

    if (action === 'APPROVE') {
      if (!temporaryPassword || !approvedResolverId) {
        throw new Error('Approved resolver credentials were not generated.');
      }
      const escapeHtml = (value: string) =>
        value.replace(/[&<>"']/g, (character) => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character]!);
      const name = application.user.name;
      const email = application.user.email;
      const appUrl = (
        process.env.CAMPUSFIX_APP_URL ||
        process.env.CORS_ORIGIN ||
        process.env.RENDER_EXTERNAL_URL ||
        'http://localhost:3000'
      ).replace(/\/+$/, '');
      const loginUrl = `${appUrl}/resolver/login`;
      const subject = 'Congratulations! Your CampusFix Resolver Account Has Been Approved';
      const text = `Hello ${name},\n\nYour CampusFix Resolver application has been approved.\n\nYour account details:\n\nResolver ID: ${approvedResolverId}\nEmail: ${email}\nTemporary Password: ${temporaryPassword}\n\nSign in at: ${loginUrl}\n\nFor your security, you must change this temporary password immediately after your first sign-in. Choose a new password with at least 8 characters, including uppercase, lowercase, and a number. The temporary password will no longer work after you change it.\n\nRegards,\nCampusFix Administration`;
      const html = `<p>Hello ${escapeHtml(name)},</p><p>Your CampusFix Resolver application has been approved.</p><p>Your account details:</p><p>Resolver ID: ${escapeHtml(approvedResolverId)}<br>Email: ${escapeHtml(email)}<br>Temporary Password: ${escapeHtml(temporaryPassword)}</p><p>Sign in at: <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p><p>For your security, you must change this temporary password immediately after your first sign-in. Choose a new password with at least 8 characters, including uppercase, lowercase, and a number. The temporary password will no longer work after you change it.</p><p>Regards,<br>CampusFix Administration</p>`;

      await sendEmail({ to: email, subject, text, html });
    }

    return res.json({
      success: true,
      message: `Resolver application ${action.toLowerCase()}d successfully.`,
    });
  } catch (err) {
    if (err instanceof ResolverApplicationReviewConflictError) {
      return res.status(409).json({ success: false, error: err.message });
    }
    if (isEmailDeliveryError(err)) {
      return res.status(503).json({
        success: false,
        error: 'The application and resolver account were created, but the credential email could not be delivered. The approval cannot be repeated to avoid creating duplicate accounts. Ask the applicant to use Forgot Password or resolve the email delivery issue before signing in.',
      });
    }
    console.error('Admin review resolver request error:', err);
    return res.status(500).json({ success: false, error: 'Failed to review application.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/issues — View all issues with full management data
// ---------------------------------------------------------------------------
router.get('/issues', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      search, status, category, priority, department,
      page = '1', limit = '20', sort = 'newest',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (status && status !== 'all') where.status = status as string;
    if (category && category !== 'all') where.categoryName = category as string;
    if (priority && priority !== 'all') where.priority = priority as string;

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { id: { contains: q } },
        { title: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        { room: { contains: q, mode: 'insensitive' } },
        { student: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const orderByMap: Record<string, any> = {
      newest: { createdAt: 'desc' },
      oldest: { createdAt: 'asc' },
      updated: { updatedAt: 'desc' },
      priority: { priority: 'desc' },
    };
    const orderBy = orderByMap[sort as string] || { createdAt: 'desc' };

    const [total, issues] = await Promise.all([
      prisma.issue.count({ where }),
      prisma.issue.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          student: { select: { id: true, name: true, userId: true, email: true, department: true } },
          resolver: { select: { id: true, name: true, userId: true } },
          _count: { select: { votes: true, comments: true } },
        },
      }),
    ]);

    const mapped = issues.map((i) => ({ ...i, category: i.categoryName }));

    return res.json({
      success: true,
      data: mapped,
      pagination: { total, page: pageNum, limit: take, totalPages: Math.ceil(total / take) || 1 },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to load issues.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/issues/:id — Update category, priority, assign resolver
// ---------------------------------------------------------------------------
const adminUpdateIssueSchema = z.object({
  categoryName: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  assignedToId: z.string().optional().nullable(),
  status: z.string().optional(),
});

router.patch('/issues/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = adminUpdateIssueSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: parseResult.error.issues[0]?.message });
    }

    const { categoryName, priority, assignedToId, status } = parseResult.data;

    const issue = await prisma.issue.findUnique({ where: { id: req.params.id } });
    if (!issue) return res.status(404).json({ success: false, error: 'Issue not found.' });

    // If assigning a resolver, verify they're staff/resolver
    if (assignedToId) {
      const resolver = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!resolver || !['resolver', 'admin'].includes(resolver.role)) {
        return res.status(400).json({ success: false, error: 'Invalid resolver assignment.' });
      }
    }

    const updated = await prisma.issue.update({
      where: { id: req.params.id },
      data: {
        ...(categoryName ? { categoryName } : {}),
        ...(priority ? { priority } : {}),
        ...(assignedToId !== undefined ? { assignedToId } : {}),
        ...(status ? { status } : {}),
      },
    });

    await logActivity({
      userId: req.user!.id,
      action: 'ADMIN_ISSUE_UPDATED',
      entityId: issue.id,
      entityType: 'ISSUE',
      details: { categoryName, priority, assignedToId, status },
      req,
    });

    return res.json({ success: true, message: 'Issue updated.', data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update issue.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/issues/:id — Hard delete inappropriate issue
// ---------------------------------------------------------------------------
router.delete('/issues/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const issue = await prisma.issue.findUnique({ where: { id: req.params.id } });
    if (!issue) return res.status(404).json({ success: false, error: 'Issue not found.' });

    await prisma.issue.delete({ where: { id: req.params.id } });

    await logActivity({
      userId: req.user!.id,
      action: 'ADMIN_ISSUE_DELETED',
      entityId: req.params.id,
      entityType: 'ISSUE',
      details: { title: issue.title, deletedBy: req.user!.userId },
      req,
    });

    return res.json({ success: true, message: 'Issue deleted by administrator.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to delete issue.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/activity-logs — Audit trail
// ---------------------------------------------------------------------------
router.get('/activity-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, userId, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (action && action !== 'all') where.action = { contains: action as string };
    if (userId) where.userId = userId as string;

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, userId: true, role: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: { total, page: pageNum, limit: take, totalPages: Math.ceil(total / take) || 1 },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to load activity logs.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/login-activity — Recent successful logins
// ---------------------------------------------------------------------------
router.get('/login-activity', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? '50'), 10) || 50));
    const activity = await prisma.activityLog.findMany({
      where: { action: 'LOGIN', ...(userId ? { userId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, userId: true, email: true, role: true } },
      },
    });

    return res.json({ success: true, data: activity });
  } catch (err) {
    console.error('Admin login activity error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load login activity.' });
  }
});

export default router;
