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
let currentUserRequest: Promise<any> | null = null;

function getTokenRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))).role ?? null;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  let sessionToken: string | null = null;
  try {
    sessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    // Session storage may be unavailable in restricted browser contexts.
  }
  if (sessionToken) return sessionToken;

  try {
    const persistentToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (persistentToken && getTokenRole(persistentToken) === 'student') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }
    return persistentToken;
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (!token) {
    try {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // Continue clearing persistent storage.
    }
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // The in-memory authentication state is still cleared by AuthContext.
    }
    return;
  }

  if (getTokenRole(token) === 'student') {
    try {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch {
      throw new Error('Unable to store your student session for this browser tab.');
    }
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // Legacy student tokens are ignored and removed on the next readable access.
    }
    return;
  }

  try {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    throw new Error('Unable to replace the previous authentication session.');
  }
  try {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    throw new Error('Unable to store your authentication session in this browser.');
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

/**
 * Fetch a paginated admin resource and return { data, pagination } without unwrapping.
 * The base apiRequest unwraps data.data — for paginated responses we need the full envelope.
 */
async function adminPaginatedRequest(endpoint: string): Promise<{ data: any[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('x-auth-token', token);
  }
  const response = await fetch(endpoint, { headers, credentials: 'include' });
  const json = await response.json().catch(() => ({ success: false, error: 'Invalid response.' }));
  if (!response.ok || !json.success) {
    if (response.status === 401) setStoredToken(null);
    throw new ApiError(json.error || `Request failed with status ${response.status}`, response.status);
  }
  return {
    data: Array.isArray(json.data) ? json.data : [],
    pagination: json.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 },
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
        : response.status === 429
        ? 'Too many requests. Please wait and try again.'
        : `Request failed with status ${response.status}`);
    throw new ApiError(errorMsg, response.status);
  }

  return data.data !== undefined ? data.data : data;
}

