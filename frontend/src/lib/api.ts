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
  ActivityLog,
  ToothChart,
  ToothRecord,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include", // Ensure cookies are sent and received
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
  login(payload: { username: string; password: string; role: UserRole }) {
    return apiFetch<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },
  
  register(payload: { name: string; email: string; username: string; password: string; role: UserRole }) {
    return apiFetch<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },

  me() {
    return apiFetch<{ user: User }>("/api/auth/me");
  },

  getDashboard(period?: string) {
    return apiFetch<DashboardResponse>(`/api/dashboard${buildQuery({ period })}`);
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
  
  deletePatient(id: string) {
    return apiFetch<{ message: string }>(`/api/patients/${id}`, {
      method: "DELETE",
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

  updatePrescription(id: string, payload: Partial<Prescription>) {
    return apiFetch<Prescription>(`/api/prescriptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deletePrescription(id: string) {
    return apiFetch<{ message: string }>(`/api/prescriptions/${id}`, {
      method: "DELETE",
    });
  },
  
  getActivityLogs() {
    return apiFetch<ActivityLog[]>("/api/activity-logs");
  },

  getDentalChart(patientId: string) {
    return apiFetch<ToothChart>(`/api/dental-chart/${patientId}`);
  },

  updateDentalChart(patientId: string, teeth: ToothRecord[]) {
    return apiFetch<ToothChart>(`/api/dental-chart/${patientId}`, {
      method: "POST",
      body: JSON.stringify({ teeth }),
    });
  },

  searchMedicines(query: string) {
    return apiFetch<{ data: import("@/types").MedicineSearchItem[] }>(`/api/medicines/search${buildQuery({ q: query })}`);
  },

  generateAIPrescription(payload: any) {
    return apiFetch<{ data: Prescription }>("/api/ai/generate-prescription", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  sendWelcomeEmail(id: string) {
    return apiFetch<{ message: string }>(`/api/patients/${id}/send-welcome`, { method: "POST" });
  },

  sendPrescriptionEmail(id: string) {
    return apiFetch<{ message: string }>(`/api/prescriptions/${id}/send-email`, { method: "POST" });
  },

  chatWithAI(message: string, history: { role: string; content: string }[]) {
    return apiFetch<{ data: string }>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    });
  },

  getTemplates() {
    return apiFetch<{ data: any[] }>("/api/prescription-templates");
  },

  createTemplate(payload: any) {
    return apiFetch<{ data: any }>("/api/prescription-templates", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateTemplate(id: string, payload: any) {
    return apiFetch<{ data: any }>(`/api/prescription-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteTemplate(id: string) {
    return apiFetch<void>(`/api/prescription-templates/${id}`, {
      method: "DELETE",
    });
  },

  getTreatmentPlans(patientId: string) {
    return apiFetch<any[]>(`/api/treatment-plans${buildQuery({ patientId })}`);
  },

  createTreatmentPlan(payload: any) {
    return apiFetch<any>("/api/treatment-plans", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateTreatmentPlan(id: string, payload: any) {
    return apiFetch<any>(`/api/treatment-plans/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteTreatmentPlan(id: string) {
    return apiFetch<void>(`/api/treatment-plans/${id}`, {
      method: "DELETE",
    });
  },

  sendInvoiceEmail(id: string) {
    return apiFetch<{ message: string }>(`/api/invoices/${id}/send-email`, { method: "POST" });
  },
};
