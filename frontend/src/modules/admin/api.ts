import type { AdminDashboardData, AdminUser, AuditLog, AdminNotification, BackupEntry, LoginHistoryEntry, ActiveSession, SecurityOverview, AIAnalytics, SystemHealth } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  const token = localStorage.getItem('smartcare_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data as T;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') sp.set(k, String(v)); });
  const q = sp.toString();
  return q ? `?${q}` : '';
}

export const adminApi = {
  // Dashboard
  getDashboard: () => adminFetch<AdminDashboardData>('/api/admin/dashboard'),

  // Users
  getUsers: (params: { search?: string; role?: string; status?: string; page?: number; limit?: number; sort?: string; order?: string }) =>
    adminFetch<{ users: AdminUser[]; total: number; page: number; limit: number }>(`/api/admin/users${buildQuery(params as any)}`),
  createUser: (payload: { name: string; email: string; username: string; password: string; role: string }) =>
    adminFetch<{ message: string; user: AdminUser }>('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id: string, payload: { name?: string; email?: string }) =>
    adminFetch<{ message: string }>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  changeRole: (id: string, role: string) =>
    adminFetch<{ message: string }>(`/api/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  resetPassword: (id: string, newPassword: string) =>
    adminFetch<{ message: string }>(`/api/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
  changeStatus: (id: string, status: string) =>
    adminFetch<{ message: string }>(`/api/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteUser: (id: string, reason?: string) =>
    adminFetch<{ message: string }>(`/api/admin/users/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
  restoreUser: (id: string) =>
    adminFetch<{ message: string }>(`/api/admin/users/${id}/restore`, { method: 'POST' }),
  forceLogout: (id: string) =>
    adminFetch<{ message: string }>(`/api/admin/users/${id}/force-logout`, { method: 'POST' }),

  // Audit Logs
  getAuditLogs: (params: { search?: string; action?: string; entityType?: string; actorId?: string; actorRole?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) =>
    adminFetch<{ logs: AuditLog[]; total: number; page: number; limit: number }>(`/api/admin/audit-logs${buildQuery(params as any)}`),
  getAuditFilters: () =>
    adminFetch<{ actions: string[]; entityTypes: string[]; actors: { id: string; name: string; role: string }[] }>('/api/admin/audit-logs/filters'),

  // Recovery
  getDeletedItems: (entityType: string, params?: { search?: string; page?: number; limit?: number }) =>
    adminFetch<{ items: any[]; total: number; page: number; limit: number; entityType: string }>(`/api/admin/recovery/${entityType}${buildQuery(params as any || {})}`),
  restoreItem: (entityType: string, id: string) =>
    adminFetch<{ message: string }>(`/api/admin/recovery/${entityType}/${id}/restore`, { method: 'POST' }),
  permanentDelete: (entityType: string, id: string) =>
    adminFetch<{ message: string }>(`/api/admin/recovery/${entityType}/${id}`, { method: 'DELETE' }),
  bulkRestore: (entityType: string, ids: string[]) =>
    adminFetch<{ message: string; count: number }>(`/api/admin/recovery/${entityType}/bulk-restore`, { method: 'POST', body: JSON.stringify({ ids }) }),

  // Health
  getHealth: () => adminFetch<SystemHealth>('/api/admin/health'),

  // Security
  getSecurityOverview: () => adminFetch<SecurityOverview>('/api/admin/security/overview'),
  getFailedLogins: (params?: { page?: number; limit?: number; dateFrom?: string; dateTo?: string }) =>
    adminFetch<{ logs: LoginHistoryEntry[]; total: number; page: number; limit: number }>(`/api/admin/security/failed-logins${buildQuery(params as any || {})}`),
  getActiveSessions: () => adminFetch<{ sessions: ActiveSession[] }>('/api/admin/security/sessions'),
  revokeSession: (id: string) => adminFetch<{ message: string }>(`/api/admin/security/sessions/${id}/revoke`, { method: 'POST' }),
  getLoginHistory: (params?: { userId?: string; page?: number; limit?: number }) =>
    adminFetch<{ logs: LoginHistoryEntry[]; total: number; page: number; limit: number }>(`/api/admin/security/login-history${buildQuery(params as any || {})}`),

  // Notifications
  getNotifications: (params?: { type?: string; severity?: string; isRead?: string; page?: number; limit?: number }) =>
    adminFetch<{ notifications: AdminNotification[]; total: number; unreadCount: number; page: number; limit: number }>(`/api/admin/notifications${buildQuery(params as any || {})}`),
  markNotificationRead: (id: string) => adminFetch<{ message: string }>(`/api/admin/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => adminFetch<{ message: string }>('/api/admin/notifications/mark-all-read', { method: 'POST' }),

  // Backups
  getBackups: (params?: { page?: number; limit?: number }) =>
    adminFetch<{ backups: BackupEntry[]; total: number; page: number; limit: number }>(`/api/admin/backups${buildQuery(params as any || {})}`),
  triggerBackup: () => adminFetch<{ message: string }>('/api/admin/backups/trigger', { method: 'POST' }),

  // AI Analytics
  getAIAnalytics: () => adminFetch<AIAnalytics>('/api/admin/ai/analytics'),

  // Queue
  getQueueStats: () => adminFetch<SystemHealth['queue']>('/api/admin/queue/stats'),
};
