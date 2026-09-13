import { ApiResponse, CategoryItem, ServiceItem } from '../types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const AUTH_TOKEN_KEY = 'campusfix_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

function normalizeIssueListResponse(response: any) {
  if (Array.isArray(response)) {
    return { issues: response, count: response.length };
  }

  return {
    ...response,
    issues: Array.isArray(response?.issues) ? response.issues : Array.isArray(response?.data) ? response.data : [],
    count: response?.count ?? response?.pagination?.total ?? 0,
  };
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('x-auth-token', token);
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Sends HTTP-only secure session cookies
  };

  const response = await fetch(endpoint, config);
  const data = await response.json().catch(() => ({
    success: false,
    error: 'Invalid response received from server.',
  }));

  if (!response.ok || !data.success) {
    if (response.status === 401) {
      setStoredToken(null);
    }
    const errorMsg =
      data.error ||
      data.message ||
      (response.status === 401
        ? 'Authentication required.'
        : response.status === 403
        ? 'Access denied.'
        : `Request failed with status ${response.status}`);
    throw new ApiError(errorMsg, response.status);
  }

  return data.data !== undefined ? data.data : data;
}

export const api = {
  // Authentication
  registerStudent: async (data: any) => {
    const res = await apiRequest<any>('/api/auth/register/student', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res?.token) {
      setStoredToken(res.token);
    }
    return res;
  },
  registerResolver: async (data: any) => {
    const res = await apiRequest<any>('/api/auth/register/resolver', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res?.token) {
      setStoredToken(res.token);
    }
    return res;
  },
  login: async (data: { identifier?: string; userId?: string; password: string; expectedRole?: string }) => {
    const payload = {
      identifier: data.identifier || data.userId,
      password: data.password,
      expectedRole: data.expectedRole,
    };
    const res = await apiRequest<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res?.token) {
      setStoredToken(res.token);
    }
    return res;
  },
  logout: async () => {
    try {
      await apiRequest<any>('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      setStoredToken(null);
    }
  },
  getMe: async () => {
    const res = await apiRequest<any>('/api/auth/me');
    if (res?.token) {
      setStoredToken(res.token);
    }
    return res;
  },

  // Campus Categories & Services
  getCategories: async (all?: boolean): Promise<CategoryItem[]> => {
    const query = all ? '?all=true' : '';
    const res = await apiRequest<any>(`/api/categories${query}`);
    return Array.isArray(res) ? res : res?.data || [];
  },
  createCategory: (data: any) =>
    apiRequest<any>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (id: string, data: any) =>
    apiRequest<any>(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: string) =>
    apiRequest<any>(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getServices: async (params?: { categoryId?: string; all?: boolean }): Promise<ServiceItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.all) searchParams.set('all', 'true');
    const res = await apiRequest<any>(`/api/services?${searchParams.toString()}`);
    return Array.isArray(res) ? res : res?.data || [];
  },
  createService: (data: any) =>
    apiRequest<any>('/api/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateService: (id: string, data: any) =>
    apiRequest<any>(`/api/services/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteService: (id: string) =>
    apiRequest<any>(`/api/services/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Issues (Student)
  createIssue: (data: any) =>
    apiRequest<any>('/api/issues', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMyIssues: async (params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    const response = await apiRequest<any>(`/api/issues/my?${searchParams.toString()}`);
    return normalizeIssueListResponse(response);
  },
  trackIssue: (issueId: string) =>
    apiRequest<any>(`/api/issues/track/${encodeURIComponent(issueId)}`),
  getIssueById: (id: string) =>
    apiRequest<any>(`/api/issues/${encodeURIComponent(id)}`),
  deleteIssue: (id: string) =>
    apiRequest<any>(`/api/issues/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  addComment: (issueId: string, content: string) =>
    apiRequest<any>(`/api/issues/${encodeURIComponent(issueId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Resolver & Administration
  getResolverIssues: async (params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    const response = await apiRequest<any>(`/api/resolver/issues?${searchParams.toString()}`);
    return normalizeIssueListResponse(response);
  },
  updateIssueStatus: (
    id: string,
    data: { status: string; note?: string; resolutionNote?: string }
  ) =>
    apiRequest<any>(`/api/resolver/issues/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  assignIssue: (id: string, assignedToId: string) =>
    apiRequest<any>(`/api/resolver/issues/${encodeURIComponent(id)}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedToId }),
    }),
  getAnalytics: () => apiRequest<any>('/api/resolver/analytics'),

  // User Profile & Settings
  getProfile: () => apiRequest<any>('/api/users/profile'),
  updateProfile: (data: any) =>
    apiRequest<any>('/api/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiRequest<any>('/api/users/password', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getSettings: () => apiRequest<any>('/api/users/settings'),
  updateSettings: (data: any) =>
    apiRequest<any>('/api/users/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Notifications
  getNotifications: () => apiRequest<any>('/api/notifications'),
  markNotificationRead: (id: string) =>
    apiRequest<any>(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    }),
  markAllNotificationsRead: () =>
    apiRequest<any>('/api/notifications/read-all', {
      method: 'PATCH',
    }),

  // Verified Image Upload
  uploadImage: (data: { imageBase64: string; filename?: string }) =>
    apiRequest<{ url: string; filename: string; sizeBytes: number }>(
      '/api/upload',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
};
