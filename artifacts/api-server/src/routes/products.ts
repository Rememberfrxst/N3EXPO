import { Router } from 'express';
import { db } from '@workspace/db';
import { products, productImages, productVariants, categories, reviews, userActivity } from '@workspace/db/schema';
import { eq, like, and, desc, asc, ilike, or, sql } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middlewares/auth';

const router = Router();

// GET /api/products — list with filters
router.get('/', async (req, res) => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      sort = 'newest',
      page = '1',
      limit = '20',
      featured,
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(products.isActive, true)];

    if (q) conditions.push(ilike(products.name, `%${q}%`));
    if (category) {
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(category);
      if (isUuid) {
        conditions.push(eq(products.categoryId, category));
      } else {
        const catRows = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, category)).limit(1);
        if (catRows.length > 0) {
          conditions.push(eq(products.categoryId, catRows[0].id));
        }
      }
    }
    if (minPrice) conditions.push(sql`${products.price} >= ${parseFloat(minPrice)}`);
    if (maxPrice) conditions.push(sql`${products.price} <= ${parseFloat(maxPrice)}`);
    if (featured === 'true') conditions.push(eq(products.isFeatured, true));

    let orderBy;
    switch (sort) {
      case 'price_asc': orderBy = asc(products.price); break;
      case 'price_desc': orderBy = desc(products.price); break;
      case 'rating': orderBy = desc(products.avgRating); break;
      case 'popular': orderBy = desc(products.totalSold); break;
      default: orderBy = desc(products.createdAt);
    }

    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        brand: products.brand,
        stock: products.stock,
        avgRating: products.avgRating,
        totalReviews: products.totalReviews,
        totalSold: products.totalSold,
        isFeatured: products.isFeatured,
        categoryId: products.categoryId,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limitNum)
      .offset(offset);

    // Attach primary image for each product
    const productIds = rows.map((p) => p.id);
    let images: { productId: string; url: string }[] = [];
    if (productIds.length > 0) {
      const { inArray } = await import('drizzle-orm');
      images = await db
        .select({ productId: productImages.productId, url: productImages.url })
        .from(productImages)
        .where(and(
          eq(productImages.isPrimary, true),
          inArray(productImages.productId, productIds)
        ));
    }

    const imageMap = new Map(images.map((i) => [i.productId, i.url]));
    const result = rows.map((p) => ({ ...p, imageUrl: imageMap.get(p.id) || null }));

    res.json({ data: result, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id — single product with images, variants, reviews
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const productRows = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.isActive, true)))
      .limit(1);

    if (!productRows.length) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const product = productRows[0];

    const [images, variants, productReviews] = await Promise.all([
      db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.sortOrder)),
      db.select().from(productVariants).where(eq(productVariants.productId, id)),
      db.select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        comment: reviews.comment,
        isVerified: reviews.isVerified,
        createdAt: reviews.createdAt,
        userId: reviews.userId,
      }).from(reviews).where(eq(reviews.productId, id)).orderBy(desc(reviews.createdAt)).limit(10),
    ]);

    res.json({ ...product, images, variants, reviews: productReviews });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id/reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '10' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const reviewRows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.productId, id))
      .orderBy(desc(reviews.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json({ data: reviewRows, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products/:id/reviews — add a review (auth required)
router.post('/:id/reviews', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment } = req.body;

    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5' });
      return;
    }

    const newReview = await db.insert(reviews).values({
      productId: id,
      userId: req.user.id,
      rating: parseInt(rating),
      title,
      comment,
    }).returning();

    // Update product avg rating and total reviews
    await db.execute(sql`
      UPDATE products SET
        avg_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE product_id = ${id}),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE product_id = ${id}),
        updated_at = NOW()
      WHERE id = ${id}
    `);

    // Track activity
    await db.insert(userActivity).values({
      userId: req.user.id,
      productId: id,
      action: 'review',
    }).catch(() => {}); // non-blocking

    res.status(201).json(newReview[0]);
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
