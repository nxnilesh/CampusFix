import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../auth.js';
import { logActivity } from '../activityLog.js';
import { z } from 'zod';

const router = Router();

const createIssueSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(120, 'Title cannot exceed 120 characters'),
  category: z.string().min(1, 'Category is required'),
  categoryId: z.string().optional().nullable(),
  serviceId: z.string().optional().nullable(),
  location: z.string().min(1, 'Campus location is required'),
  room: z.string().min(1, 'Specific spot or room is required').max(80),
  priority: z.enum(['Low', 'Medium', 'High']),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description cannot exceed 1000 characters'),
  imageUrl: z.string().nullable().optional(),
});

const commentSchema = z.object({
  content: z.string().min(2, 'Comment must be at least 2 characters').max(500, 'Comment cannot exceed 500 characters'),
});

// Generate dynamic unique issue ID e.g. CF-2026-1047
async function generateUniqueIssueId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  let attempts = 0;
  while (attempts < 25) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const candidateId = `CF-${currentYear}-${randomNum}`;
    const exists = await prisma.issue.findUnique({
      where: { id: candidateId },
    });
    if (!exists) {
      return candidateId;
    }
    attempts++;
  }
  return `CF-${currentYear}-${Date.now().toString().slice(-4)}`;
}

// POST /api/issues (Student only)
router.post('/', requireRole('student'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = createIssueSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Validation failed',
      });
    }

    const { title, category, categoryId, serviceId, location, room, priority, description, imageUrl } = parseResult.data;
    const issueId = await generateUniqueIssueId();

    // Verify categoryId if provided or look up by name
    let effectiveCategoryId = categoryId || null;
    if (!effectiveCategoryId && category) {
      const foundCat = await prisma.category.findUnique({ where: { name: category } });
      if (foundCat) effectiveCategoryId = foundCat.id;
    }

    // Create the issue (core operation — must succeed)
    const result = await prisma.issue.create({
      data: {
        id: issueId,
        createdById: req.user!.id,
        title,
        categoryName: category,
        categoryId: effectiveCategoryId,
        serviceId: serviceId || null,
        location,
        room,
        priority,
        description,
        imageUrl: imageUrl || null,
        status: 'Reported',
      },
      include: {
        category: true,
        service: true,
      },
    });

    // Fire-and-forget: status history, notifications (do not block issue creation)
    Promise.allSettled([
      // Initial status history audit record
      prisma.issueStatusHistory.create({
        data: {
          issueId: result.id,
          previousStatus: 'None',
          newStatus: 'Reported',
          changedById: req.user!.id,
          changedByName: req.user!.name,
          note: 'Issue reported by student',
        },
      }),
      // Notification for student
      prisma.notification.create({
        data: {
          userId: req.user!.id,
          issueId: result.id,
          message: `Your issue ${result.id} ("${title}") was reported successfully.`,
          type: 'ISSUE_REPORTED',
        },
      }),
      // Notifications for on-duty resolvers/staff
      prisma.user.findMany({
        where: { role: { in: ['resolver', 'admin'] }, isActive: true },
        select: { id: true },
      }).then((resolvers) => {
        if (resolvers.length > 0) {
          return prisma.notification.createMany({
            data: resolvers.map((r) => ({
              userId: r.id,
              issueId: result.id,
              message: `New ${priority}-priority issue ${result.id} reported in ${location} (${room}).`,
              type: 'NEW_ISSUE',
            })),
          });
        }
      }),
    ]).catch((err) => console.error('[IssueRoutes] Post-creation side-effects error:', err));

    await logActivity({
      userId: req.user!.id,
      action: 'ISSUE_CREATED',
      entityId: result.id,
      entityType: 'ISSUE',
      details: { title: result.title, priority: result.priority, location: result.location },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Issue reported successfully.',
      data: result,
    });
  } catch (error: any) {
    console.error('Error creating issue:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create issue report. Please try again.',
    });
  }
});

