/** Run explicitly with DATABASE_URL and ADMIN_PASSWORD supplied at runtime. */
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
const email = (process.env.ADMIN_EMAIL || "rememberfrxst@gmail.com")
  .trim()
  .toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 12)
  throw new Error("Set ADMIN_PASSWORD to at least 12 characters");
const passwordHash = await bcrypt.hash(password, 12);
await db
  .insert(users)
  .values({
    name: "Store owner",
    email,
    passwordHash,
    role: "admin",
    isVerified: true,
  })
  .onConflictDoUpdate({
    target: users.email,
    set: {
      passwordHash,
      role: "admin",
      isVerified: true,
      updatedAt: new Date(),
    },
  });
console.log("Owner account provisioned. Password stored as a bcrypt hash.");
process.exit(0);
