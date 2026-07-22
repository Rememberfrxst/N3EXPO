const BASE_URL = '/api';

let accessTokenMemory: string | null = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;

export function getAccessToken(): string | null {
  return accessTokenMemory;
}

export function setAccessToken(token: string) {
  accessTokenMemory = token;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('admin_token', token);
  }
}

export function clearAccessToken() {
  accessTokenMemory = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('admin_token');
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  auth?: boolean;
}

export async function apiRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth && accessTokenMemory) {
    headers['Authorization'] = `Bearer ${accessTokenMemory}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const err = await res.json();
      errorMsg = err.error || err.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const adminApi = {
  auth: {
    login: (email: string, password: string) =>
      apiRequest<{ user?: any; accessToken?: string; require2FA?: boolean; userId?: string }>(
        '/auth/login',
        { method: 'POST', body: { email, password }, auth: false }
      ),
    login2FA: (userId: string, password: string, code: string) =>
      apiRequest<{ user: any; accessToken: string }>(
        '/auth/admin-login-2fa',
        { method: 'POST', body: { userId, password, code }, auth: false }
      ),
    me: () => apiRequest('/auth/me'),
    setup2FA: () => apiRequest<{ secret: string; otpAuthUrl: string }>('/auth/2fa/setup', { method: 'POST' }),
    verify2FA: (code: string) => apiRequest<{ success: boolean }>('/auth/2fa/verify', { method: 'POST', body: { code } }),
  },
  dashboard: {
    stats: () => apiRequest<{ totalUsers: number; totalOrders: number; totalRevenue: number; lowStockCount: number }>('/admin/dashboard'),
    auditLogs: () => apiRequest<any[]>('/admin/audit-logs'),
  },
  products: {
    list: () => apiRequest<any[]>('/admin/products'),
    create: (data: any) => apiRequest('/admin/products', { method: 'POST', body: data }),
    update: (id: string, data: any) => apiRequest(`/admin/products/${id}`, { method: 'PATCH', body: data }),
    delete: (id: string) => apiRequest(`/admin/products/${id}`, { method: 'DELETE' }),
    bulkUpload: (items: any[]) => apiRequest<{ success: boolean; importedCount: number }>('/admin/products/bulk', { method: 'POST', body: { items } }),
  },
  orders: {
    list: () => apiRequest<any[]>('/admin/orders'),
    get: (id: string) => apiRequest<any>(`/admin/orders/${id}`),
    updateStatus: (id: string, status: string, paymentStatus?: string) =>
      apiRequest(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status, paymentStatus } }),
  },
  customers: {
    list: () => apiRequest<any[]>('/admin/users'),
    update: (id: string, data: any) => apiRequest(`/admin/users/${id}`, { method: 'PATCH', body: data }),
  },
  categories: {
    list: () => apiRequest<any[]>('/admin/categories'),
    create: (data: any) => apiRequest('/admin/categories', { method: 'POST', body: data }),
    delete: (id: string) => apiRequest(`/admin/categories/${id}`, { method: 'DELETE' }),
  },
  coupons: {
    list: () => apiRequest<any[]>('/admin/coupons'),
    create: (data: any) => apiRequest('/admin/coupons', { method: 'POST', body: data }),
    delete: (id: string) => apiRequest(`/admin/coupons/${id}`, { method: 'DELETE' }),
  },
  banners: {
    list: () => apiRequest<any[]>('/admin/banners'),
    create: (data: any) => apiRequest('/admin/banners', { method: 'POST', body: data }),
    delete: (id: string) => apiRequest(`/admin/banners/${id}`, { method: 'DELETE' }),
  },
  uploads: {
    presign: (files: { fileName: string; contentType: string; size: number }[], folder = 'products') =>
      apiRequest<{ uploads: { presignedUrl: string; key: string; publicUrl: string }[] }>('/uploads/presign', { method: 'POST', body: { files, folder } }),
    putToS3: async (presignedUrl: string, file: File) => {
      const res = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error('Failed to upload file to S3');
    },
  },
  notifications: {
    broadcast: (title: string, body: string) =>
      apiRequest('/admin/notifications/broadcast', { method: 'POST', body: { title, body } }),
  },
};