// GET /api/issues/my (Student only)
router.get('/my', requireRole('student'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, status, category, priority, sort, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * take;

    const where: any = {
      createdById: req.user!.id,
    };

    if (status && status !== 'all') {
      where.status = status as string;
    }

    if (category && category !== 'all') {
      where.categoryName = category as string;
    }

    if (priority && priority !== 'all') {
      where.priority = priority as string;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { id: { contains: q } },
        { title: { contains: q } },
        { location: { contains: q } },
        { room: { contains: q } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sort === 'priority') {
      orderBy = { priority: 'asc' };
    } else if (sort === 'updated') {
      orderBy = { updatedAt: 'desc' };
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
          resolver: {
            select: { id: true, name: true, userId: true },
          },
          history: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    // Map `categoryName` to `category` for full compatibility with existing frontend types
    const mappedIssues = issues.map((iss) => ({
      ...iss,
      studentId: iss.createdById,
      category: iss.categoryName,
    }));

    return res.json({
      success: true,
      data: mappedIssues,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
      },
      count: total,
    });
  } catch (error) {
    console.error('Error fetching student issues:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch your reported issues.',
    });
  }
});

// GET /api/issues/track/:issueId
router.get('/track/:issueId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const issueId = req.params.issueId.trim();

    const where: any = { id: issueId };
    // Students can only view their own issues
    if (req.user!.role === 'student') {
      where.createdById = req.user!.id;
    }

    const issue = await prisma.issue.findFirst({
      where,
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
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        error: req.user!.role === 'student'
          ? 'No report matching this ID was found under your account.'
          : 'Report not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        ...issue,
        studentId: issue.createdById,
        category: issue.categoryName,
      },
    });
  } catch (error) {
    console.error('Error tracking issue:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while tracking the report.',
    });
  }
});

// GET /api/issues/:id (Details)
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const where: any = { id };
    if (req.user!.role === 'student') {
      where.createdById = req.user!.id;
    }

    const issue = await prisma.issue.findFirst({
      where,
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
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue report not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        ...issue,
        studentId: issue.createdById,
        category: issue.categoryName,
      },
    });
  } catch (error) {
    console.error('Error fetching issue:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve issue details.',
    });
  }
});

// POST /api/issues/:id/comments (Student & Staff/Admin comments)
router.post('/:id/comments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = commentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Invalid comment content',
      });
    }

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: { student: true },
    });

    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue report not found.' });
    }

    // Access control: only creator or staff/admin can comment
    if (req.user!.role === 'student' && issue.createdById !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const comment = await prisma.issueComment.create({
      data: {
        issueId: issue.id,
        userId: req.user!.id,
        content: parseResult.data.content,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    // Notify the other party
    if (req.user!.role === 'student' && issue.assignedToId) {
      await prisma.notification.create({
        data: {
          userId: issue.assignedToId,
          issueId: issue.id,
          message: `Student ${req.user!.name} commented on issue ${issue.id}.`,
          type: 'COMMENT',
        },
      });
    } else if (req.user!.role !== 'student' && issue.createdById !== req.user!.id) {
      await prisma.notification.create({
        data: {
          userId: issue.createdById,
          issueId: issue.id,
          message: `Campus staff added an update note to issue ${issue.id}.`,
          type: 'COMMENT',
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Comment posted.',
      data: comment,
    });
  } catch (error) {
    console.error('Error posting comment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to post comment.',
    });
  }
});

// DELETE /api/issues/:id (Student delete only while "Reported")
router.delete('/:id', requireRole('student'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const issue = await prisma.issue.findFirst({
      where: {
        id,
        createdById: req.user!.id,
      },
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue report not found.',
      });
    }

    if (issue.status !== 'Reported') {
      return res.status(400).json({
        success: false,
        error: 'This report cannot be withdrawn because facilities staff have already acknowledged or begun resolving it.',
      });
    }

    await prisma.issue.delete({
      where: { id: issue.id },
    });

    return res.json({
      success: true,
      message: 'Report cancelled and removed successfully.',
    });
  } catch (error) {
    console.error('Error deleting issue:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete issue report.',
    });
  }
});

export default router;
