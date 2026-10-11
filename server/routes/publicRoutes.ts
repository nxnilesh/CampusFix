/**
 * Public Transparency Dashboard Route — /api/public/*
 *
 * No authentication required.
 * Never reveals personal data (emails, phones, names of reporters).
 * Shows aggregated issue statistics for campus transparency.
 */
import { Router, Request, Response } from 'express';
import { prisma, isDatabaseConnectionError, DATABASE_UNAVAILABLE_MESSAGE } from '../db.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/public/dashboard — Aggregated public transparency data
// ---------------------------------------------------------------------------
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [
      topVoted,
      recentlyResolved,
      categoryDistribution,
      highPriorityOpen,
      totalIssues,
      resolvedIssues,
      openIssues,
    ] = await Promise.all([
      // Most voted issues (top 10) — no personal data exposed
      prisma.issue.findMany({
        where: {
          status: { notIn: ['Rejected', 'Closed'] },
        },
        orderBy: { votes: { _count: 'desc' } },
        take: 10,
        select: {
          id: true,
          title: true,
          categoryName: true,
          location: true,
          priority: true,
          status: true,
          createdAt: true,
          _count: {
            select: { votes: true },
          },
        },
      }),

      // Recently resolved issues (last 10)
      prisma.issue.findMany({
        where: { status: { in: ['Resolved', 'Closed'] } },
        orderBy: { resolvedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          categoryName: true,
          location: true,
          status: true,
          resolvedAt: true,
          resolutionNote: true,
          _count: {
            select: { votes: true },
          },
        },
      }),

      // Category distribution for most reported
      prisma.issue.groupBy({
        by: ['categoryName'],
        _count: { categoryName: true },
        orderBy: { _count: { categoryName: 'desc' } },
        take: 8,
      }),

      // High priority open issues
      prisma.issue.findMany({
        where: {
          priority: 'High',
          status: { notIn: ['Resolved', 'Closed', 'Rejected'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          categoryName: true,
          location: true,
          status: true,
          createdAt: true,
          _count: {
            select: { votes: true },
          },
        },
      }),

      // Overall stats
      prisma.issue.count(),
      prisma.issue.count({ where: { status: { in: ['Resolved', 'Closed'] } } }),
      prisma.issue.count({ where: { status: { notIn: ['Resolved', 'Closed', 'Rejected'] } } }),
    ]);

    const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

    return res.json({
      success: true,
      data: {
        stats: {
          totalIssues,
          resolvedIssues,
          openIssues,
          resolutionRate,
        },
        topVoted: topVoted.map((i) => ({
          id: i.id,
          title: i.title,
          category: i.categoryName,
          location: i.location,
          priority: i.priority,
          status: i.status,
          votes: i._count.votes,
          createdAt: i.createdAt,
        })),
        recentlyResolved: recentlyResolved.map((i) => ({
          id: i.id,
          title: i.title,
          category: i.categoryName,
          location: i.location,
          status: i.status,
          votes: i._count.votes,
          resolvedAt: i.resolvedAt,
          resolutionNote: i.resolutionNote,
        })),
        categoryDistribution: categoryDistribution.map((c) => ({
          category: c.categoryName,
          count: c._count.categoryName,
        })),
        highPriorityOpen: highPriorityOpen.map((i) => ({
          id: i.id,
          title: i.title,
          category: i.categoryName,
          location: i.location,
          status: i.status,
          votes: i._count.votes,
          createdAt: i.createdAt,
        })),
      },
    });
  } catch (err) {
    console.error('Public dashboard error:', err);
    if (isDatabaseConnectionError(err)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    return res.status(500).json({ success: false, error: 'Failed to load public dashboard.' });
  }
});

export default router;
