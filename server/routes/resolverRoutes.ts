import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest, requireRole } from '../auth.js';
import { z } from 'zod';

const router = Router();

// Staff and Admin access
router.use(requireRole(['resolver', 'admin']));

const updateStatusSchema = z.object({
  status: z.enum([
    'Reported',
    'Acknowledged',
    'Under Review',
    'In Progress',
    'Resolved',
    'Closed',
    'Rejected',
  ]),
  note: z.string().optional(),
  resolutionNote: z.string().optional(),
});

const assignIssueSchema = z.object({
  assignedToId: z.string().min(1, 'Assignee user ID is required'),
});

// GET /api/resolver/issues
router.get('/issues', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, status, category, priority, location, sort, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * take;

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status as string;
    }

    if (category && category !== 'all') {
      where.categoryName = category as string;
    }

    if (priority && priority !== 'all') {
      where.priority = priority as string;
    }

    if (location && location !== 'all') {
      where.location = location as string;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { id: { contains: q } },
        { title: { contains: q } },
        { location: { contains: q } },
        { room: { contains: q } },
        { student: { name: { contains: q } } },
        { student: { userId: { contains: q } } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sort === 'updated') {
      orderBy = { updatedAt: 'desc' };
    } else if (sort === 'priority') {
      orderBy = { priority: 'asc' };
    }

    const [total, issues] = await Promise.all([
      prisma.issue.count({ where }),
      prisma.issue.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          category: true,
          service: true,
          student: {
            select: { id: true, name: true, userId: true, email: true, department: true, year: true },
          },
          resolver: {
            select: { id: true, name: true, userId: true, email: true, department: true },
          },
          history: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    const mapped = issues.map((iss) => ({
      ...iss,
      studentId: iss.createdById,
      category: iss.categoryName,
    }));

    return res.json({
      success: true,
      data: mapped,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
      },
    });
  } catch (error) {
    console.error('Error fetching resolver issues:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch issues for resolution.',
    });
  }
});

// PATCH /api/resolver/issues/:id/status
router.patch('/issues/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = updateStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Invalid status data',
      });
    }

    const { status: targetStatus, note, resolutionNote } = parseResult.data;

    const currentIssue = await prisma.issue.findUnique({
      where: { id },
      include: { student: true },
    });

    if (!currentIssue) {
      return res.status(404).json({
        success: false,
        error: 'Issue report not found.',
      });
    }

    const prevStatus = currentIssue.status;

    if (prevStatus === targetStatus) {
      return res.status(400).json({
        success: false,
        error: `Issue is already in "${targetStatus}" status.`,
      });
    }

    // When marking as Resolved, resolution note is required
    if (targetStatus === 'Resolved') {
      const effectiveNote = (resolutionNote || note || '').trim();
      if (!effectiveNote || effectiveNote.length < 5) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a clear resolution note (at least 5 characters) describing the action taken.',
        });
      }
    }

    const effectiveResolutionNote =
      targetStatus === 'Resolved'
        ? (resolutionNote || note || '').trim()
        : currentIssue.resolutionNote;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update issue
      const issue = await tx.issue.update({
        where: { id },
        data: {
          status: targetStatus,
          assignedToId: currentIssue.assignedToId || req.user!.id,
          resolutionNote: effectiveResolutionNote,
          resolvedAt: targetStatus === 'Resolved' ? new Date() : currentIssue.resolvedAt,
        },
        include: {
          category: true,
          service: true,
          student: {
            select: { id: true, name: true, userId: true, email: true, department: true, year: true },
          },
          resolver: {
            select: { id: true, name: true, userId: true, email: true },
          },
          history: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      // 2. Add audit trail
      await tx.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          previousStatus: prevStatus,
          newStatus: targetStatus,
          changedById: req.user!.id,
          changedByName: req.user!.name,
          note: note || (targetStatus === 'Resolved' ? effectiveResolutionNote : `Status changed to ${targetStatus}`),
        },
      });

      // 3. Create student notification
      let studentMessage = `Your issue ${issue.id} status changed to ${targetStatus}.`;
      if (targetStatus === 'Resolved') {
        studentMessage = `Your issue ${issue.id} has been marked resolved. Resolution: "${effectiveResolutionNote}"`;
      } else if (targetStatus === 'Acknowledged') {
        studentMessage = `Your issue ${issue.id} has been acknowledged by facilities staff.`;
      } else if (targetStatus === 'In Progress') {
        studentMessage = `Field crews are currently working on your issue ${issue.id}.`;
      }

      await tx.notification.create({
        data: {
          userId: currentIssue.createdById,
          issueId: issue.id,
          message: studentMessage,
          type: 'STATUS_UPDATE',
        },
      });

      return issue;
    });

    return res.json({
      success: true,
      message: `Issue updated to ${targetStatus} successfully.`,
      data: {
        ...updated,
        studentId: updated.createdById,
        category: updated.categoryName,
      },
    });
  } catch (error: any) {
    console.error('Error updating issue status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update issue status.',
    });
  }
});

