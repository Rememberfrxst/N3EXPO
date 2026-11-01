import { Router } from "express";
import { db } from "@workspace/db";
import { storeSettings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
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
export default router;
