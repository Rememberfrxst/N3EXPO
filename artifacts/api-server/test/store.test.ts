import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith("_test"))
  throw new Error(
    "Set TEST_DATABASE_URL to an isolated database ending in _test. Apply the schema first.",
  );
process.env.DATABASE_URL = testUrl;
process.env.JWT_SECRET = randomBytes(32).toString("hex");
process.env.REFRESH_SECRET = randomBytes(32).toString("hex");
const { default: app } = await import("../src/app");
const { db, pool } = await import("@workspace/db");
const { users } = await import("@workspace/db/schema");
const { default: bcrypt } = await import("bcryptjs");
const ownerEmail = "rememberfrxst@gmail.com",
  password = randomBytes(24).toString("hex");
await db
  .insert(users)
  .values({
    name: "Test owner",
    email: ownerEmail,
    passwordHash: await bcrypt.hash(password, 10),
    role: "admin",
  })
  .onConflictDoUpdate({
    target: users.email,
    set: { passwordHash: await bcrypt.hash(password, 10), role: "admin" },
  });
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((r) => server.once("listening", r));
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((e) => (e ? reject(e) : resolve())),
  );
  await pool.end();
});
const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  token?: string,
  status = 200,
) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await res.json();
  assert.equal(
    res.status,
    status,
    `${method} ${path}: ${JSON.stringify(result)}`,
  );
  return result;
}
await test("owner-only administration, catalog, campaign schedules and coupon checkout", async () => {
  const owner = await request("/auth/admin-login", "POST", {
    email: ownerEmail,
    password,
  });
  const token = owner.accessToken;
  await request("/admin/products", "GET", undefined, undefined, 401);
  const customer = await request("/auth/register", "POST", {
    email: `customer-${Date.now()}@example.com`,
    password: "Test-password-034",
    name: "Test customer",
    role: "admin",
  });
  assert.equal(customer.user.role, "customer");
  await request("/admin/products", "GET", undefined, customer.accessToken, 403);
  await request(
    "/auth/admin-login",
    "POST",
    { email: customer.user.email, password: "Test-password-034" },
    undefined,
    401,
  );
  await request(
    "/auth/register",
    "POST",
    { email: ownerEmail, password: "Test-password-034", name: "Impersonator" },
    undefined,
    403,
  );
  const otherEmail = `other-${Date.now()}@example.com`;
  await db.insert(users).values({
    name: "Other admin",
    email: otherEmail,
    passwordHash: await bcrypt.hash("Test-password-034", 10),
    role: "admin",
  });
  const other = await request("/auth/login", "POST", {
    email: otherEmail,
    password: "Test-password-034",
  });
  await request("/admin/dashboard", "GET", undefined, other.accessToken, 403);
  const suffix = Date.now().toString();
  const cat = await request(
    "/admin/categories",
    "POST",
    { name: "Test collection", slug: `test-${suffix}`, sortOrder: 2 },
    token,
    201,
  );
  const p = await request(
    "/admin/products",
    "POST",
    {
      name: "Test cotton shirt",
      price: 200,
      compareAtPrice: 300,
      stock: 4,
      categoryId: cat.id,
      images: ["https://example.com/one.jpg"],
      isFeatured: true,
    },
    token,
    201,
  );
  await request(
    "/admin/products",
    "POST",
    { name: "Invalid price", price: -5 },
    token,
    400,
  );
  await request(
    `/admin/products/${p.id}`,
    "PATCH",
    {
      price: 200,
      images: ["https://example.com/two.jpg"],
      specifications: { Material: "Cotton" },
    },
    token,
  );
  const detail = await request(`/products/${p.id}`);
  assert.equal(detail.images[0].url, "https://example.com/two.jpg");
  assert.equal(detail.specifications.Material, "Cotton");
  const live = await request(
    "/admin/banners",
    "POST",
    {
      title: "Live event",
      imageUrl: "https://example.com/banner.jpg",
      linkType: "category",
      linkValue: cat.slug,
    },
    token,
    201,
  );
  const future = await request(
    "/admin/banners",
    "POST",
    {
      title: "Future event",
      imageUrl: "https://example.com/future.jpg",
      startsAt: "2099-01-01T00:00:00Z",
    },
    token,
    201,
  );
  let banners = await request("/banners");
  assert.ok(banners.some((b: any) => b.id === live.id));
  assert.ok(!banners.some((b: any) => b.id === future.id));
  await request(
    `/admin/banners/${live.id}`,
    "PATCH",
    { isActive: false },
    token,
  );
  banners = await request("/banners");
  assert.ok(!banners.some((b: any) => b.id === live.id));
  await request(
    "/admin/banners",
    "POST",
    { imageUrl: "javascript:alert(1)" },
    token,
    400,
  );
  await request(
    "/admin/banners",
    "POST",
    {
      imageUrl: "https://example.com/b.jpg",
      startsAt: "2030-02-02",
      endsAt: "2029-01-01",
    },
    token,
    400,
  );
  await request(
    "/admin/coupons",
    "POST",
    { code: `BAD${suffix}`, discountType: "percentage", discountValue: 101 },
    token,
    400,
  );
  const coupon = await request(
    "/admin/coupons",
    "POST",
    {
      code: `SAVE${suffix}`,
      discountType: "fixed",
      discountValue: 50,
      minOrderValue: 100,
      usageLimit: 1,
    },
    token,
    201,
  );
  const settings = {
    storeName: "Griper",
    announcement: "Test announcement",
    supportEmail: ownerEmail,
    deliveryFee: 25,
    freeShippingThreshold: 499,
    downloadUrl: "",
  };
  await request("/admin/settings", "PUT", settings, token);
  assert.equal((await request("/storefront")).deliveryFee, 25);
  const userToken = customer.accessToken;
  await request(
    "/cart",
    "POST",
    { productId: p.id, quantity: 1 },
    userToken,
    201,
  );
  assert.equal(
    (
      await request(
        "/cart/apply-coupon",
        "POST",
        { code: coupon.code },
        userToken,
      )
    ).discount,
    50,
  );
  const address = await request(
    "/addresses",
    "POST",
    { line1: "Test address", city: "Delhi", state: "Delhi", pincode: "110001" },
    userToken,
    201,
  );
  const order = await request(
    "/orders",
    "POST",
    { addressId: address.id, paymentMethod: "cod", couponCode: coupon.code },
    userToken,
    201,
  );
  assert.equal(Number(order.total), 175);
  assert.equal(Number(order.discount), 50);
  assert.equal(Number(order.shippingFee), 25);
  assert.equal(order.paymentStatus, "pending");
  assert.equal((await request(`/products/${p.id}`)).stock, 3);
  await request(
    "/cart",
    "POST",
    { productId: p.id, quantity: 1 },
    userToken,
    201,
  );
  await request(
    "/orders",
    "POST",
    { addressId: address.id, paymentMethod: "cod", couponCode: coupon.code },
    userToken,
    400,
  );
  assert.equal(
    (await request(`/products/${p.id}`)).stock,
    3,
    "Rejected checkout must roll back inventory",
  );
  await request(
    `/admin/orders/${order.id}/status`,
    "PATCH",
    { status: "shipped" },
    token,
  );
  assert.equal(
    (await request(`/orders/${order.id}`, "GET", undefined, userToken)).status,
    "shipped",
  );
  await request(`/admin/products/${p.id}`, "DELETE", undefined, token);
  await request(`/products/${p.id}`, "GET", undefined, undefined, 404);
  assert.ok(
    (await request("/admin/audit-logs", "GET", undefined, token)).length >= 8,
  );
});
