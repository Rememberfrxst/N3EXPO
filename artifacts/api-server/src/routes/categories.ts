import { Router } from 'express';
import { db } from '@workspace/db';
import { categories } from '@workspace/db/schema';
import { eq, asc } from 'drizzle-orm';

const router = Router();

// GET /api/categories — list all active categories
router.get('/', async (req, res) => {
  try {
    const list = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder));

    res.json(list);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/categories/:id — single category
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!row.length) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.json(row[0]);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
