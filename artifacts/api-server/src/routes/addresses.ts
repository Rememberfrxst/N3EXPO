import { Router } from "express";
import { db } from "@workspace/db";
import { addresses } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/addresses — Get all user addresses
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const list = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, req.user.id));

    res.json(list);
  } catch (error) {
    console.error("Get addresses error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/addresses — Create new address
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const {
      label,
      line1,
      line2,
      city,
      state,
      pincode,
      isDefault = false,
    } = req.body;

    if (!line1 || !city || !state || !pincode) {
      res
        .status(400)
        .json({ error: "line1, city, state, and pincode are required" });
      return;
    }

    // If this is the first address, force it to be default
    const existing = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, req.user.id));
    const shouldBeDefault = existing.length === 0 || isDefault;

    // Reset default if this is default
    if (shouldBeDefault && existing.length > 0) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, req.user.id));
    }

    const inserted = await db
      .insert(addresses)
      .values({
        userId: req.user.id,
        label,
        line1,
        line2,
        city,
        state,
        pincode,
        isDefault: shouldBeDefault,
      })
      .returning();

    res.status(201).json(inserted[0]);
  } catch (error) {
    console.error("Create address error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/addresses/:id — Update address
router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = String(req.params.id);
    const { label, line1, line2, city, state, pincode, isDefault } = req.body;

    // Verify ownership
    const addr = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, req.user.id)))
      .limit(1);

    if (!addr.length) {
      res.status(404).json({ error: "Address not found" });
      return;
    }

    if (isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, req.user.id));
    }

    const updated = await db
      .update(addresses)
      .set({
        label: label !== undefined ? label : addr[0].label,
        line1: line1 !== undefined ? line1 : addr[0].line1,
        line2: line2 !== undefined ? line2 : addr[0].line2,
        city: city !== undefined ? city : addr[0].city,
        state: state !== undefined ? state : addr[0].state,
        pincode: pincode !== undefined ? pincode : addr[0].pincode,
        isDefault: isDefault !== undefined ? isDefault : addr[0].isDefault,
      })
      .where(eq(addresses.id, id))
      .returning();

    res.json(updated[0]);
  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/addresses/:id — Delete address
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = String(req.params.id);

    // Verify ownership
    const addr = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, req.user.id)))
      .limit(1);

    if (!addr.length) {
      res.status(404).json({ error: "Address not found" });
      return;
    }

    await db.delete(addresses).where(eq(addresses.id, id));

    // If we deleted the default address, make another one default
    if (addr[0].isDefault) {
      const remaining = await db
        .select()
        .from(addresses)
        .where(eq(addresses.userId, req.user.id))
        .limit(1);

      if (remaining.length > 0) {
        await db
          .update(addresses)
          .set({ isDefault: true })
          .where(eq(addresses.id, remaining[0].id));
      }
    }

    res.json({ message: "Address deleted" });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
