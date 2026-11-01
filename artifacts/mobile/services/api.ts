/**
 * Central API client for the Meta E-Commerce mobile app.
 * Handles base URL, JWT injection, token refresh on 401, and typed requests.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { storeStorageKey } from "@/constants/storage";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

const API_PORT = process.env.EXPO_PUBLIC_API_PORT ?? "3000";

function resolveDevHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    (
      Constants as {
        manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
      }
    ).manifest2?.extra?.expoGo?.debuggerHost,
    (Constants as { manifest?: { debuggerHost?: string } }).manifest
      ?.debuggerHost,
    (Constants as { expoGoConfig?: { hostUri?: string } }).expoGoConfig
      ?.hostUri,
  ];

  for (const candidate of candidates) {
    const host = candidate?.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return host;
    }
  }

  return null;
}

/** Resolve API base URL for dev (LAN/emulator) and production. */
export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return stripTrailingSlash(envUrl);

  const devHost = resolveDevHost();
  if (devHost) {
    return `http://${devHost}:${API_PORT}/api`;
  }

  // Android emulator: 10.0.2.2 maps to the host machine's localhost.
  if (Platform.OS === "android") {
    return `http://10.0.2.2:${API_PORT}/api`;
  }

  return `http://localhost:${API_PORT}/api`;
}

/** Quick connectivity check — useful for surfacing API errors in the UI. */
export async function checkApiConnection(): Promise<{
  ok: boolean;
  url: string;
  error?: string;
}> {
  const url = getApiBaseUrl();
  try {
    const res = await fetch(`${url}/healthz`, { method: "GET" });
    if (!res.ok) {
      return { ok: false, url, error: `Server responded with ${res.status}` };
    }
    return { ok: true, url };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Network request failed";
    return { ok: false, url, error: message };
  }
}

if (__DEV__) {
  console.log("[API] Using base URL:", getApiBaseUrl());
}

const TOKEN_KEY = storeStorageKey("@griper_access_token");
const REFRESH_KEY = storeStorageKey("@griper_refresh_token");

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, accessToken),
    AsyncStorage.setItem(REFRESH_KEY, refreshToken),
  ]);
}

