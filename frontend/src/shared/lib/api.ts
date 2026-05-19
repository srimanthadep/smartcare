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
  TreatmentPlanTemplate,
  TreatmentPlan,
  TreatmentPhase,
  Expense,
  Doctor,
  RecallEntry,
  Procedure,
  PrescriptionTemplate,
  QueueStatsResponse,
  XRay,
  XRayStats,
} from "@/shared/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
export type BackupSettings = {
  enabled: boolean;
  intervalDays: number;
  startDate: string | null;
  lastBackupAt: string | null;
};

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (!options.skipAuth) {
    const token = localStorage.getItem("smartcare_token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

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
  
  updateProfile(payload: { name?: string; email?: string; avatar?: string }) {
    return apiFetch<{ message: string; user: User }>("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
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
    page?: number;
    limit?: number;
  }) {
    return apiFetch<{ patients: Patient[]; total: number; page: number; limit: number }>(`/api/patients${buildQuery(params as any)}`);
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

  getInvoices(patientId?: string) {
    const params = patientId ? { patientId } : {};
    return apiFetch<Invoice[]>(`/api/invoices${buildQuery(params)}`);
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

  async downloadInvoice(id: string) {
    const token = localStorage.getItem("smartcare_token");
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}/download`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error("Failed to download invoice");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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

  async downloadPrescription(id: string) {
    const token = localStorage.getItem("smartcare_token");
    const response = await fetch(`${API_BASE_URL}/api/prescriptions/${id}/download`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error("Failed to download prescription");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prescription_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
    return apiFetch<import("@/shared/types").MedicineSearchItem[]>(`/api/medicines/search${buildQuery({ q: query })}`);
  },

  generateAIPrescription(payload: Partial<Prescription>) {
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
  
  sendPrescriptionWhatsapp(id: string) {
    return apiFetch<{ message: string }>(`/api/prescriptions/${id}/send-whatsapp`, { method: "POST" });
  },

  chatWithAI(message: string, history: { role: string; content: string }[]) {
    return apiFetch<{ data: string }>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    });
  },

  generateAITreatmentPlan(findings: string) {
    return apiFetch<{ data: TreatmentPlanTemplate }>("/api/ai/generate-treatment-plan", {
      method: "POST",
      body: JSON.stringify({ findings }),
    });
  },

  refineClinicalNotes(rawNotes: string) {
    return apiFetch<{ data: string }>("/api/ai/refine-notes", {
      method: "POST",
      body: JSON.stringify({ rawNotes }),
    });
  },

  getTemplates() {
    return apiFetch<PrescriptionTemplate[]>("/api/prescription-templates");
  },

  createTemplate(payload: Partial<PrescriptionTemplate>) {
    return apiFetch<PrescriptionTemplate>("/api/prescription-templates", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateTemplate(id: string, payload: Partial<PrescriptionTemplate>) {
    return apiFetch<PrescriptionTemplate>(`/api/prescription-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteTemplate(id: string) {
    return apiFetch<void>(`/api/prescription-templates/${id}`, {
      method: "DELETE",
    });
  },

  getTreatmentPlanTemplates() {
    return apiFetch<TreatmentPlanTemplate[]>("/api/treatment-plan-templates");
  },

  createTreatmentPlanTemplate(payload: Partial<TreatmentPlanTemplate>) {
    return apiFetch<TreatmentPlanTemplate>("/api/treatment-plan-templates", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateTreatmentPlanTemplate(id: string, payload: Partial<TreatmentPlanTemplate>) {
    return apiFetch<TreatmentPlanTemplate>(`/api/treatment-plan-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteTreatmentPlanTemplate(id: string) {
    return apiFetch<void>(`/api/treatment-plan-templates/${id}`, {
      method: "DELETE",
    });
  },

  getProcedures() {
    return apiFetch<Procedure[]>("/api/procedures");
  },

  createProcedure(payload: Partial<Procedure>) {
    return apiFetch<Procedure>("/api/procedures", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateProcedure(id: string, payload: Partial<Procedure>) {
    return apiFetch<Procedure>(`/api/procedures/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteProcedure(id: string) {
    return apiFetch<{ message: string }>(`/api/procedures/${id}`, {
      method: "DELETE",
    });
  },

  getTreatmentPlans(patientId: string) {
    return apiFetch<TreatmentPlan[]>(`/api/treatment-plans${buildQuery({ patientId })}`);
  },

  createTreatmentPlan(payload: Partial<TreatmentPlan>) {
    return apiFetch<TreatmentPlan>("/api/treatment-plans", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateTreatmentPlan(id: string, payload: Partial<TreatmentPlan>) {
    return apiFetch<TreatmentPlan>(`/api/treatment-plans/${id}`, {
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

  sendInvoiceWhatsapp(id: string) {
    return apiFetch<{ message: string }>(`/api/invoices/${id}/send-whatsapp`, { method: "POST" });
  },

  getWhatsAppStatus() {
    return apiFetch<{ status: string; qr: string | null; hasSavedSession?: boolean }>("/api/whatsapp/status");
  },

  connectWhatsApp() {
    return apiFetch<{ message: string }>("/api/whatsapp/connect", { method: "POST" });
  },

  disconnectWhatsApp() {
    return apiFetch<{ message: string }>("/api/whatsapp/disconnect", { method: "POST" });
  },

  getEmailStatus() {
    return apiFetch<{ enabled: boolean }>("/api/email/status");
  },

  toggleEmailStatus(enabled: boolean) {
    return apiFetch<{ enabled: boolean }>("/api/email/toggle", { 
      method: "POST", 
      body: JSON.stringify({ enabled }) 
    });
  },

  getBackupSettings() {
    return apiFetch<BackupSettings>("/api/backup/settings");
  },

  updateBackupSettings(payload: Partial<Pick<BackupSettings, "enabled" | "intervalDays" | "startDate">>) {
    return apiFetch<BackupSettings>("/api/backup/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  getExpenses() {
    return apiFetch<Expense[]>("/api/expenses");
  },

  createExpense(payload: Partial<Expense>) {
    return apiFetch<Expense>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateExpense(id: string, payload: Partial<Expense>) {
    return apiFetch<Expense>(`/api/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteExpense(id: string) {
    return apiFetch<{ message: string }>(`/api/expenses/${id}`, {
      method: "DELETE",
    });
  },

  getDoctors() {
    return apiFetch<Doctor[]>("/api/doctors");
  },

  createDoctor(payload: Partial<Doctor>) {
    return apiFetch<Doctor>("/api/doctors", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateDoctor(id: string, payload: Partial<Doctor>) {
    return apiFetch<Doctor>(`/api/doctors/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteDoctor(id: string) {
    return apiFetch<{ message: string }>(`/api/doctors/${id}`, {
      method: "DELETE",
    });
  },

  getRecalls() {
    return apiFetch<RecallEntry[]>("/api/recalls");
  },
  createRecall(payload: Partial<RecallEntry>) {
    return apiFetch<RecallEntry>("/api/recalls", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateRecall(id: string, payload: Partial<RecallEntry>) {
    return apiFetch<RecallEntry>(`/api/recalls/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteRecall(id: string) {
    return apiFetch<void>(`/api/recalls/${id}`, {
      method: "DELETE",
    });
  },

  analyzeXray(id: string) {
    return apiFetch<XRay>(`/api/xrays/${id}/analyze`, { method: "POST" });
  },

  // ── Queue Dashboard API ──
  getQueueStats() {
    return apiFetch<QueueStatsResponse>("/api/queues/stats");
  },
  pauseQueue(name: string) {
    return apiFetch<{ message: string }>(`/api/queues/${name}/pause`, { method: "POST" });
  },
  resumeQueue(name: string) {
    return apiFetch<{ message: string }>(`/api/queues/${name}/resume`, { method: "POST" });
  },
  cleanQueue(name: string, status: string = 'completed') {
    return apiFetch<{ message: string, cleaned: number }>(`/api/queues/${name}/clean`, {
      method: "POST",
      body: JSON.stringify({ status, grace: 0 }),
    });
  },
  retryFailedJobs(name: string) {
    return apiFetch<{ message: string, retried: number }>(`/api/queues/${name}/retry-all`, { method: "POST" });
  },

  logout() {
    return apiFetch<{ message: string }>("/api/auth/logout", { method: "POST" });
  },

  // ── X-Ray Module API ──
  getXrays(params: {
    search?: string;
    type?: string;
    reviewed?: string;
    from?: string;
    to?: string;
    toothNumber?: string;
    patientId?: string;
    uploadedBy?: string;
    page?: string;
    limit?: string;
  } = {}) {
    return apiFetch<XRay[]>(`/api/xrays${buildQuery(params)}`);
  },

  getPatientXrays(patientId: string) {
    return apiFetch<XRay[]>(`/api/patients/${patientId}/xrays`);
  },

  getXrayStats() {
    return apiFetch<XRayStats>("/api/xrays/stats");
  },

  getXray(id: string) {
    return apiFetch<XRay>(`/api/xrays/${id}`);
  },

  async uploadXray(formData: FormData) {
    const token = localStorage.getItem("smartcare_token");
    const response = await fetch(`${API_BASE_URL}/api/xrays`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: formData,
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Upload failed");
    return data as XRay;
  },

  updateXray(id: string, payload: Partial<XRay>) {
    return apiFetch<XRay>(`/api/xrays/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  reviewXray(id: string, reviewed: boolean) {
    return apiFetch<XRay>(`/api/xrays/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify({ reviewed }),
    });
  },

  deleteXray(id: string) {
    return apiFetch<{ message: string }>(`/api/xrays/${id}`, {
      method: "DELETE",
    });
  },

  async downloadXray(url: string, filename: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to download x-ray");
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
  },

  async downloadXrayReport(id: string) {
    const token = localStorage.getItem("smartcare_token");
    const response = await fetch(`${API_BASE_URL}/api/xrays/${id}/download`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Failed to download report");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `XRay_Report_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  sendXrayWhatsapp(id: string) {
    return apiFetch<{ message: string }>(`/api/xrays/${id}/send-whatsapp`, { method: "POST" });
  },

  sendXrayEmail(id: string) {
    return apiFetch<{ message: string }>(`/api/xrays/${id}/send-email`, { method: "POST" });
  },

  // ── Public Booking API ──
  getPublicDoctors() {
    return apiFetch<Doctor[]>("/api/public/doctors", { skipAuth: true });
  },

  createPublicAppointment(payload: any) {
    return apiFetch<{ message: string; appointment: Appointment }>("/api/public/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },

  // ── Referral Management System API ──
  getReferralSources() {
    return apiFetch<any[]>("/api/referrals/sources");
  },

  createReferralSource(payload: any) {
    return apiFetch<any>("/api/referrals/sources", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateReferralSource(id: string, payload: any) {
    return apiFetch<any>(`/api/referrals/sources/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteReferralSource(id: string) {
    return apiFetch<{ message: string }>(`/api/referrals/sources/${id}`, {
      method: "DELETE",
    });
  },

  getPatientReferrals() {
    return apiFetch<any[]>("/api/referrals/patient-referrals");
  },

  createPatientReferral(payload: any) {
    return apiFetch<any>("/api/referrals/patient-referrals", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updatePatientReferral(id: string, payload: any) {
    return apiFetch<any>(`/api/referrals/patient-referrals/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deletePatientReferral(id: string) {
    return apiFetch<{ message: string }>(`/api/referrals/patient-referrals/${id}`, {
      method: "DELETE",
    });
  },

  getReferralCommissions() {
    return apiFetch<any[]>("/api/referrals/commissions");
  },

  updateReferralCommission(id: string, payload: any) {
    return apiFetch<any>(`/api/referrals/commissions/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  getReferralRewards() {
    return apiFetch<any[]>("/api/referrals/rewards");
  },

  redeemReferralReward(id: string) {
    return apiFetch<any>(`/api/referrals/rewards/${id}/redeem`, {
      method: "PUT",
    });
  },

  getReferralAnalytics() {
    return apiFetch<any>("/api/referrals/analytics");
  },

  getReferralActivities(id: string) {
    return apiFetch<any[]>(`/api/referrals/patient-referrals/${id}/activities`);
  },

  createReferralActivity(id: string, payload: any) {
    return apiFetch<any>(`/api/referrals/patient-referrals/${id}/activities`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getReferralNotes(id: string) {
    return apiFetch<any[]>(`/api/referrals/patient-referrals/${id}/notes`);
  },

  createReferralNote(id: string, content: string) {
    return apiFetch<any>(`/api/referrals/patient-referrals/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },
};
