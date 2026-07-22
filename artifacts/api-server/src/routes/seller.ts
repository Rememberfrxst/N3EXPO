import { Router } from 'express';
import { db } from '@workspace/db';
import { products, productImages, productVariants, orders, orderItems } from '@workspace/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest } from '../middlewares/auth';

const router = Router();

// Apply auth guard for all seller routes
router.use(requireAuth, requireRole('seller'));

// GET /api/seller/dashboard — statistics
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const [statsRows, productsCountRows] = await Promise.all([
      db.select({
        totalSold: sql`SUM(${orderItems.quantity})`,
        revenue: sql`SUM(CAST(${orderItems.totalPrice} AS DECIMAL))`
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(products.sellerId, req.user.id)),

      db.select({ count: sql`COUNT(*)` })
      .from(products)
      .where(eq(products.sellerId, req.user.id)),
    ]);

    const totalSold = parseInt((statsRows[0] as any).totalSold || '0');
    const revenue = parseFloat((statsRows[0] as any).revenue || '0');
    const totalProducts = parseInt((productsCountRows[0] as any).count || '0');

    res.json({ totalSold, revenue, totalProducts });
  } catch (error) {
    console.error('Seller stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/seller/products — get seller products
router.get('/products', async (req: AuthRequest, res) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const list = await db
      .select()
      .from(products)
      .where(eq(products.sellerId, req.user.id))
      .orderBy(desc(products.createdAt));

    res.json(list);
  } catch (error) {
    console.error('Seller list products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/seller/products — create product
router.post('/products', async (req: AuthRequest, res) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { name, description, price, compareAtPrice, categoryId, brand, sku, stock, specifications, tags, images, variants } = req.body;

    if (!name || !price) {
      res.status(400).json({ error: 'name and price are required' });
      return;
    }

    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

    const newProduct = await db.transaction(async (tx) => {
      const inserted = await tx.insert(products).values({
        name,
        slug,
        description,
        price: price.toString(),
        compareAtPrice: compareAtPrice ? compareAtPrice.toString() : null,
        categoryId,
        sellerId: req.user!.id,
        brand,
        sku,
        stock: stock || 0,
        specifications,
        tags,
      }).returning();

      const product = inserted[0];

      // Insert images if provided
      if (images && Array.isArray(images) && images.length > 0) {
        await tx.insert(productImages).values(images.map((img: any, idx: number) => ({
          productId: product.id,
          url: img.url,
          altText: img.altText || null,
          sortOrder: idx + 1,
          isPrimary: idx === 0,
        })));
      }

      // Insert variants if provided
      if (variants && Array.isArray(variants) && variants.length > 0) {
        await tx.insert(productVariants).values(variants.map((v: any) => ({
          productId: product.id,
          name: v.name,
          value: v.value,
          priceModifier: v.priceModifier ? v.priceModifier.toString() : '0.00',
          stock: v.stock || 0,
          sku: v.sku || null,
        })));
      }

      return product;
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Seller create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/seller/orders — list orders containing seller's products
router.get('/orders', async (req: AuthRequest, res) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const list = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        createdAt: orders.createdAt,
        paymentStatus: orders.paymentStatus,
        item: {
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          totalPrice: orderItems.totalPrice,
        },
        product: {
          name: products.name,
        }
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(products.sellerId, req.user.id))
      .orderBy(desc(orders.createdAt));

    res.json(list);
  } catch (error) {
    console.error('Seller list orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
