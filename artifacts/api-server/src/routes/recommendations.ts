import { Router } from "express";
import { db } from "@workspace/db";
import {
  userActivity,
  products,
  productImages,
  wishlists,
  orders,
  orderItems,
  categories,
} from "@workspace/db/schema";
import { eq, and, desc, sql, inArray, ne } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

// Helper to attach primary images
async function attachPrimaryImages(rows: any[]) {
  const productIds = rows.map((p) => p.id);
  let images: { productId: string; url: string }[] = [];
  if (productIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    images = await db
      .select({ productId: productImages.productId, url: productImages.url })
      .from(productImages)
      .where(
        and(
          eq(productImages.isPrimary, true),
          inArray(productImages.productId, productIds),
        ),
      );
  }
  const imageMap = new Map(images.map((i) => [i.productId, i.url]));
  return rows.map((p) => ({ ...p, imageUrl: imageMap.get(p.id) || null }));
}

// 1. POST /api/recommendations/track
router.post("/track", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { productId, action, searchQuery, metadata } = req.body;

    if (!action) {
      res.status(400).json({ error: "Action is required" });
      return;
    }

    await db.insert(userActivity).values({
      userId: req.user!.id,
      productId: productId || null,
      action,
      searchQuery: searchQuery || null,
      metadata: metadata || null,
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Error tracking activity:", error);
    res.status(500).json({ error: "Failed to track activity" });
  }
});

