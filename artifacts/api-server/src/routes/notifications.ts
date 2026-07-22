import { Router } from 'express';
import { db } from '@workspace/db';
import { notifications } from '@workspace/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middlewares/auth';

const router = Router();

// GET /api/notifications — list user notifications
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user.id))
      .orderBy(desc(notifications.createdAt));

    res.json(list);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/:id/read — mark specific notification as read
router.patch('/:id/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;

    const updated = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, req.user.id)))
      .returning();

    if (!updated.length) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json(updated[0]);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, req.user.id));

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
