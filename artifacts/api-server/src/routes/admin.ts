import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  users,
  orders,
  orderItems,
  products,
  productImages,
  coupons,
  banners,
  categories,
  adminAuditLogs,
  storeSettings,
} from "@workspace/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import {
  requireAuth,
  requireRole,
  type AuthRequest,
  OWNER_EMAIL,
} from "../middlewares/auth";
import { DEFAULT_STOREFRONT } from "../lib/storefront";

const router = Router();
router.use(requireAuth, requireRole("admin"));
class InputError extends Error {}
const check = (ok: unknown, message: string) => {
  if (!ok) throw new InputError(message);
};
const text = (v: unknown, max = 255) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const number = (v: unknown, min = 0) =>
  v !== null && v !== "" && Number.isFinite(Number(v)) && Number(v) >= min;
const uuid = (v: unknown) =>
  typeof v === "string" &&
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(v);
const url = (v: unknown) => {
  try {
    return (
      typeof v === "string" && ["https:", "http:"].includes(new URL(v).protocol)
    );
  } catch {
    return false;
  }
};
const wrap =
  (fn: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (e) {
      next(e);
    }
  };
router.param("id", (req, res, next, id) => {
  if (!uuid(id)) {
    res.status(400).json({ error: "Invalid record ID" });
    return;
  }
  next();
});
async function audit(req: AuthRequest, action: string, target: string) {
  await db
    .insert(adminAuditLogs)
    .values({
      adminId: req.user!.id,
      action,
      targetEntity: target,
      ipAddress: req.ip,
    })
    .catch(() => {});
}
function productData(b: any, create: boolean) {
  const data: Record<string, any> = {};
  if (create || b.name !== undefined) {
    check(text(b.name), "Product name is required (max 255 characters)");
    data.name = b.name.trim();
  }
  if (create || b.price !== undefined) {
    check(number(b.price, 0.01), "Price must be positive");
    data.price = Number(b.price).toFixed(2);
  }
  if (b.compareAtPrice !== undefined) {
    check(
      b.compareAtPrice === null || number(b.compareAtPrice),
      "Invalid compare-at price",
    );
    data.compareAtPrice =
      b.compareAtPrice === null ? null : Number(b.compareAtPrice).toFixed(2);
  }
  if (b.stock !== undefined) {
    check(
      number(b.stock) && Number.isInteger(Number(b.stock)),
      "Stock must be a non-negative integer",
    );
    data.stock = Number(b.stock);
  }
  if (b.categoryId !== undefined) {
    check(b.categoryId === null || uuid(b.categoryId), "Invalid category");
    data.categoryId = b.categoryId;
  }
  for (const k of ["description", "brand", "sku"])
    if (b[k] !== undefined) {
      check(b[k] === null || typeof b[k] === "string", `Invalid ${k}`);
      data[k] = b[k] || null;
    }
  for (const k of ["isActive", "isFeatured"])
    if (b[k] !== undefined) {
      check(typeof b[k] === "boolean", `Invalid ${k}`);
      data[k] = b[k];
    }
  if (b.images !== undefined)
    check(
      Array.isArray(b.images) && b.images.length <= 12 && b.images.every(url),
      "Provide up to 12 valid image URLs",
    );
  if (b.tags !== undefined) {
    check(
      Array.isArray(b.tags) && b.tags.every((t: any) => text(t, 80)),
      "Invalid tags",
    );
    data.tags = b.tags;
  }
  if (b.specifications !== undefined) {
    check(
      b.specifications &&
        !Array.isArray(b.specifications) &&
        typeof b.specifications === "object" &&
        Object.values(b.specifications).every((v) => typeof v === "string"),
      "Specifications must be a text dictionary",
    );
    data.specifications = b.specifications;
  }
  return data;
}
router.get(
  "/dashboard",
  wrap(async (_req, res) => {
    const [u, o, r, low, recent, best] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(users),
      db.select({ count: sql`count(*)` }).from(orders),
      db
        .select({ total: sql`coalesce(sum(total),0)` })
        .from(orders)
        .where(eq(orders.paymentStatus, "paid")),
      db
        .select({ count: sql`count(*)` })
        .from(products)
        .where(sql`${products.stock} <= 5 AND ${products.isActive} = true`),
      db.select().from(orders).orderBy(desc(orders.createdAt)).limit(6),
      db.select().from(products).orderBy(desc(products.totalSold)).limit(5),
    ]);
    res.json({
      totalUsers: Number(u[0].count),
      totalOrders: Number(o[0].count),
      totalRevenue: Number(r[0].total),
      lowStockCount: Number(low[0].count),
      recentOrders: recent,
      bestSellers: best,
    });
  }),
);
router.get(
  "/audit-logs",
  wrap(async (_req, res) => {
    res.json(
      await db
        .select({
          id: adminAuditLogs.id,
          action: adminAuditLogs.action,
          targetEntity: adminAuditLogs.targetEntity,
          createdAt: adminAuditLogs.createdAt,
          adminName: users.name,
        })
        .from(adminAuditLogs)
        .leftJoin(users, eq(users.id, adminAuditLogs.adminId))
        .orderBy(desc(adminAuditLogs.createdAt))
        .limit(100),
    );
  }),
);
router.get(
  "/products",
  wrap(async (_req, res) => {
    const list = await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt));
    const images = list.length
      ? await db
          .select()
          .from(productImages)
          .where(
            inArray(
              productImages.productId,
              list.map((p) => p.id),
            ),
          )
          .orderBy(productImages.sortOrder)
      : [];
    res.json(
      list.map((p) => ({
        ...p,
        images: images.filter((i) => i.productId === p.id),
      })),
    );
  }),
);
router.post(
  "/products",
  wrap(async (req, res) => {
    const data = productData(req.body, true);
    const product = await db.transaction(async (tx) => {
      const [p] = await tx
        .insert(products)
        .values({
          ...data,
          name: data.name,
          price: data.price,
          slug: `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomUUID().slice(0, 8)}`,
        })
        .returning();
      if (req.body.images?.length)
        await tx.insert(productImages).values(
          req.body.images.map((url: string, i: number) => ({
            productId: p.id,
            url,
            isPrimary: i === 0,
            sortOrder: i,
          })),
        );
      return p;
    });
    await audit(req, "CREATE_PRODUCT", product.id);
    res.status(201).json(product);
  }),
);
router.patch(
  "/products/:id",
  wrap(async (req, res) => {
    const data = productData(req.body, false);
    const product = await db.transaction(async (tx) => {
      const [p] = await tx
        .update(products)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(products.id, String(req.params.id)))
        .returning();
      if (p && req.body.images !== undefined) {
        await tx.delete(productImages).where(eq(productImages.productId, p.id));
        if (req.body.images.length)
          await tx.insert(productImages).values(
            req.body.images.map((url: string, i: number) => ({
              productId: p.id,
              url,
              sortOrder: i,
              isPrimary: i === 0,
            })),
          );
      }
      return p;
    });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    await audit(req, "UPDATE_PRODUCT", product.id);
    res.json(product);
  }),
);
// Archive products to preserve historical order and cart references.
router.delete(
  "/products/:id",
  wrap(async (req, res) => {
    const [p] = await db
      .update(products)
      .set({ isActive: false })
      .where(eq(products.id, String(req.params.id)))
      .returning();
    if (!p) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    await audit(req, "ARCHIVE_PRODUCT", p.id);
    res.json({ success: true });
  }),
);
router.get(
  "/orders",
  wrap(async (_req, res) => {
    res.json(
      await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          paymentMethod: orders.paymentMethod,
          total: orders.total,
          createdAt: orders.createdAt,
          customerName: users.name,
          customerEmail: users.email,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .orderBy(desc(orders.createdAt)),
    );
  }),
);
router.get(
  "/orders/:id",
  wrap(async (req, res) => {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, String(req.params.id)));
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const items = await db
      .select({
        id: orderItems.id,
        name: products.name,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
      })
      .from(orderItems)
      .leftJoin(products, eq(products.id, orderItems.productId))
      .where(eq(orderItems.orderId, order.id));
    res.json({ ...order, items });
  }),
);
router.patch(
  "/orders/:id/status",
  wrap(async (req, res) => {
    const { status, paymentStatus } = req.body;
    check(
      status === undefined ||
        [
          "pending",
          "confirmed",
          "shipped",
          "delivered",
          "cancelled",
          "returned",
        ].includes(status),
      "Invalid order status",
    );
    check(
      paymentStatus === undefined ||
        ["pending", "paid", "refunded"].includes(paymentStatus),
      "Invalid payment status",
    );
    const [o] = await db
      .update(orders)
      .set({
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(status === "delivered" && { deliveredAt: new Date() }),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, String(req.params.id)))
      .returning();
    if (!o) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    await audit(req, "UPDATE_ORDER", o.id);
    res.json(o);
  }),
);
router.get(
  "/users",
  wrap(async (_req, res) => {
    res.json(
      await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          role: users.role,
          isVerified: users.isVerified,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt)),
    );
  }),
);
router.patch(
  "/users/:id",
  wrap(async (req, res) => {
    const { role, isVerified } = req.body;
    check(
      role === undefined || ["customer", "seller"].includes(role),
      "Only customer and seller roles can be assigned",
    );
    check(
      isVerified === undefined || typeof isVerified === "boolean",
      "Invalid verification status",
    );
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.id, String(req.params.id)));
    if (!u) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    check(
      u.email.toLowerCase() !== OWNER_EMAIL,
      "The owner account cannot be modified here",
    );
    await db
      .update(users)
      .set({
        ...(role && { role }),
        ...(isVerified !== undefined && { isVerified }),
      })
      .where(eq(users.id, u.id));
    await audit(req, "UPDATE_CUSTOMER", u.id);
    res.json({ success: true });
  }),
);
function contentData(kind: string, b: any, create: boolean) {
  const d: Record<string, any> = {};
  const fields =
    kind === "categories"
      ? ["name", "slug", "icon", "color", "imageUrl", "sortOrder", "isActive"]
      : kind === "coupons"
        ? [
            "code",
            "discountType",
            "discountValue",
            "minOrderValue",
            "maxDiscount",
            "usageLimit",
            "validFrom",
            "validUntil",
            "isActive",
          ]
        : [
            "title",
            "subtitle",
            "imageUrl",
            "linkType",
            "linkValue",
            "sortOrder",
            "isActive",
            "startsAt",
            "endsAt",
          ];
  for (const k of fields) if (b[k] !== undefined) d[k] = b[k];
  if (d.isActive !== undefined)
    check(typeof d.isActive === "boolean", "Invalid active status");
  if (d.sortOrder !== undefined)
    check(
      number(d.sortOrder) && Number.isInteger(Number(d.sortOrder)),
      "Display order must be a non-negative integer",
    );
  if (kind === "categories") {
    if (create || d.name !== undefined)
      check(text(d.name, 100), "Category name is required");
    if (create || d.slug !== undefined)
      check(
        text(d.slug, 100) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug),
        "Use a lowercase category slug",
      );
    if (d.color)
      check(/^#[\da-f]{6}$/i.test(d.color), "Use a six-digit hex color");
    if (d.imageUrl) check(url(d.imageUrl), "Invalid image URL");
  } else if (kind === "coupons") {
    if (create || d.code !== undefined) {
      check(
        text(d.code, 50) && /^[a-z0-9_-]+$/i.test(d.code),
        "Invalid coupon code",
      );
      d.code = d.code.toUpperCase();
    }
    if (create || d.discountType !== undefined)
      check(
        ["percentage", "fixed"].includes(d.discountType),
        "Invalid discount type",
      );
    if (create || d.discountValue !== undefined) {
      check(number(d.discountValue, 0.01), "Discount must be positive");
      d.discountValue = String(d.discountValue);
    }
    if (d.discountType === "percentage")
      check(Number(d.discountValue) <= 100, "Percentage cannot exceed 100");
    for (const k of ["minOrderValue", "maxDiscount", "usageLimit"])
      if (d[k] !== undefined && d[k] !== null) {
        check(number(d[k]), `Invalid ${k}`);
        if (k === "usageLimit")
          check(
            Number.isInteger(Number(d[k])) && Number(d[k]) > 0,
            "Usage limit must be a positive integer",
          );
      }
  } else {
    if (create || d.imageUrl !== undefined)
      check(url(d.imageUrl), "A valid banner image URL is required");
    if (d.title !== undefined)
      check(
        typeof d.title === "string" && d.title.length <= 255,
        "Invalid title",
      );
    check(
      !d.linkType || ["category", "product", "url"].includes(d.linkType),
      "Invalid banner destination",
    );
    if (d.linkType) {
      check(text(d.linkValue, 2000), "Banner destination is required");
      if (d.linkType === "url")
        check(url(d.linkValue), "Use an HTTP or HTTPS destination");
      if (d.linkType === "product")
        check(uuid(d.linkValue), "Use a product ID");
    }
  }
  for (const k of ["validFrom", "validUntil", "startsAt", "endsAt"])
    if (d[k] !== undefined) {
      check(
        d[k] === null || Number.isFinite(Date.parse(d[k])),
        "Invalid schedule date",
      );
      d[k] = d[k] ? new Date(d[k]) : null;
    }
  const start = d.validFrom || d.startsAt,
    end = d.validUntil || d.endsAt;
  if (start && end) check(start < end, "End date must be after start date");
  return d;
}
for (const [kind, table] of [
  ["categories", categories],
  ["coupons", coupons],
  ["banners", banners],
] as const) {
  router.get(
    `/${kind}`,
    wrap(async (_req, res) => {
      res.json(await db.select().from(table));
    }),
  );
  router.post(
    `/${kind}`,
    wrap(async (req, res) => {
      const data = contentData(kind, req.body, true);
      const created: any = await db
        .insert(table as any)
        .values(data)
        .returning();
      const row = created[0];
      await audit(req, `CREATE_${kind.toUpperCase()}`, row.id);
      res.status(201).json(row);
    }),
  );
  router.patch(
    `/${kind}/:id`,
    wrap(async (req, res) => {
      const existingRows: any = await db
        .select()
        .from(table as any)
        .where(eq(table.id, String(req.params.id)));
      const existing = existingRows[0];
      if (!existing) {
        res.status(404).json({ error: "Record not found" });
        return;
      }
      // Validate the merged record so partial updates cannot create invalid ranges.
      const data = contentData(kind, { ...existing, ...req.body }, true);
      const [row] = await db
        .update(table as any)
        .set(data)
        .where(eq(table.id, String(req.params.id)))
        .returning();
      await audit(req, `UPDATE_${kind.toUpperCase()}`, String(req.params.id));
      res.json(row);
    }),
  );
  router.delete(
    `/${kind}/:id`,
    wrap(async (req, res) => {
      // Archive content so product, order and coupon references remain valid.
      const [row] = await db
        .update(table as any)
        .set({ isActive: false })
        .where(eq(table.id, String(req.params.id)))
        .returning();
      if (!row) {
        res.status(404).json({ error: "Record not found" });
        return;
      }
      await audit(req, `ARCHIVE_${kind.toUpperCase()}`, String(req.params.id));
      res.json({ success: true });
    }),
  );
}
router.get(
  "/settings",
  wrap(async (_req, res) => {
    const [row] = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.id, "storefront"));
    res.json({ ...DEFAULT_STOREFRONT, ...((row?.data as object) || {}) });
  }),
);
router.put(
  "/settings",
  wrap(async (req, res) => {
    const b = req.body;
    check(
      text(b.storeName, 80) && text(b.announcement, 200),
      "Store name and announcement are required",
    );
    check(
      number(b.deliveryFee) && number(b.freeShippingThreshold),
      "Invalid shipping settings",
    );
    check(
      typeof b.supportEmail === "string" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.supportEmail),
      "Invalid support email",
    );
    check(!b.downloadUrl || url(b.downloadUrl), "Invalid download URL");
    const data = {
      storeName: b.storeName,
      announcement: b.announcement,
      supportEmail: b.supportEmail,
      deliveryFee: Number(b.deliveryFee),
      freeShippingThreshold: Number(b.freeShippingThreshold),
      downloadUrl: b.downloadUrl || "",
    };
    await db
      .insert(storeSettings)
      .values({ id: "storefront", data })
      .onConflictDoUpdate({
        target: storeSettings.id,
        set: { data, updatedAt: new Date() },
      });
    await audit(req, "UPDATE_STOREFRONT", "storefront");
    res.json(data);
  }),
);
router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof InputError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err.code === "23505" || err.cause?.code === "23505") {
    res.status(409).json({ error: "This code, SKU or slug already exists" });
    return;
  }
  console.error("Admin request failed", err.message);
  res.status(500).json({ error: "Unable to save changes. Please try again." });
});
export default router;
