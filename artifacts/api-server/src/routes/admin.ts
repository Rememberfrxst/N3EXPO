import { Router } from 'express';
import { db } from '@workspace/db';
import { users, orders, orderItems, products, productImages, productVariants, coupons, banners, categories, adminAuditLogs, notifications } from '@workspace/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest } from '../middlewares/auth';
import { getPusher } from '../lib/pusher';

const router = Router();

// Apply auth guard for all admin routes
router.use(requireAuth, requireRole('admin'));

// Audit Logger Helper
async function logAdminAction(adminId: string, action: string, targetEntity?: string, metadata?: any, req?: AuthRequest) {
  try {
    const ipAddress = req?.headers['x-forwarded-for'] as string || req?.socket.remoteAddress || '127.0.0.1';
    await db.insert(adminAuditLogs).values({
      adminId,
      action,
      targetEntity,
      metadata,
      ipAddress,
    });
  } catch (e) {
    console.error('Failed to log admin action:', e);
  }
}

// CSV Sanitization Helper to prevent CSV Formula Injection
function sanitizeCSVCell(value: any): string {
  if (typeof value !== 'string') return String(value ?? '');
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`; // Prefix dangerous characters with single quote
  }
  return trimmed;
}

// GET /api/admin/dashboard — general statistics
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const [totalUsersRows, totalOrdersRows, totalRevenueRows, lowStockRows] = await Promise.all([
      db.select({ count: sql`COUNT(*)` }).from(users),
      db.select({ count: sql`COUNT(*)` }).from(orders),
      db.select({ sum: sql`SUM(CAST(total AS DECIMAL))` }).from(orders).where(eq(orders.paymentStatus, 'paid')),
      db.select({ count: sql`COUNT(*)` }).from(products).where(sql`stock <= 5`),
    ]);

    const totalUsers = parseInt((totalUsersRows[0] as any).count || '0');
    const totalOrders = parseInt((totalOrdersRows[0] as any).count || '0');
    const totalRevenue = parseFloat((totalRevenueRows[0] as any).sum || '0');
    const lowStockCount = parseInt((lowStockRows[0] as any).count || '0');

    res.json({ totalUsers, totalOrders, totalRevenue, lowStockCount });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/audit-logs — list audit logs
router.get('/audit-logs', async (req: AuthRequest, res) => {
  try {
    const logs = await db
      .select({
        id: adminAuditLogs.id,
        adminId: adminAuditLogs.adminId,
        adminName: users.name,
        action: adminAuditLogs.action,
        targetEntity: adminAuditLogs.targetEntity,
        metadata: adminAuditLogs.metadata,
        ipAddress: adminAuditLogs.ipAddress,
        createdAt: adminAuditLogs.createdAt,
      })
      .from(adminAuditLogs)
      .leftJoin(users, eq(adminAuditLogs.adminId, users.id))
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(100);

    res.json(logs);
  } catch (error) {
    console.error('Admin audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users — list all users
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const list = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isVerified: users.isVerified,
      is2faEnabled: users.is2faEnabled,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));

    res.json(list);
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/users/:id — update user role/status
router.patch('/users/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { role, isVerified } = req.body;

    const updated = await db
      .update(users)
      .set({
        ...(role !== undefined && { role }),
        ...(isVerified !== undefined && { isVerified }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!updated.length) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await logAdminAction(req.user!.id, 'UPDATE_USER', `User:${id}`, { role, isVerified }, req);
    res.json(updated[0]);
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/products — get all products
router.get('/products', async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt));

    // Fetch primary images
    const productIds = list.map(p => p.id);
    let images: any[] = [];
    if (productIds.length > 0) {
      images = await db.select().from(productImages).where(inArray(productImages.productId, productIds));
    }

    const enriched = list.map(p => ({
      ...p,
      images: images.filter(img => img.productId === p.id),
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Admin products list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/products — create product
router.post('/products', async (req: AuthRequest, res) => {
  try {
    const { name, description, price, compareAtPrice, categoryId, brand, sku, stock, isActive, isFeatured, images, specifications, tags } = req.body;
    
    if (!name || !price) {
      res.status(400).json({ error: 'name and price are required' });
      return;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString(36);

    const inserted = await db.insert(products).values({
      name,
      slug,
      description,
      price: price.toString(),
      compareAtPrice: compareAtPrice ? compareAtPrice.toString() : null,
      categoryId,
      brand,
      sku: sku || 'SKU-' + Date.now(),
      stock: stock !== undefined ? Number(stock) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : false,
      specifications,
      tags,
    }).returning();

    const product = inserted[0];

    // Insert image URLs if provided
    if (Array.isArray(images) && images.length > 0) {
      const imgValues = images.map((url: string, index: number) => ({
        productId: product.id,
        url,
        isPrimary: index === 0,
        sortOrder: index,
      }));
      await db.insert(productImages).values(imgValues);
    }

    await logAdminAction(req.user!.id, 'CREATE_PRODUCT', `Product:${product.id}`, { name, price }, req);
    res.status(201).json(product);
  } catch (error) {
    console.error('Admin create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/products/:id — update product
router.patch('/products/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, compareAtPrice, categoryId, brand, sku, stock, isActive, isFeatured } = req.body;

    const updated = await db
      .update(products)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: price.toString() }),
        ...(compareAtPrice !== undefined && { compareAtPrice: compareAtPrice.toString() }),
        ...(categoryId !== undefined && { categoryId }),
        ...(brand !== undefined && { brand }),
        ...(sku !== undefined && { sku }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (!updated.length) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    await logAdminAction(req.user!.id, 'UPDATE_PRODUCT', `Product:${id}`, req.body, req);
    res.json(updated[0]);
  } catch (error) {
    console.error('Admin update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/products/:id — delete product
router.delete('/products/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete(products).where(eq(products.id, id)).returning();
    if (!deleted.length) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    await logAdminAction(req.user!.id, 'DELETE_PRODUCT', `Product:${id}`, {}, req);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Admin delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/products/bulk — CSV Bulk Upload with Formula Injection Prevention
router.post('/products/bulk', async (req: AuthRequest, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: '`items` array is required' });
      return;
    }

    if (items.length > 500) {
      res.status(400).json({ error: 'Maximum 500 rows allowed per CSV batch' });
      return;
    }

    const insertedList = [];
    for (const item of items) {
      const name = sanitizeCSVCell(item.name);
      const description = sanitizeCSVCell(item.description);
      const brand = sanitizeCSVCell(item.brand);
      const price = parseFloat(item.price) || 0;
      const stock = parseInt(item.stock) || 0;

      if (!name || price <= 0) continue;

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString(36);
      const inserted = await db.insert(products).values({
        name,
        slug,
        description,
        price: price.toString(),
        brand,
        stock,
        sku: 'CSV-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      }).returning();
      insertedList.push(inserted[0]);
    }

    await logAdminAction(req.user!.id, 'BULK_IMPORT_PRODUCTS', 'Products', { count: insertedList.length }, req);
    res.status(201).json({ success: true, importedCount: insertedList.length });
  } catch (error) {
    console.error('Admin bulk product import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/orders — list all orders
router.get('/orders', async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        userId: orders.userId,
        customerName: users.name,
        customerEmail: users.email,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        total: orders.total,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt));

    res.json(list);
  } catch (error) {
    console.error('Admin orders list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/orders/:id — order details
router.get('/orders/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const orderRecords = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!orderRecords.length) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    const order = orderRecords[0];
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));

    res.json({ ...order, items });
  } catch (error) {
    console.error('Admin order detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/orders/:id/status — update status
router.patch('/orders/:id/status', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const updated = await db
      .update(orders)
      .set({
        ...(status !== undefined && { status }),
        ...(paymentStatus !== undefined && { paymentStatus }),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    if (!updated.length) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    await logAdminAction(req.user!.id, 'UPDATE_ORDER_STATUS', `Order:${id}`, { status, paymentStatus }, req);
    res.json(updated[0]);
  } catch (error) {
    console.error('Admin update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD Categories
router.get('/categories', async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(categories).orderBy(categories.sortOrder);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/categories', async (req: AuthRequest, res) => {
  try {
    const { name, slug, icon, color, imageUrl, parentId, sortOrder } = req.body;
    if (!name || !slug) {
      res.status(400).json({ error: 'name and slug are required' });
      return;
    }
    const inserted = await db.insert(categories).values({
      name,
      slug,
      icon,
      color,
      imageUrl,
      parentId,
      sortOrder,
    }).returning();
    await logAdminAction(req.user!.id, 'CREATE_CATEGORY', `Category:${inserted[0].id}`, { name }, req);
    res.status(201).json(inserted[0]);
  } catch (error) {
    console.error('Admin create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/categories/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete(categories).where(eq(categories.id, id)).returning();
    if (!deleted.length) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    await logAdminAction(req.user!.id, 'DELETE_CATEGORY', `Category:${id}`, {}, req);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD Coupons
router.get('/coupons', async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(coupons).orderBy(desc(coupons.isActive));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/coupons', async (req: AuthRequest, res) => {
  try {
    const { code, discountType, discountValue, minOrderValue, maxDiscount, usageLimit, validFrom, validUntil } = req.body;
    if (!code || !discountType || !discountValue) {
      res.status(400).json({ error: 'code, discountType, and discountValue are required' });
      return;
    }
    const inserted = await db.insert(coupons).values({
      code,
      discountType,
      discountValue: discountValue.toString(),
      minOrderValue: minOrderValue ? minOrderValue.toString() : null,
      maxDiscount: maxDiscount ? maxDiscount.toString() : null,
      usageLimit,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
    }).returning();
    await logAdminAction(req.user!.id, 'CREATE_COUPON', `Coupon:${inserted[0].id}`, { code }, req);
    res.status(201).json(inserted[0]);
  } catch (error) {
    console.error('Admin create coupon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/coupons/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete(coupons).where(eq(coupons.id, id)).returning();
    if (!deleted.length) {
      res.status(404).json({ error: 'Coupon not found' });
      return;
    }
    await logAdminAction(req.user!.id, 'DELETE_COUPON', `Coupon:${id}`, {}, req);
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD Banners
router.get('/banners', async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(banners).orderBy(banners.sortOrder);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/banners', async (req: AuthRequest, res) => {
  try {
    const { title, subtitle, imageUrl, linkType, linkValue, sortOrder } = req.body;
    if (!imageUrl) {
      res.status(400).json({ error: 'imageUrl is required' });
      return;
    }
    const inserted = await db.insert(banners).values({
      title,
      subtitle,
      imageUrl,
      linkType,
      linkValue,
      sortOrder,
    }).returning();
    await logAdminAction(req.user!.id, 'CREATE_BANNER', `Banner:${inserted[0].id}`, { title }, req);
    res.status(201).json(inserted[0]);
  } catch (error) {
    console.error('Admin create banner error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/banners/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete(banners).where(eq(banners.id, id)).returning();
    if (!deleted.length) {
      res.status(404).json({ error: 'Banner not found' });
      return;
    }
    await logAdminAction(req.user!.id, 'DELETE_BANNER', `Banner:${id}`, {}, req);
    res.json({ message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/notifications/broadcast — Push Notifications Broadcast
router.post('/notifications/broadcast', async (req: AuthRequest, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) {
      res.status(400).json({ error: 'title and body are required' });
      return;
    }

    const pusher = getPusher();
    if (pusher) {
      await pusher.trigger('global-notifications', 'broadcast', { title, body });
    }

    await logAdminAction(req.user!.id, 'BROADCAST_NOTIFICATION', 'Global', { title, body }, req);
    res.json({ success: true, message: 'Broadcast notification sent' });
  } catch (error) {
    console.error('Admin broadcast notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
