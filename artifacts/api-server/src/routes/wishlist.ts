import { Router } from "express";
import { db } from "@workspace/db";
import { wishlists, products, productImages } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/wishlist — list products in wishlist
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const items = await db
      .select({
        id: wishlists.id,
        productId: wishlists.productId,
        createdAt: wishlists.createdAt,
        product: {
          id: products.id,
          name: products.name,
          slug: products.slug,
          price: products.price,
          brand: products.brand,
          stock: products.stock,
        },
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .where(eq(wishlists.userId, req.user.id));

    // Fetch primary images for items
    const productIds = items.map((i) => i.productId);
    let images: { productId: string; url: string }[] = [];
    if (productIds.length > 0) {
      images = await db
        .select({ productId: productImages.productId, url: productImages.url })
        .from(productImages)
        .where(and(eq(productImages.isPrimary, true)));
    }

    const imageMap = new Map(images.map((img) => [img.productId, img.url]));
    const result = items.map((i) => ({
      ...i,
      product: {
        ...i.product,
        imageUrl: imageMap.get(i.productId) || null,
      },
    }));

    res.json(result);
  } catch (error) {
    console.error("Get wishlist error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/wishlist — add to wishlist
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { productId } = req.body;

    if (!productId) {
      res.status(400).json({ error: "productId is required" });
      return;
    }

    // Verify product exists
    const prodRows = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!prodRows.length) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    // Insert (will ignore or handle unique constraint)
    const existing = await db
      .select()
      .from(wishlists)
      .where(
        and(
          eq(wishlists.userId, req.user.id),
          eq(wishlists.productId, productId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      res.json(existing[0]);
      return;
    }

    const inserted = await db
      .insert(wishlists)
      .values({
        userId: req.user.id,
        productId,
      })
      .returning();

    res.status(201).json(inserted[0]);
  } catch (error) {
    console.error("Add to wishlist error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/wishlist/:productId — remove from wishlist
router.delete("/:productId", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const productId = String(req.params.productId);

    const deleted = await db
      .delete(wishlists)
      .where(
        and(
          eq(wishlists.userId, req.user.id),
          eq(wishlists.productId, productId),
        ),
      )
      .returning();

    if (!deleted.length) {
      res.status(404).json({ error: "Item not found in wishlist" });
      return;
    }

    res.json({ message: "Removed from wishlist" });
  } catch (error) {
    console.error("Delete from wishlist error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
