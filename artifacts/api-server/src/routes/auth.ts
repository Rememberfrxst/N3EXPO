import { JWT_SECRET, REFRESH_SECRET } from "../lib/auth-config";
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { users, refreshTokens } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import {
  requireAuth,
  AuthRequest,
  OWNER_EMAIL,
  isStoreOwner,
} from "../middlewares/auth";

const router = Router();

const generateTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ id: userId }, REFRESH_SECRET, {
    expiresIn: "30d",
  });
  return { accessToken, refreshToken };
};

router.post("/register", async (req, res) => {
  try {
    const parseResult = RegisterBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.issues,
      });
      return;
    }

    const { name, password, phone } = parseResult.data;
    const email = parseResult.data.email.trim().toLowerCase();
    if (email === OWNER_EMAIL) {
      res
        .status(403)
        .json({ error: "This email is reserved for the store owner" });
      return;
    }

    // Check if email already exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existingUsers.length > 0) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUsers = await db
      .insert(users)
      .values({
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: "customer",
      })
      .returning();

    const user = newUsers[0];
    const { accessToken, refreshToken } = generateTokens(user.id, user.role!);

    // Store refresh token
    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: await bcrypt.hash(refreshToken, 10),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      deviceInfo: req.headers["user-agent"] || "unknown",
    });

    const { passwordHash: _, totpSecret: __, ...safeUser } = user;

    res.json({ user: safeUser, accessToken, refreshToken });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

import crypto from "crypto";

function generateBase32Secret(length = 20): string {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    secret += base32chars[randomBytes[i] % 32];
  }
  return secret;
}

function verifyTOTP(token: string, secret: string, window = 1): boolean {
  if (!token || !secret) return false;
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (let i = 0; i < secret.length; i++) {
    const val = base32chars.indexOf(secret.charAt(i).toUpperCase());
    if (val < 0) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
  }

  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  const currentStep = Math.floor(epoch / timeStep);

  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const step = currentStep + errorWindow;
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(step));
    const hmac = crypto
      .createHmac("sha1", Buffer.from(bytes))
      .update(buf)
      .digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code =
      (((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)) %
      1000000;
    const formattedCode = code.toString().padStart(6, "0");
    if (formattedCode === token) return true;
  }
  return false;
}

router.post(["/login", "/admin-login"], async (req, res) => {
  try {
    const parseResult = LoginBody.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.issues,
      });
      return;
    }

    const { password } = parseResult.data;
    const email = parseResult.data.email.trim().toLowerCase();

    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const user = userRecords[0];

    if (!user || (req.path === "/admin-login" && !isStoreOwner(user))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Check if user requires 2FA (e.g. Admin with 2FA enabled)
    if (user.role === "admin" && user.is2faEnabled) {
      res.json({ require2FA: true, userId: user.id });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role!);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: await bcrypt.hash(refreshToken, 10),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      deviceInfo: req.headers["user-agent"] || "unknown",
    });

    const { passwordHash: _, totpSecret: __, ...safeUser } = user;

    res.json({ user: safeUser, accessToken, refreshToken });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: "Refresh token is required" });
      return;
    }

    // Wait, let's just verify the jwt token and then mint a new one. The mobile app just needs an accessToken.
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as {
        id: string;
      };
      const userRecords = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.id))
        .limit(1);
      const user = userRecords[0];

      if (!user) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }

      const { accessToken } = generateTokens(user.id, user.role!);
      res.json({ accessToken });
    } catch (err) {
      res.status(401).json({ error: "Invalid or expired refresh token" });
    }
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin 2FA Login endpoint
router.post("/admin-login-2fa", async (req, res) => {
  try {
    const { userId, password, code } = req.body;
    if (!userId || !password || !code) {
      res
        .status(400)
        .json({ error: "userId, password and 2FA code are required" });
      return;
    }

    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const user = userRecords[0];

    if (!user || !isStoreOwner(user)) {
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    if (!user.totpSecret || !verifyTOTP(code, user.totpSecret)) {
      res.status(401).json({ error: "Invalid 2FA authenticator code" });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role!);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: await bcrypt.hash(refreshToken, 10),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      deviceInfo: req.headers["user-agent"] || "unknown",
    });

    const { passwordHash: _, totpSecret: __, ...safeUser } = user;
    res.json({ user: safeUser, accessToken, refreshToken });
  } catch (error) {
    console.error("2FA login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2FA Setup endpoints
router.post("/2fa/setup", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const secret = generateBase32Secret();

    await db
      .update(users)
      .set({ totpSecret: secret })
      .where(eq(users.id, user.id));

    const otpAuthUrl = `otpauth://totp/MetaAdmin:${encodeURIComponent(user.email)}?secret=${secret}&issuer=MetaECommerce`;

    res.json({
      secret,
      otpAuthUrl,
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/2fa/verify", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { code } = req.body;

    if (!user.totpSecret || !verifyTOTP(code, user.totpSecret)) {
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }

    await db
      .update(users)
      .set({ is2faEnabled: true })
      .where(eq(users.id, user.id));
    res.json({ success: true, message: "2FA enabled successfully" });
  } catch (error) {
    console.error("2FA verify error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { passwordHash: _, totpSecret: __, ...safeUser } = req.user;
  res.json(safeUser);
});

router.patch("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, phone } = req.body;
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 100 ||
      (phone !== undefined &&
        (typeof phone !== "string" ||
          (phone !== "" && !/^\+?[0-9 ()-]{7,15}$/.test(phone))))
    ) {
      res.status(400).json({ error: "Enter a valid name and phone number" });
      return;
    }
    const [user] = await db
      .update(users)
      .set({
        name: name.trim(),
        ...(phone !== undefined && { phone: phone.trim() || null }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user!.id))
      .returning();
    const { passwordHash: _, totpSecret: __, ...safe } = user;
    res.json(safe);
  } catch (e: any) {
    res
      .status(e.cause?.code === "23505" || e.code === "23505" ? 409 : 500)
      .json({
        error:
          "Could not update profile. This phone number may already be in use.",
      });
  }
});
export default router;