export async function clearTokens() {
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_KEY),
  ]);
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return null;
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.accessToken) {
      await AsyncStorage.setItem(TOKEN_KEY, data.accessToken);
      if (data.refreshToken) {
        await AsyncStorage.setItem(REFRESH_KEY, data.refreshToken);
      }
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const buildHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (auth) {
      const token = await getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const doFetch = async (headers: Record<string, string>): Promise<Response> =>
    fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let headers = await buildHeaders();
  let res = await doFetch(headers);

  // Attempt token refresh on 401
  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await doFetch(headers);
    }
  }

  if (!res.ok) {
    let errorMessage = `API Error ${res.status}`;
    try {
      const errData = await res.json();
      errorMessage = errData.error ?? errData.message ?? errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Typed API helpers ──────────────────────────────────────────────────────

export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) =>
      apiRequest<{ user: ApiUser; accessToken: string; refreshToken: string }>(
        "/auth/login",
        { method: "POST", body: { email, password }, auth: false },
      ),
    register: (name: string, email: string, phone: string, password: string) =>
      apiRequest<{ user: ApiUser; accessToken: string; refreshToken: string }>(
        "/auth/register",
        { method: "POST", body: { name, email, phone, password }, auth: false },
      ),
    me: () => apiRequest<ApiUser>("/auth/me"),
    updateProfile: (body: { name: string; phone?: string }) =>
      apiRequest<ApiUser>("/auth/profile", { method: "PATCH", body }),
    logout: () => apiRequest("/auth/logout", { method: "POST" }),
    refresh: (refreshToken: string) =>
      apiRequest<{ accessToken: string; refreshToken?: string }>(
        "/auth/refresh",
        { method: "POST", body: { refreshToken }, auth: false },
      ),
  },

  // Products
  products: {
    list: (params?: Record<string, string | number | boolean>) => {
      const qs = params
        ? "?" +
          new URLSearchParams(
            Object.entries(params).map(([k, v]) => [k, String(v)]),
          ).toString()
        : "";
      return apiRequest<{
        data: ApiProduct[];
        total: number;
        page: number;
        limit: number;
      }>(`/products${qs}`, { auth: false });
    },
    get: (id: string) =>
      apiRequest<
        ApiProduct & {
          images: ApiProductImage[];
          variants: ApiProductVariant[];
        }
      >(`/products/${id}`, { auth: false }),
    reviews: (id: string) =>
      apiRequest<ApiReview[]>(`/products/${id}/reviews`, { auth: false }),
    addReview: (
      id: string,
      body: { rating: number; title?: string; comment?: string },
    ) => apiRequest(`/products/${id}/reviews`, { method: "POST", body }),
  },

  // Categories
  categories: {
    list: () => apiRequest<ApiCategory[]>("/categories", { auth: false }),
  },

  // Banners
  banners: {
    list: () => apiRequest<ApiBanner[]>("/banners", { auth: false }),
  },

  // Cart
  cart: {
    get: () => apiRequest<{ items: ApiCartItem[] }>("/cart"),
    add: (productId: string, quantity: number, variantId?: string) =>
      apiRequest("/cart", {
        method: "POST",
        body: { productId, quantity, variantId },
      }),
    update: (itemId: string, quantity: number) =>
      apiRequest(`/cart/${itemId}`, { method: "PATCH", body: { quantity } }),
    remove: (itemId: string) =>
      apiRequest(`/cart/${itemId}`, { method: "DELETE" }),
    clear: () => apiRequest("/cart", { method: "DELETE" }),
    applyCoupon: (code: string) =>
      apiRequest<{ discount: number; discountType: string; code: string }>(
        "/cart/apply-coupon",
        { method: "POST", body: { code } },
      ),
  },

  // Wishlist
  wishlist: {
    get: () => apiRequest<ApiWishlistItem[]>("/wishlist"),
    add: (productId: string) =>
      apiRequest("/wishlist", { method: "POST", body: { productId } }),
    remove: (productId: string) =>
      apiRequest(`/wishlist/${productId}`, { method: "DELETE" }),
  },

  // Addresses
  addresses: {
    list: () => apiRequest<ApiAddress[]>("/addresses"),
    add: (body: Omit<ApiAddress, "id" | "userId" | "createdAt">) =>
      apiRequest<ApiAddress>("/addresses", { method: "POST", body }),
    update: (id: string, body: Partial<ApiAddress>) =>
      apiRequest<ApiAddress>(`/addresses/${id}`, { method: "PUT", body }),
    delete: (id: string) =>
      apiRequest(`/addresses/${id}`, { method: "DELETE" }),
    setDefault: (id: string) =>
      apiRequest(`/addresses/${id}/default`, { method: "PATCH" }),
  },

  // Orders
  orders: {
    list: () => apiRequest<ApiOrder[]>("/orders"),
    get: (id: string) =>
      apiRequest<ApiOrder & { items: ApiOrderItem[] }>(`/orders/${id}`),
    place: (addressId: string, paymentMethod: string, couponCode?: string) =>
      apiRequest<ApiOrder>("/orders", {
        method: "POST",
        body: { addressId, paymentMethod, couponCode },
      }),
    cancel: (id: string) =>
      apiRequest(`/orders/${id}/cancel`, { method: "POST" }),
  },

  // Notifications
  notifications: {
    list: () => apiRequest<ApiNotification[]>("/notifications"),
    markRead: (id: string) =>
      apiRequest(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: () =>
      apiRequest("/notifications/read-all", { method: "PATCH" }),
  },

  // Image Uploads (Presigned S3)
  uploads: {
    /**
     * Get presigned PUT URLs to upload images directly to S3.
     * The server never handles raw binary data.
     */
    presign: (
      files: { fileName: string; contentType: string; size: number }[],
      folder: "products" | "avatars" | "banners" = "products",
    ) =>
      apiRequest<{
        uploads: { presignedUrl: string; key: string; publicUrl: string }[];
      }>("/uploads/presign", { method: "POST", body: { files, folder } }),

    /** Upload file bytes directly to S3 using a presigned URL (no auth header needed). */
    putToS3: async (
      presignedUrl: string,
      file: Blob,
      contentType: string,
    ): Promise<void> => {
      const res = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
    },

    /** After S3 PUT succeeds, register the image in the DB. */
    confirmProductImage: (
      productId: string,
      key: string,
      altText?: string,
      isPrimary?: boolean,
    ) =>
      apiRequest("/uploads/confirm-product-image", {
        method: "POST",
        body: { productId, key, altText, isPrimary },
      }),

    /** Delete an image from both S3 and DB. */
    deleteProductImage: (imageId: string) =>
      apiRequest(`/uploads/product-image/${imageId}`, { method: "DELETE" }),

    /** Get a presigned URL to upload an avatar for the current user. */
    avatarPresign: (fileName: string, contentType: string, size: number) =>
      apiRequest<{ presignedUrl: string; key: string; publicUrl: string }>(
        "/uploads/avatar-presign",
        { method: "POST", body: { fileName, contentType, size } },
      ),

    /** After avatar S3 PUT succeeds, persist the new avatarUrl. */
    confirmAvatar: (key: string) =>
      apiRequest<{ avatarUrl: string }>("/uploads/confirm-avatar", {
        method: "POST",
        body: { key },
      }),
  },

  // Recommendations
  recommendations: {
    track: (action: string, productId?: string, searchQuery?: string) =>
      apiRequest("/recommendations/track", {
        method: "POST",
        body: { action, productId, searchQuery },
      }),
    forYou: () =>
      apiRequest<{ data: ApiProduct[] }>("/recommendations/for-you"),
    similar: (productId: string) =>
      apiRequest<{ data: ApiProduct[] }>(
        `/recommendations/similar/${productId}`,
      ),
    trending: () =>
      apiRequest<{ data: ApiProduct[] }>("/recommendations/trending"),
    recentlyViewed: () =>
      apiRequest<{ data: ApiProduct[] }>("/recommendations/recently-viewed"),
  },

  // Payments (Razorpay)
  payments: {
    createOrder: (orderId: string) =>
      apiRequest<{
        razorpayOrderId: string;
        amount: number;
        currency: string;
        orderId: string;
        key_id: string;
      }>("/payments/create-order", { method: "POST", body: { orderId } }),

    verify: (params: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      orderId: string;
    }) =>
      apiRequest<{ success: boolean; orderId: string; paymentId: string }>(
        "/payments/verify",
        { method: "POST", body: params },
      ),

    refund: (orderId: string) =>
      apiRequest("/payments/refund", { method: "POST", body: { orderId } }),
  },
};

