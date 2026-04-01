import {
  Appointment,
  BootstrapResponse,
  DashboardResponse,
  Invoice,
  Patient,
  PatientDetailsResponse,
  Prescription,
  User,
  UserRole,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const AUTH_STORAGE_KEY = "smartdental_auth_token";

export function getAuthToken() {
  return sessionStorage.getItem(AUTH_STORAGE_KEY);
}

export function setAuthToken(token: string) {
  sessionStorage.setItem(AUTH_STORAGE_KEY, token);
}

export function clearAuthToken() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (!options.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data as T;
}

function buildQuery(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const api = {
  login(payload: { email: string; password: string; role: UserRole }) {
    return apiFetch<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },
  
  register(payload: { name: string; email: string; password: string; role: UserRole }) {
    return apiFetch<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },

  me() {
    return apiFetch<{ user: User }>("/api/auth/me");
  },

  getDashboard() {
    return apiFetch<DashboardResponse>("/api/dashboard");
  },

  getBootstrap() {
    return apiFetch<BootstrapResponse>("/api/bootstrap");
  },

  getPatients(params: {
    search?: string;
    status?: string;
    gender?: string;
    from?: string;
    to?: string;
  }) {
    return apiFetch<Patient[]>(`/api/patients${buildQuery(params)}`);
  },

  getPatient(id: string) {
    return apiFetch<PatientDetailsResponse>(`/api/patients/${id}`);
  },

  createPatient(payload: Partial<Patient>) {
    return apiFetch<Patient>("/api/patients", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updatePatient(id: string, payload: Partial<Patient>) {
    return apiFetch<Patient>(`/api/patients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  getAppointments(params: { date?: string; type?: string } = {}) {
    return apiFetch<Appointment[]>(`/api/appointments${buildQuery(params)}`);
  },

  createAppointment(payload: Partial<Appointment>) {
    return apiFetch<Appointment>("/api/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateAppointment(id: string, payload: Partial<Appointment>) {
    return apiFetch<Appointment>(`/api/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  getInvoices() {
    return apiFetch<Invoice[]>("/api/invoices");
  },

  createInvoice(payload: Partial<Invoice>) {
    return apiFetch<Invoice>("/api/invoices", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateInvoice(id: string, payload: Partial<Invoice>) {
    return apiFetch<Invoice>(`/api/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteInvoice(id: string) {
    return apiFetch<void>(`/api/invoices/${id}`, {
      method: "DELETE",
    });
  },

  getPrescriptions(patientId?: string) {
    return apiFetch<Prescription[]>(`/api/prescriptions${buildQuery({ patientId })}`);
  },

  createPrescription(payload: Partial<Prescription>) {
    return apiFetch<Prescription>("/api/prescriptions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