// 2. GET /api/recommendations/for-you
router.get("/for-you", requireAuth, async (req: AuthRequest, res) => {
  try {
    // 1. Get user's recent activity (last 50 actions)
    const recentActivity = await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.userId, req.user!.id))
      .orderBy(desc(userActivity.createdAt))
      .limit(50);

    // 2. Find categories the user has interacted with most
    const categoryScores = new Map<string, number>();
    const interactedProductIds = new Set<string>();

    const activityProductIds = recentActivity
      .filter((a) => a.productId)
      .map((a) => a.productId as string);

    let activityProducts: { id: string; categoryId: string | null }[] = [];
    if (activityProductIds.length > 0) {
      activityProducts = await db
        .select({ id: products.id, categoryId: products.categoryId })
        .from(products)
        .where(inArray(products.id, activityProductIds));
    }

    const productCategoryMap = new Map(
      activityProducts.map((p) => [p.id, p.categoryId]),
    );

    for (const action of recentActivity) {
      if (!action.productId) continue;

      const categoryId = productCategoryMap.get(action.productId);
      if (!categoryId) continue;

      // 4. Weight by: purchase=5, cart=4, wishlist=3, view=1
      let weight = 0;
      switch (action.action) {
        case "purchase":
          weight = 5;
          break;
        case "cart":
          weight = 4;
          break;
        case "wishlist":
          weight = 3;
          break;
        case "view":
          weight = 1;
          break;
        default:
          weight = 1;
      }

      categoryScores.set(
        categoryId,
        (categoryScores.get(categoryId) || 0) + weight,
      );

      if (["purchase", "view"].includes(action.action!)) {
        interactedProductIds.add(action.productId);
      }
    }

    let recommendedProducts: (typeof products.$inferSelect)[] = [];

    if (categoryScores.size > 0) {
      // Sort categories by score
      const topCategories = Array.from(categoryScores.entries())
        .sort((a, b) => b[1] - a[1])
        .map((entry) => entry[0])
        .slice(0, 3); // top 3 categories

      // 3. Find products in those categories that the user HASN'T purchased/viewed recently
      const candidates = await db
        .select()
        .from(products)
        .where(inArray(products.categoryId, topCategories))
        .limit(100);

      recommendedProducts = candidates
        .filter((p) => !interactedProductIds.has(p.id))
        .slice(0, 20);
    }

    // Fallback if no recommendations found
    if (recommendedProducts.length === 0) {
      recommendedProducts = await db
        .select()
        .from(products)
        .orderBy(desc(products.totalSold))
        .limit(20);
    }

    // 5. Return up to 20 products with their primary image attached
    const result = await attachPrimaryImages(recommendedProducts.slice(0, 20));

    res.json(result);
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

// 3. GET /api/recommendations/similar/:productId
router.get("/similar/:productId", async (req, res) => {
  try {
    const productId = String(req.params.productId);

    // 1. Get the product's category
    const [product] = await db
      .select({ categoryId: products.categoryId })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    // 2. Find other products in the same category (exclude the current product)
    // 3. Sort by avgRating desc, totalSold desc
    const similarProducts = await db
      .select()
      .from(products)
      .where(
        and(
          eq(
            products.categoryId,
            product.categoryId || "00000000-0000-0000-0000-000000000000",
          ),
          ne(products.id, productId),
        ),
      )
      .orderBy(desc(products.avgRating), desc(products.totalSold))
      .limit(10);

    // 4. Return up to 10 products with primary image
    const result = await attachPrimaryImages(similarProducts);

    res.json(result);
  } catch (error) {
    console.error("Error fetching similar products:", error);
    res.status(500).json({ error: "Failed to fetch similar products" });
  }
});

// 4. GET /api/recommendations/trending
router.get("/trending", async (req, res) => {
  try {
    // 1. Count user_activity entries from the last 7 days, grouped by productId
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trendingActivities = await db
      .select({
        productId: userActivity.productId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(userActivity)
      .where(
        and(
          sql`${userActivity.productId} IS NOT NULL`,
          sql`${userActivity.createdAt} > ${sevenDaysAgo.toISOString()}`,
        ),
      )
      .groupBy(userActivity.productId)
      .orderBy(desc(sql`count`))
      .limit(20);

    let trendingProducts = [];

    if (trendingActivities.length > 0) {
      const trendingProductIds = trendingActivities.map(
        (a) => a.productId as string,
      );

      const productsData = await db
        .select()
        .from(products)
        .where(inArray(products.id, trendingProductIds));

      // Re-sort according to the trending order
      const productMap = new Map(productsData.map((p) => [p.id, p]));
      trendingProducts = trendingProductIds
        .map((id) => productMap.get(id))
        .filter(Boolean);
    } else {
      // 4. Fallback to products sorted by totalSold if no recent activity
      trendingProducts = await db
        .select()
        .from(products)
        .orderBy(desc(products.totalSold))
        .limit(20);
    }

    // 3. Return top 20 products with primary image
    const result = await attachPrimaryImages(trendingProducts);

    res.json(result);
  } catch (error) {
    console.error("Error fetching trending products:", error);
    res.status(500).json({ error: "Failed to fetch trending products" });
  }
});

// 5. GET /api/recommendations/recently-viewed
router.get("/recently-viewed", requireAuth, async (req: AuthRequest, res) => {
  try {
    // 1. Get user's 'view' actions from userActivity, ordered by createdAt desc
    const viewActivities = await db
      .select({ productId: userActivity.productId })
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, req.user!.id),
          eq(userActivity.action, "view"),
          sql`${userActivity.productId} IS NOT NULL`,
        ),
      )
      .orderBy(desc(userActivity.createdAt))
      .limit(100); // get more to allow for distinct

    // 2. Get distinct productIds (up to 20)
    const distinctProductIds = Array.from(
      new Set(viewActivities.map((a) => a.productId as string)),
    ).slice(0, 20);

    if (distinctProductIds.length === 0) {
      res.json([]);
      return;
    }

    const recentlyViewedProducts = await db
      .select()
      .from(products)
      .where(inArray(products.id, distinctProductIds));

    // Re-sort according to the view order
    const productMap = new Map(recentlyViewedProducts.map((p) => [p.id, p]));
    const sortedProducts = distinctProductIds
      .map((id) => productMap.get(id))
      .filter(Boolean);

    // 3. Return those products with primary image
    const result = await attachPrimaryImages(sortedProducts);

    res.json(result);
  } catch (error) {
    console.error("Error fetching recently viewed products:", error);
    res.status(500).json({ error: "Failed to fetch recently viewed products" });
  }
});

export default router;
