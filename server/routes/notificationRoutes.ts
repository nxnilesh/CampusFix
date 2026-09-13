import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/notifications
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, read: false },
    });

    return res.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications.' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const notif = await prisma.notification.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!notif) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }

    const updated = await prisma.notification.update({
      where: { id: notif.id },
      data: { read: true },
    });

    return res.json({
      success: true,
      message: 'Notification marked as read.',
      data: updated,
    });
  } catch (error) {
    console.error('Error marking notification read:', error);
    return res.status(500).json({ success: false, error: 'Failed to update notification.' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });

    return res.json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    return res.status(500).json({ success: false, error: 'Failed to mark notifications read.' });
  }
});

export default router;