// PATCH /api/resolver/issues/:id/assign
router.patch('/issues/:id/assign', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = assignIssueSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Invalid assignment data',
      });
    }

    const { assignedToId } = parseResult.data;

    const targetStaff = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, name: true, role: true },
    });

    if (!targetStaff || !['resolver', 'admin'].includes(targetStaff.role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assignee. Must be an active staff resolver or administrator.',
      });
    }

    const issue = await prisma.issue.update({
      where: { id },
      data: { assignedToId: targetStaff.id },
      include: {
        resolver: { select: { id: true, name: true, userId: true, email: true } },
      },
    });

    await prisma.notification.create({
      data: {
        userId: targetStaff.id,
        issueId: issue.id,
        message: `Issue ${issue.id} was assigned to you by ${req.user!.name}.`,
        type: 'ASSIGNMENT',
      },
    });

    return res.json({
      success: true,
      message: `Issue assigned to ${targetStaff.name}.`,
      data: issue,
    });
  } catch (error) {
    console.error('Error assigning issue:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to assign issue.',
    });
  }
});

// GET /api/resolver/analytics - Real-time statistics directly from PostgreSQL
router.get('/analytics', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const totalIssues = await prisma.issue.count();
    const resolvedIssues = await prisma.issue.count({ where: { status: 'Resolved' } });
    const inProgressIssues = await prisma.issue.count({ where: { status: 'In Progress' } });
    const acknowledgedIssues = await prisma.issue.count({ where: { status: 'Acknowledged' } });
    const reportedIssues = await prisma.issue.count({ where: { status: 'Reported' } });
    const highPriorityIssues = await prisma.issue.count({ where: { priority: 'High' } });

    const unresolvedIssues = totalIssues - resolvedIssues;
    const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 1000) / 10 : 0;

    // Category distribution
    const categoryGroups = await prisma.issue.groupBy({
      by: ['categoryName'],
      _count: { categoryName: true },
    });

    const categoryDistribution = categoryGroups
      .map((g) => ({
        category: g.categoryName,
        count: g._count.categoryName,
      }))
      .sort((a, b) => b.count - a.count);

    // Status distribution
    const statusGroups = await prisma.issue.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const statusDistribution = statusGroups.map((s) => ({
      status: s.status,
      count: s._count.status,
    }));

    // Priority distribution
    const priorityGroups = await prisma.issue.groupBy({
      by: ['priority'],
      _count: { priority: true },
    });

    const priorityDistribution = priorityGroups.map((p) => ({
      priority: p.priority,
      count: p._count.priority,
    }));

    // Location distribution
    const locationGroups = await prisma.issue.groupBy({
      by: ['location'],
      _count: { location: true },
    });

    const locationDistribution = locationGroups
      .map((l) => ({
        location: l.location,
        count: l._count.location,
      }))
      .sort((a, b) => b.count - a.count);

    const mostReportedCategory = categoryDistribution[0]?.category || 'None';
    const mostAffectedLocation = locationDistribution[0]?.location || 'None';

    // Recent activity audit trail
    const recentActivity = await prisma.issueStatusHistory.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        issue: {
          select: { id: true, title: true, priority: true, location: true },
        },
      },
    });

    return res.json({
      success: true,
      data: {
        totalIssues,
        resolvedIssues,
        inProgressIssues,
        acknowledgedIssues,
        reportedIssues,
        unresolvedIssues,
        highPriorityIssues,
        resolutionRate,
        mostReportedCategory,
        mostAffectedLocation,
        categoryDistribution,
        statusDistribution,
        priorityDistribution,
        locationDistribution,
        recentActivity,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to compute campus analytics from database.',
    });
  }
});

export default router;
