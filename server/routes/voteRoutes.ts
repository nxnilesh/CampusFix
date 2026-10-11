/**
 * Vote Routes — /api/votes/*
 *
 * Students can cast one vote per issue.
 * Votes increase issue priority visibility.
 * Public dashboard may read vote counts without authentication.
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../auth.js';
import { logActivity } from '../activityLog.js';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/votes/:issueId — Cast vote (authenticated student only)
// ---------------------------------------------------------------------------
router.post('/:issueId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { issueId } = req.params;

    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    // Check for duplicate vote
    const existing = await prisma.issueVote.findUnique({
      where: { issueId_userId: { issueId, userId: req.user!.id } },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'You have already voted for this issue.',
      });
    }

    await prisma.issueVote.create({
      data: { issueId, userId: req.user!.id },
    });

    const voteCount = await prisma.issueVote.count({ where: { issueId } });

    await logActivity({
      userId: req.user!.id,
      action: 'ISSUE_VOTED',
      entityId: issueId,
      entityType: 'ISSUE',
      req,
    });

    return res.json({
      success: true,
      message: 'Vote cast successfully.',
      data: { issueId, voteCount },
    });
  } catch (err) {
    console.error('Vote error:', err);
    return res.status(500).json({ success: false, error: 'Failed to cast vote.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/votes/:issueId — Remove vote (authenticated)
// ---------------------------------------------------------------------------
router.delete('/:issueId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { issueId } = req.params;

    const existing = await prisma.issueVote.findUnique({
      where: { issueId_userId: { issueId, userId: req.user!.id } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'You have not voted for this issue.' });
    }

    await prisma.issueVote.delete({
      where: { issueId_userId: { issueId, userId: req.user!.id } },
    });

    const voteCount = await prisma.issueVote.count({ where: { issueId } });

    return res.json({
      success: true,
      message: 'Vote removed.',
      data: { issueId, voteCount },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to remove vote.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/votes/:issueId — Public vote count
// ---------------------------------------------------------------------------
router.get('/:issueId', async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const voteCount = await prisma.issueVote.count({ where: { issueId } });

    return res.json({ success: true, data: { issueId, voteCount } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch vote count.' });
  }
});

export default router;