// ─── API Types ───────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "customer" | "seller" | "admin";
  isVerified: boolean;
  avatarUrl?: string;
}

export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: string;
  compareAtPrice?: string;
  categoryId?: string;
  sellerId?: string;
  brand?: string;
  sku?: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  avgRating: string;
  totalReviews: number;
  totalSold: number;
  specifications?: Record<string, string>;
  tags?: string[];
  images?: ApiProductImage[];
  variants?: ApiProductVariant[];
  variantCount?: number;
  category?: ApiCategory;
}

export interface ApiProductImage {
  id: string;
  url: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ApiProductVariant {
  id: string;
  name: string;
  value: string;
  priceModifier: string;
  stock: number;
  sku?: string;
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  imageUrl?: string;
  parentId?: string;
  isActive: boolean;
}

export interface ApiBanner {
  id: string;
  title?: string;
  subtitle?: string;
  imageUrl: string;
  linkType?: string;
  linkValue?: string;
  isActive: boolean;
}

export interface ApiCartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  product: ApiProduct;
  variant?: ApiProductVariant;
}

export interface ApiWishlistItem {
  id: string;
  productId: string;
  product: ApiProduct;
}

export interface ApiAddress {
  id: string;
  userId: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ApiOrder {
  id: string;
  userId: string;
  orderNumber: string;
  status:
    | "pending"
    | "confirmed"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "returned";
  subtotal: string;
  discount: string;
  shippingFee: string;
  total: string;
  paymentMethod: string;
  paymentStatus: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  items?: ApiOrderItem[];
  address?: ApiAddress;
}

export interface ApiOrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  product?: ApiProduct;
}

export interface ApiReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerified: boolean;
  createdAt: string;
  user?: { name: string; avatarUrl?: string };
}

export interface ApiNotification {
  id: string;
  title: string;
  body?: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Mappers: API → App types ────────────────────────────────────────────────

import { Product, Category } from "@/constants/data";

export function mapApiProduct(p: ApiProduct & { imageUrl?: string }): Product {
  const price = parseFloat(p.price) || 0;
  const originalPrice = parseFloat(p.compareAtPrice ?? "0") || price;
  const discount =
    originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;
  const primaryImage = p.images?.find((i) => i.isPrimary) ?? p.images?.[0];
  const imageUrl = p.imageUrl || primaryImage?.url || "";

  return {
    id: p.id,
    name: p.name,
    price,
    originalPrice,
    discount,
    rating: parseFloat(p.avgRating) || 0,
    reviewCount: p.totalReviews ?? 0,
    category: p.category?.slug ?? p.categoryId ?? "",
    subcategory: "",
    seller: p.brand ?? "Griper",
    sellerId: p.sellerId ?? "",
    stock: p.stock ?? 0,
    description: p.description ?? "",
    image: imageUrl,
    tags: p.tags ?? [],
    isExpress: false,
    specifications: p.specifications ?? {},
    variantCount: p.variants?.length ?? p.variantCount ?? 0,
  };
}

export function mapApiCategory(c: ApiCategory): Category {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon ?? "🛍️",
    color: c.color ?? "#6366f1",
    color2: c.color ?? "#818cf8",
  };
}
