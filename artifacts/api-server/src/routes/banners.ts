import { Router } from 'express';
import { db } from '@workspace/db';
import { banners } from '@workspace/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';

const router = Router();

// GET /api/banners — list all active banners
router.get('/', async (req, res) => {
  try {
    const list = await db
      .select()
      .from(banners)
      .where(and(
        eq(banners.isActive, true),
        // Filter by date range if startsAt and endsAt are defined
        sql`(${banners.startsAt} IS NULL OR ${banners.startsAt} <= NOW())`,
        sql`(${banners.endsAt} IS NULL OR ${banners.endsAt} >= NOW())`
      ))
      .orderBy(asc(banners.sortOrder));

    res.json(list);
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
