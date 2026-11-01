import { randomBytes } from "node:crypto";
function signingSecret(name: string) {
  const value = process.env[name];
  if (
    process.env.NODE_ENV === "production" &&
    (!value ||
      value.length < 32 ||
      /^(replace|fallback|change.?me)/i.test(value))
  )
    throw new Error(
      `${name} must be set to a private random value of at least 32 characters`,
    );
  return value || randomBytes(32).toString("hex");
}
export const JWT_SECRET = signingSecret("JWT_SECRET");
export const REFRESH_SECRET = signingSecret("REFRESH_SECRET");
