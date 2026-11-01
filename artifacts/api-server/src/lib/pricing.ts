import { db } from "@workspace/db";
import { storeSettings, coupons } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_STOREFRONT } from "./storefront";
export async function shippingSettings() {
  const [row] = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.id, "storefront"));
  return {
    ...DEFAULT_STOREFRONT,
    ...((row?.data as Partial<typeof DEFAULT_STOREFRONT>) || {}),
  };
}
export function couponDiscount(
  c: typeof coupons.$inferSelect,
  subtotal: number,
  now = new Date(),
) {
  if (
    !c.isActive ||
    (c.validFrom && c.validFrom > now) ||
    (c.validUntil && c.validUntil < now) ||
    (c.usageLimit !== null && (c.usedCount || 0) >= c.usageLimit)
  )
    throw new Error("Coupon is expired or unavailable");
  if (subtotal < Number(c.minOrderValue || 0))
    throw new Error(`Minimum order is ₹${c.minOrderValue}`);
  let discount =
    c.discountType === "percentage"
      ? (subtotal * Number(c.discountValue)) / 100
      : Number(c.discountValue);
  if (c.maxDiscount !== null)
    discount = Math.min(discount, Number(c.maxDiscount));
  return Math.round(Math.max(0, Math.min(subtotal, discount)) * 100) / 100;
}
