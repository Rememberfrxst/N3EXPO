import { shippingSettings, couponDiscount } from "../lib/pricing";
import { Router } from "express";
import { db } from "@workspace/db";
import {
  orders,
  orderItems,
  cartItems,
  carts,
  products,
  productVariants,
  addresses,
  coupons,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// GET /api/orders — List user's orders
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const list = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, req.user.id))
      .orderBy(desc(orders.createdAt));

    res.json(list);
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/orders/:id — Get order details
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = String(req.params.id);

    const ordRows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, req.user.id)))
      .limit(1);

    if (!ordRows.length) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = ordRows[0];

    const items = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        variantId: orderItems.variantId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
        product: {
          name: products.name,
          slug: products.slug,
        },
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));

    res.json({ ...order, items });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Checkout prices, inventory and coupon use are committed atomically.
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { addressId, paymentMethod = "cod", couponCode } = req.body;
    if (!["cod", "razorpay", "upi"].includes(paymentMethod)) {
      res.status(400).json({ error: "Invalid payment method" });
      return;
    }
    const [address] = await db
      .select()
      .from(addresses)
      .where(
        and(eq(addresses.id, addressId), eq(addresses.userId, req.user!.id)),
      );
    if (!address) {
      res.status(400).json({ error: "Choose a valid delivery address" });
      return;
    }
    const settings = await shippingSettings();
    const result = await db.transaction(async (tx) => {
      const [cart] = await tx
        .select()
        .from(carts)
        .where(eq(carts.userId, req.user!.id))
        .for("update");
      if (!cart) throw new Error("Your bag is empty");
      const items = await tx
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, cart.id));
      if (!items.length) throw new Error("Your bag is empty");
      const priced = [];
      // A stable lock order prevents two carts with overlapping products deadlocking.
      items.sort((a, b) => a.productId.localeCompare(b.productId));
      let subtotal = 0;
      for (const item of items) {
        const [p] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .for("update");
        if (
          !p?.isActive ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1
        )
          throw new Error("A product is no longer available");
        let price = Number(p.price);
        if (item.variantId) {
          const [v] = await tx
            .select()
            .from(productVariants)
            .where(
              and(
                eq(productVariants.id, item.variantId),
                eq(productVariants.productId, p.id),
              ),
            )
            .for("update");
          if (!v || (v.stock || 0) < item.quantity)
            throw new Error("Insufficient option stock");
          price += Number(v.priceModifier || 0);
          await tx
            .update(productVariants)
            .set({ stock: (v.stock || 0) - item.quantity })
            .where(eq(productVariants.id, v.id));
        } else {
          if ((p.stock || 0) < item.quantity)
            throw new Error("Insufficient product stock");
          await tx
            .update(products)
            .set({ stock: (p.stock || 0) - item.quantity })
            .where(eq(products.id, p.id));
        }
        await tx
          .update(products)
          .set({ totalSold: (p.totalSold || 0) + item.quantity })
          .where(eq(products.id, p.id));
        subtotal += price * item.quantity;
        priced.push({ ...item, unitPrice: price });
      }
      let discount = 0,
        couponId: null | string = null;
      if (couponCode) {
        const [c] = await tx
          .select()
          .from(coupons)
          .where(eq(coupons.code, String(couponCode).trim().toUpperCase()))
          .for("update");
        if (!c) throw new Error("Coupon is unavailable");
        discount = couponDiscount(c, subtotal);
        couponId = c.id;
        await tx
          .update(coupons)
          .set({ usedCount: (c.usedCount || 0) + 1 })
          .where(eq(coupons.id, c.id));
      }
      const shippingFee =
        subtotal >= settings.freeShippingThreshold ? 0 : settings.deliveryFee;
      const [order] = await tx
        .insert(orders)
        .values({
          userId: req.user!.id,
          orderNumber: `GR-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 4)}`,
          subtotal: subtotal.toFixed(2),
          shippingFee: String(shippingFee),
          discount: String(discount),
          couponId,
          total: (subtotal + shippingFee - discount).toFixed(2),
          paymentMethod,
          paymentStatus: "pending",
          shippingAddressId: address.id,
          status: "pending",
        })
        .returning();
      await tx.insert(orderItems).values(
        priced.map((i) => ({
          orderId: order.id,
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: i.unitPrice.toFixed(2),
          totalPrice: (i.unitPrice * i.quantity).toFixed(2),
        })),
      );
      await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
      return order;
    });
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Could not place order" });
  }
});
export default router;
