import { Router } from "express";
import { db } from "@workspace/db";
import { storeSettings, coupons } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { DEFAULT_STOREFRONT } from "../lib/storefront";
const router = Router();
router.get("/", async (_req, res) => {
  try {
    const [row] = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.id, "storefront"));
    res.json({ ...DEFAULT_STOREFRONT, ...((row?.data as object) || {}) });
  } catch {
    res.status(500).json({ error: "Unable to load store settings" });
  }
});
router.get("/offers", async (_req, res) => {
  try {
    const offers = await db
      .select({
        id: coupons.id,
        code: coupons.code,
        discountType: coupons.discountType,
        discountValue: coupons.discountValue,
        minOrderValue: coupons.minOrderValue,
        maxDiscount: coupons.maxDiscount,
        validUntil: coupons.validUntil,
      })
      .from(coupons)
      .where(
        and(
          eq(coupons.isActive, true),
          sql`(${coupons.validFrom} IS NULL OR ${coupons.validFrom} <= NOW())`,
          sql`(${coupons.validUntil} IS NULL OR ${coupons.validUntil} >= NOW())`,
          sql`(${coupons.usageLimit} IS NULL OR ${coupons.usedCount} < ${coupons.usageLimit})`,
        ),
      );
    res.json(offers);
  } catch {
    res.status(500).json({ error: "Unable to load store offers" });
  }
});
export default router;
