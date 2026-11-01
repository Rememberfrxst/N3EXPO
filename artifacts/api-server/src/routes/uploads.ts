import { Router } from "express";
import { db } from "@workspace/db";
import { productImages, users } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";

// ─── S3 Client (only initialise when env vars are present) ──────────────────
const BUCKET = process.env.AWS_S3_BUCKET || "";
const REGION = process.env.AWS_REGION || "ap-south-1";
const CDN_BASE = process.env.CDN_BASE_URL || ""; // optional CloudFront URL

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// ─── Security constants ──────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 5 MB

/** Max number of pre-signed URLs a user can request per call */
const MAX_BATCH = 5;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random S3 key so that file names cannot be
 * guessed and path-traversal attacks are impossible.
 */
function generateS3Key(folder: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const uuid = crypto.randomUUID();
  return `${folder}/${uuid}${ext}`;
}

/**
 * Build the public URL for an uploaded object.
 * CloudFront is preferred when CDN_BASE_URL is set; otherwise, fall back to
 * the S3 HTTPS endpoint.
 */
function buildPublicUrl(key: string): string {
  if (CDN_BASE) return `${CDN_BASE.replace(/\/$/, "")}/${key}`;
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

/**
 * Validate that env-vars required for S3 are present.
 * Returns an error string or null.
 */
function checkS3Config(): string | null {
  if (!BUCKET) return "AWS_S3_BUCKET is not set";
  if (!process.env.AWS_ACCESS_KEY_ID) return "AWS_ACCESS_KEY_ID is not set";
  if (!process.env.AWS_SECRET_ACCESS_KEY)
    return "AWS_SECRET_ACCESS_KEY is not set";
  return null;
}

// ─── Router ──────────────────────────────────────────────────────────────────
const router = Router();

// ────────────────────────────────────────────────────────────────────────────
// POST /api/uploads/presign
// Returns pre-signed PUT URLs so the mobile/browser client can upload directly
// to S3 — the server never receives the raw binary data.
//
// Body:
//   files: Array<{ fileName: string; contentType: string; size: number }>
//   folder?: 'products' | 'avatars' | 'banners'   (default: 'products')
//
// Response:
//   uploads: Array<{ presignedUrl: string; key: string; publicUrl: string }>
// ────────────────────────────────────────────────────────────────────────────
router.post("/presign", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const cfgErr = checkS3Config();
    if (cfgErr) {
      res.status(503).json({ error: `Storage not configured: ${cfgErr}` });
      return;
    }

    const { files, folder = "products" } = req.body as {
      files: { fileName: string; contentType: string; size: number }[];
      folder?: string;
    };

    // ── Input validation ──────────────────────────────────────────────────
    if (!Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: "`files` array is required" });
      return;
    }

    if (files.length > MAX_BATCH) {
      res.status(400).json({ error: `Maximum ${MAX_BATCH} files per request` });
      return;
    }

    // Whitelist allowed folder names to prevent key injection
    const allowedFolders = new Set(["products", "avatars", "banners"]);
    const safeFolder = allowedFolders.has(folder) ? folder : "products";

    const uploads: { presignedUrl: string; key: string; publicUrl: string }[] =
      [];

    for (const file of files) {
      const { fileName, contentType, size } = file;

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.has(contentType)) {
        res.status(400).json({
          error: `Unsupported file type: ${contentType}. Allowed: jpeg, png, webp, gif`,
        });
        return;
      }

      // Validate extension (double-check — don't trust only MIME)
      const ext = path.extname(fileName).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        res.status(400).json({ error: `Unsupported extension: ${ext}` });
        return;
      }

      // Validate size (client-reported; S3 policy enforced on upload)
      if (!size || size <= 0 || size > MAX_FILE_SIZE_BYTES) {
        res.status(400).json({
          error: `File size must be between 1 B and ${MAX_FILE_SIZE_MB} MB`,
        });
        return;
      }

      const key = generateS3Key(safeFolder, fileName);

      // Conditions array enforces the constraints on the S3 side as well
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
        ContentLength: size,
        // Prevent ACL escalation — bucket should have block-public-access OFF
        // and objects exposed via CloudFront/signed URLs only
        Metadata: {
          uploadedBy: req.user.id,
          originalName: Buffer.from(fileName).toString("base64"), // sanitised
        },
      });

      // URL expires in 5 minutes — short window for security
      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

      uploads.push({
        presignedUrl,
        key,
        publicUrl: buildPublicUrl(key),
      });
    }

    res.json({ uploads });
  } catch (error) {
    console.error("Pre-sign error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/uploads/confirm-product-image
// After the client finishes the PUT to S3, call this to record the image URL
// in the product_images table.
//
// Body: { productId, key, altText?, isPrimary? }
// ────────────────────────────────────────────────────────────────────────────
router.post(
  "/confirm-product-image",
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const cfgErr = checkS3Config();
      if (cfgErr) {
        res.status(503).json({ error: `Storage not configured: ${cfgErr}` });
        return;
      }

      const {
        productId,
        key,
        altText,
        isPrimary = false,
      } = req.body as {
        productId: string;
        key: string;
        altText?: string;
        isPrimary?: boolean;
      };

      if (!productId || !key) {
        res.status(400).json({ error: "productId and key are required" });
        return;
      }

      // ── Validate that the key belongs to the products folder ─────────────
      if (
        !key.startsWith("products/") ||
        key.includes("..") ||
        key.includes("//")
      ) {
        res.status(400).json({ error: "Invalid key" });
        return;
      }

      // ── Verify the object actually exists in S3 (prevents phantom URLs) ──
      try {
        await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
      } catch {
        res
          .status(400)
          .json({ error: "File not found in storage. Upload it first." });
        return;
      }

      const publicUrl = buildPublicUrl(key);

      // Count existing images to determine sort order
      const existing = await db
        .select({ id: productImages.id })
        .from(productImages)
        .where(eq(productImages.productId, productId));

      const inserted = await db
        .insert(productImages)
        .values({
          productId,
          url: publicUrl,
          altText: altText || null,
          sortOrder: existing.length + 1,
          isPrimary: isPrimary || existing.length === 0, // first image is primary by default
        })
        .returning();

      res.status(201).json(inserted[0]);
    } catch (error) {
      console.error("Confirm product image error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/uploads/product-image/:id
// Removes image from both S3 and the product_images table.
// Only admin or the selling owner may delete.
// ────────────────────────────────────────────────────────────────────────────
router.delete(
  "/product-image/:id",
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const id = String(req.params.id);

      const rows = await db
        .select()
        .from(productImages)
        .where(eq(productImages.id, id))
        .limit(1);

      if (!rows.length) {
        res.status(404).json({ error: "Image not found" });
        return;
      }

      const image = rows[0];

      // ── Authorisation: admin or image owner (via sellerId lookup) ─────────
      if (req.user.role !== "admin") {
        // Sellers can only delete their own product images
        const { products } = await import("@workspace/db/schema");
        const prodRows = await db
          .select({ sellerId: products.sellerId })
          .from(products)
          .where(eq(products.id, image.productId))
          .limit(1);

        if (!prodRows.length || prodRows[0].sellerId !== req.user.id) {
          res
            .status(403)
            .json({ error: "Forbidden: you do not own this product" });
          return;
        }
      }

      // ── Extract S3 key from URL ────────────────────────────────────────────
      let s3Key: string | null = null;
      try {
        const url = new URL(image.url);
        // Works for both s3.amazonaws.com and CloudFront URLs
        s3Key = url.pathname.replace(/^\//, "");
      } catch {
        // URL parse failed — skip S3 deletion but still clean up DB row
      }

      // Delete from S3 (best-effort; don't fail if already gone)
      if (s3Key && checkS3Config() === null) {
        try {
          await s3.send(
            new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }),
          );
        } catch (s3Err) {
          console.warn("S3 delete warning (non-fatal):", s3Err);
        }
      }

      // Delete from DB
      await db.delete(productImages).where(eq(productImages.id, id));

      res.json({ success: true, deletedId: id });
    } catch (error) {
      console.error("Delete product image error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/uploads/avatar-presign
// Returns a pre-signed URL for uploading the current user's avatar.
// Body: { fileName: string; contentType: string; size: number }
// ────────────────────────────────────────────────────────────────────────────
router.post("/avatar-presign", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const cfgErr = checkS3Config();
    if (cfgErr) {
      res.status(503).json({ error: `Storage not configured: ${cfgErr}` });
      return;
    }

    const { fileName, contentType, size } = req.body as {
      fileName: string;
      contentType: string;
      size: number;
    };

    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      res.status(400).json({ error: "Unsupported file type" });
      return;
    }

    const ext = path.extname(fileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      res.status(400).json({ error: "Unsupported file extension" });
      return;
    }

    if (!size || size <= 0 || size > MAX_FILE_SIZE_BYTES) {
      res.status(400).json({
        error: `File size must be between 1 B and ${MAX_FILE_SIZE_MB} MB`,
      });
      return;
    }

    // User-scoped key — prevents any cross-user overwrite
    const key = `avatars/${req.user.id}/${crypto.randomUUID()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
      Metadata: { uploadedBy: req.user.id },
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    res.json({ presignedUrl, key, publicUrl: buildPublicUrl(key) });
  } catch (error) {
    console.error("Avatar presign error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/uploads/confirm-avatar
// After S3 PUT succeeds, persist the new avatarUrl on the user record.
// Body: { key: string }
// ────────────────────────────────────────────────────────────────────────────
router.post("/confirm-avatar", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const cfgErr = checkS3Config();
    if (cfgErr) {
      res.status(503).json({ error: `Storage not configured: ${cfgErr}` });
      return;
    }

    const { key } = req.body as { key: string };

    if (!key) {
      res.status(400).json({ error: "key is required" });
      return;
    }

    // Restrict to avatars folder and this user's sub-folder only
    const expectedPrefix = `avatars/${req.user.id}/`;
    if (
      !key.startsWith(expectedPrefix) ||
      key.includes("..") ||
      key.includes("//")
    ) {
      res.status(400).json({ error: "Invalid key" });
      return;
    }

    // Verify object exists before persisting URL
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch {
      res
        .status(400)
        .json({ error: "File not found in storage. Upload it first." });
      return;
    }

    const publicUrl = buildPublicUrl(key);

    await db
      .update(users)
      .set({ avatarUrl: publicUrl, updatedAt: new Date() })
      .where(eq(users.id, req.user.id));

    res.json({ avatarUrl: publicUrl });
  } catch (error) {
    console.error("Confirm avatar error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