export const api = {
  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------
  registerStudent: async (data: any) => {
    const res = await apiRequest<any>('/api/auth/register/student', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res?.token) setStoredToken(res.token);
    return res;
  },

  resendVerificationCode: (email: string) =>
    apiRequest<any>('/api/auth/verification/resend', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyEmail: (data: { email: string; otp: string }) =>
    apiRequest<any>('/api/auth/verify-registration', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyRegistration: (data: { email: string; otp: string }) =>
    apiRequest<any>('/api/auth/verify-registration', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  requestPasswordReset: (email: string) =>
    apiRequest<any>('/api/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyPasswordResetCode: (data: { email: string; otp: string }) =>
    apiRequest<{ token: string }>('/api/auth/password/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resetPassword: (data: { token: string; password: string }) =>
    apiRequest<any>('/api/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

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
    if (res?.token) setStoredToken(res.token);
    return res;
  },

  logout: async () => {
    try {
      await apiRequest<any>('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  getMe: () => {
    if (!currentUserRequest) {
      currentUserRequest = apiRequest<any>('/api/auth/me')
        .then((res) => {
          if (res?.token) setStoredToken(res.token);
          return res;
        })
        .finally(() => {
          currentUserRequest = null;
        });
    }
    return currentUserRequest;
  },
  getLoginActivity: () => apiRequest<any[]>('/api/users/login-activity'),

  // Resolver registration
  registerResolver: (data: {
    name: string;
    email: string;
    employeeId: string;
    department: string;
  }) =>
    apiRequest<any>('/api/auth/register/resolver', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ---------------------------------------------------------------------------
  // Campus Categories & Services
  // ---------------------------------------------------------------------------
  getCategories: async (all?: boolean): Promise<CategoryItem[]> => {
    const query = all ? '?all=true' : '';
    const res = await apiRequest<any>(`/api/categories${query}`);
    return Array.isArray(res) ? res : res?.data || [];
  },
  createCategory: (data: any) =>
    apiRequest<any>('/api/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: any) =>
    apiRequest<any>(`/api/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCategory: (id: string) =>
    apiRequest<any>(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getServices: async (params?: { categoryId?: string; all?: boolean }): Promise<ServiceItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.all) searchParams.set('all', 'true');
    const res = await apiRequest<any>(`/api/services?${searchParams.toString()}`);
    return Array.isArray(res) ? res : res?.data || [];
  },
  createService: (data: any) =>
    apiRequest<any>('/api/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id: string, data: any) =>
    apiRequest<any>(`/api/services/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteService: (id: string) =>
    apiRequest<any>(`/api/services/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // ---------------------------------------------------------------------------
  // Issues (Student)
  // ---------------------------------------------------------------------------
  createIssue: (data: any) =>
    apiRequest<any>('/api/issues', { method: 'POST', body: JSON.stringify(data) }),
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
    apiRequest<any>(`/api/issues/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  addComment: (issueId: string, content: string) =>
    apiRequest<any>(`/api/issues/${encodeURIComponent(issueId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // ---------------------------------------------------------------------------
  // Voting
  // ---------------------------------------------------------------------------
  castVote: (issueId: string) =>
    apiRequest<any>(`/api/votes/${encodeURIComponent(issueId)}`, { method: 'POST' }),
  removeVote: (issueId: string) =>
    apiRequest<any>(`/api/votes/${encodeURIComponent(issueId)}`, { method: 'DELETE' }),
  getVoteCount: (issueId: string) =>
    apiRequest<any>(`/api/votes/${encodeURIComponent(issueId)}`),

  // ---------------------------------------------------------------------------
  // Public Transparency Dashboard
  // ---------------------------------------------------------------------------
  getPublicDashboard: () => apiRequest<any>('/api/public/dashboard'),

  // ---------------------------------------------------------------------------
  // Resolver & Administration
  // ---------------------------------------------------------------------------
  getResolverIssues: async (params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    const response = await apiRequest<any>(`/api/resolver/issues?${searchParams.toString()}`);
    return normalizeIssueListResponse(response);
  },
  updateIssueStatus: (id: string, data: { status: string; note?: string; resolutionNote?: string }) =>
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

  // ---------------------------------------------------------------------------
  // Admin Panel
  // ---------------------------------------------------------------------------
  admin: {
    getDashboard: () => apiRequest<any>('/api/admin/dashboard'),

    // Users
    getUsers: (params?: Record<string, string>) => {
      const searchParams = new URLSearchParams(params);
      return adminPaginatedRequest(`/api/admin/users?${searchParams.toString()}`);
    },
    getUser: (id: string) => apiRequest<any>(`/api/admin/users/${encodeURIComponent(id)}`),
    updateUserStatus: (id: string, data: { status: string; reason?: string }) =>
      apiRequest<any>(`/api/admin/users/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    resetUserPassword: (id: string, newPassword: string) =>
      apiRequest<any>(`/api/admin/users/${encodeURIComponent(id)}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      }),
    deleteUser: (id: string) =>
      apiRequest<any>(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),

    // Resolver requests
    getResolverRequests: (params?: Record<string, string>) => {
      const searchParams = new URLSearchParams(params);
      return adminPaginatedRequest(`/api/admin/resolver-requests?${searchParams.toString()}`);
    },
    reviewResolverRequest: (id: string, data: { action: 'APPROVE' | 'REJECT'; adminNote?: string; rejectionReason?: string; department?: string }) =>
      apiRequest<any>(`/api/admin/resolver-requests/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // Issues
    getIssues: (params?: Record<string, string>) => {
      const searchParams = new URLSearchParams(params);
      return adminPaginatedRequest(`/api/admin/issues?${searchParams.toString()}`);
    },
    updateIssue: (id: string, data: any) =>
      apiRequest<any>(`/api/admin/issues/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteIssue: (id: string) =>
      apiRequest<any>(`/api/admin/issues/${encodeURIComponent(id)}`, { method: 'DELETE' }),

    // Activity logs
    getActivityLogs: (params?: Record<string, string>) => {
      const searchParams = new URLSearchParams(params);
      return adminPaginatedRequest(`/api/admin/activity-logs?${searchParams.toString()}`);
    },
    getLoginActivity: (params?: Record<string, string>) => {
      const searchParams = new URLSearchParams(params);
      return apiRequest<any[]>(`/api/admin/login-activity?${searchParams.toString()}`);
    },
  },

  // ---------------------------------------------------------------------------
  // User Profile & Settings
  // ---------------------------------------------------------------------------
  getProfile: () => apiRequest<any>('/api/users/profile'),
  updateProfile: (data: any) =>
    apiRequest<any>('/api/users/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response = await apiRequest<any>('/api/users/password', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (response?.token) setStoredToken(response.token);
    return response;
  },
  getSettings: () => apiRequest<any>('/api/users/settings'),
  updateSettings: (data: any) =>
    apiRequest<any>('/api/users/settings', { method: 'PATCH', body: JSON.stringify(data) }),

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------
  getNotifications: () => apiRequest<any>('/api/notifications'),
  markNotificationRead: (id: string) =>
    apiRequest<any>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    apiRequest<any>('/api/notifications/read-all', { method: 'PATCH' }),

  // ---------------------------------------------------------------------------
  // File Upload
  // ---------------------------------------------------------------------------
  uploadImage: (data: { imageBase64: string; filename?: string }) =>
    apiRequest<{ url: string; filename: string; sizeBytes: number }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
