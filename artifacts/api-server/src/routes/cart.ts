import { couponDiscount } from "../lib/pricing";
import { Router } from "express";
import { db } from "@workspace/db";
import {
  carts,
  cartItems,
  products,
  productImages,
  productVariants,
  coupons,
} from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

// Helper to get or create cart for user
async function getOrCreateCart(userId: string) {
  const existing = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    return existing[0];
  }
  const newCarts = await db.insert(carts).values({ userId }).returning();
  return newCarts[0];
}

// GET /api/cart — Get user's cart and its items
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const cart = await getOrCreateCart(req.user.id);

    const items = await db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        variantId: cartItems.variantId,
        quantity: cartItems.quantity,
        addedAt: cartItems.addedAt,
        product: {
          id: products.id,
          name: products.name,
          slug: products.slug,
          price: products.price,
          brand: products.brand,
          stock: products.stock,
        },
        variant: {
          id: productVariants.id,
          name: productVariants.name,
          value: productVariants.value,
          priceModifier: productVariants.priceModifier,
          stock: productVariants.stock,
        },
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
      .where(eq(cartItems.cartId, cart.id))
      .orderBy(asc(cartItems.addedAt));

    // Fetch primary images for items
    const productIds = items.map((i) => i.productId);
    let images: { productId: string; url: string }[] = [];
    if (productIds.length > 0) {
      // Find primary images
      images = await db
        .select({ productId: productImages.productId, url: productImages.url })
        .from(productImages)
        .where(
          and(
            eq(productImages.isPrimary, true),
            // check if in array (using raw SQL because inArray is easier but this is simple enough)
            // Actually, drizzle has inArray helper: inArray(productImages.productId, productIds)
          ),
        );
    }

    const imageMap = new Map(images.map((img) => [img.productId, img.url]));
    const result = items.map((i) => ({
      ...i,
      product: {
        ...i.product,
        imageUrl: imageMap.get(i.productId) || null,
      },
    }));

    res.json({ cartId: cart.id, items: result });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/cart — Add item to cart
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { productId, variantId, quantity = 1 } = req.body;

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      res
        .status(400)
        .json({ error: "Quantity must be a positive integer up to 999" });
      return;
    }
    if (!productId) {
      res.status(400).json({ error: "productId is required" });
      return;
    }

    // Verify product exists and check stock
    const prodRows = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!prodRows.length || !prodRows[0].isActive) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const product = prodRows[0];

    // Check variant if provided
    if (variantId) {
      const varRows = await db
        .select()
        .from(productVariants)
        .where(
          and(
            eq(productVariants.id, variantId),
            eq(productVariants.productId, productId),
          ),
        )
        .limit(1);
      if (!varRows.length) {
        res.status(404).json({ error: "Product variant not found" });
        return;
      }
      if ((varRows[0].stock ?? 0) < quantity) {
        res.status(400).json({ error: "Insufficient variant stock" });
        return;
      }
    } else {
      if ((product.stock || 0) < quantity) {
        res.status(400).json({ error: "Insufficient stock" });
        return;
      }
    }

    const cart = await getOrCreateCart(req.user.id);

    // Check if item already in cart (compare in-memory after fetch)
    const existingItems = await db
      .select()
      .from(cartItems)
      .where(
        and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)),
      );

    // Better way to check exact matching logic:
    const matched = existingItems.find(
      (item) => item.variantId === (variantId || null),
    );

    const available = variantId
      ? (
          await db
            .select()
            .from(productVariants)
            .where(eq(productVariants.id, variantId))
        )[0]?.stock
      : product.stock;
    if ((matched?.quantity || 0) + quantity > (available || 0)) {
      res.status(400).json({ error: "Insufficient stock" });
      return;
    }
    if (matched) {
      const updated = await db
        .update(cartItems)
        .set({ quantity: matched.quantity + quantity })
        .where(eq(cartItems.id, matched.id))
        .returning();
      res.json(updated[0]);
    } else {
      const inserted = await db
        .insert(cartItems)
        .values({
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          quantity,
        })
        .returning();
      res.status(201).json(inserted[0]);
    }
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/cart/:itemId — Update quantity
router.patch("/:itemId", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const itemId = String(req.params.itemId);
    const { quantity } = req.body;

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      res.status(400).json({ error: "Quantity must be at least 1" });
      return;
    }

    const cart = await getOrCreateCart(req.user.id);

    // Verify item belongs to user's cart
    const itemRows = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .limit(1);

    if (!itemRows.length) {
      res.status(404).json({ error: "Cart item not found" });
      return;
    }

    const item = itemRows[0];
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId));
    let available = product?.isActive ? product.stock || 0 : 0;
    if (item.variantId) {
      const [v] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, item.variantId));
      available = product?.isActive ? v?.stock || 0 : 0;
    }
    if (quantity > available) {
      res.status(400).json({ error: "Insufficient stock" });
      return;
    }
    const updated = await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, itemId))
      .returning();

    res.json(updated[0]);
  } catch (error) {
    console.error("Update cart item error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/cart/:itemId — Remove item
router.delete("/:itemId", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const itemId = String(req.params.itemId);
    const cart = await getOrCreateCart(req.user.id);

    const deleted = await db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .returning();

    if (!deleted.length) {
      res.status(404).json({ error: "Cart item not found" });
      return;
    }

    res.json({ message: "Item removed from cart" });
  } catch (error) {
    console.error("Delete cart item error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/cart — Clear entire cart
router.delete("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const cart = await getOrCreateCart(req.user.id);

    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));

    res.json({ message: "Cart cleared" });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/apply-coupon", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (typeof req.body.code !== "string") {
      res.status(400).json({ error: "Coupon code is required" });
      return;
    }
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, req.body.code.trim().toUpperCase()));
    if (!coupon) {
      res.status(400).json({ error: "Coupon not found" });
      return;
    }
    const cart = await getOrCreateCart(req.user!.id);
    const items = await db
      .select({
        quantity: cartItems.quantity,
        price: products.price,
        modifier: productVariants.priceModifier,
      })
      .from(cartItems)
      .innerJoin(products, eq(products.id, cartItems.productId))
      .leftJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .where(eq(cartItems.cartId, cart.id));
    const subtotal = items.reduce(
      (sum, i) =>
        sum + (Number(i.price) + Number(i.modifier || 0)) * i.quantity,
      0,
    );
    res.json({
      code: coupon.code,
      discount: couponDiscount(coupon, subtotal),
      discountType: coupon.discountType,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
export default router;
