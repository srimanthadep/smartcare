// ── Admin Panel Types ─────────────────────────────────────────────────────────

export type AdminUserRole = 'admin' | 'doctor' | 'receptionist';

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: AdminUserRole;
  avatar: string;
  status: 'active' | 'suspended';
  lastLoginAt: string | null;
  createdAt: string;
  activeSessions: number;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  patientId: string | null;
  patientName: string | null;
  metadata: Record<string, unknown>;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface BackupEntry {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  fileName: string | null;
  fileSize: number | null;
  triggeredBy: string;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string | null;
  username: string;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: { browser: string; platform: string };
  failureReason: string | null;
  createdAt: string;
}

export interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  username: string;
  role: string;
  ipAddress: string | null;
  deviceInfo: { browser: string; platform: string };
  createdAt: string;
  lastActiveAt: string;
}

export interface AIUsageEntry {
  id: string;
  userId: string;
  userName: string;
  tool: string;
  tokensUsed: number;
  estimatedCost: number;
  responseTimeMs: number;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export interface SystemHealth {
  status: string;
  timestamp: string;
  database: {
    status: string;
    responseTimeMs: number;
    pool: { totalConnections: number; idleConnections: number; waitingClients: number };
  };
  supabase: {
    status: string;
    databaseSize: string;
    activeConnections: number;
    tables: {
      patients: number;
      invoices: number;
      appointments: number;
      prescriptions: number;
      auditLogs: number;
    };
  };
  render: {
    isRender: boolean;
    serviceName: string;
    serviceId: string;
    instanceId: string;
    externalUrl: string;
    region: string;
    memoryLimitBytes: number;
    memoryUsageBytes: number;
    memoryUsagePercent: string;
  };
  system: {
    platform: string;
    uptime: number;
    loadAverage: { '1m': string; '5m': string; '15m': string };
    memory: { total: number; free: number; used: number; usagePercent: string };
    cpu: { cores: number; model: string };
  };
  process: {
    uptime: number;
    uptimeFormatted: string;
    memory: { rss: number; heapTotal: number; heapUsed: number; external: number };
    nodeVersion: string;
  };
  queue: {
    pending: number;
    active: number;
    completed: number;
    failed: number;
    concurrencyLimit: number;
    recentCompleted: { id: string; name: string; duration: number; finishedOn: number }[];
    recentFailed: { id: string; name: string; duration: number; failedReason: string; finishedOn: number }[];
  };
}

export interface AdminDashboardData {
  users: { total: number; active: number; activeToday: number };
  patients: number;
  invoices: { total: number; revenue: number; paid: number; pending: number };
  appointmentsToday: number;
  auditLogsTotal: number;
  unreadNotifications: number;
  activeSessions: number;
  deletedItems: Record<string, number>;
  recentActivity: AuditLog[];
}

export interface SecurityOverview {
  failedLoginsToday: number;
  failedLoginsWeek: number;
  activeSessions: number;
  suspiciousIPs: { ip: string; attempts: number }[];
}

export interface AIAnalytics {
  totalRequests: number;
  requestsToday: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  toolBreakdown: { tool: string; count: number; tokens: number; cost: number }[];
  dailyTrend: { day: string; requests: number; tokens: number }[];
  recentRequests: AIUsageEntry[];
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  items?: T[];
}
