export type UserRole = "doctor" | "admin";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  email: string;
  bloodGroup: string;
  status: "Active" | "Inactive" | "Critical";
  lastVisit: string;
  registeredOn: string;
  address: string;
  allergies: string[];
  conditions: string[];
  medications: Medication[];
  notes?: string;
  dentalHistory?: {
    lastVisit: string;
    hygiene: string;
    history: string;
    tobacco: string;
  };
  chiefComplaint?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  type: "Checkup" | "Root Canal" | "Extraction" | "Orthodontics" | "Cosmetic" | "Consultation" | "Prosthodontics" | "Filling" | "Emergency" | "Follow-up" | "Pediatric" | "Implant" | string;
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
  reason: string;
  chairId?: string;
  estimatedDuration?: number; // minutes
  toothNumbers?: number[];
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  date: string;
  medicines: Medication[];
  notes: string;
  chiefComplaint?: string;
  diagnosis?: string;
  nextVisitDate?: string;
  treatmentPlan?: TreatmentPhase[];
}

export interface InvoiceLineItem {
  description: string;
  amount: number;
  toothNumber?: string;
}

export interface Procedure {
  id: string;
  name: string;
  price: number;
  createdAt?: string;
}

export interface Invoice {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  items: InvoiceLineItem[];
  total: number;
  paidAmount: number;
  status: "Paid" | "Pending" | "Overdue" | "Partially Paid";
  payments?: { date: string, amount: number }[];
}

export interface Doctor {
  id: string;
  name: string;
  department: string;
}

export interface DashboardStats {
  dailyPatients: number;
  revenue: number;
  profit: number;
  appointments: number;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
}

export interface VisitPoint {
  day: string;
  visits: number;
}

export interface DepartmentPoint {
  name: string;
  value: number;
  fill: string;
}

export interface PatientDiagnosis {
  id: string;
  patientId: string;
  name: string;
  icd10?: string;
  status: "Active" | "Resolved";
  recordedOn: string;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  ip?: string;
}

export interface PatientReport {
  id: string;
  patientId: string;
  title: string;
  type: "PDF" | "Image";
  date: string;
  previewUrl: string;
  notes?: string;
}



export interface MedicineCatalogItem {
  id: string;
  name: string;
  strength: string;
  form: string;
}

export interface MedicineSearchItem {
  id: string;
  brand_name: string;
  generic_name: string;
  strength: string;
  dosage_form: string;
  drug_category: string;
  indication: string;
  manufacturer: string;
  prescription_type: string;
  packaging: string;
  frequency?: string;
  duration?: string;
  is_saved?: boolean;
}

export interface PrescriptionTemplate {
  id: string;
  name: string;
  medicines: Medication[];
  notes?: string;
}

export interface DashboardResponse {
  stats: DashboardStats;
  revenueTrend: RevenuePoint[];
  patientVisits: VisitPoint[];
  departmentBreakdown: DepartmentPoint[];
  appointmentsToday: Appointment[];
}

export interface PatientDetailsResponse {
  patient: Patient;
  diagnoses: PatientDiagnosis[];
  reports: PatientReport[];
}

export interface BootstrapResponse {
  doctors: Doctor[];
  medicines: MedicineCatalogItem[];
  prescriptionTemplates: PrescriptionTemplate[];
}

// ── Dental-Specific Types ──────────────────────────────────────

export type ToothCondition =
  | "healthy"
  | "caries"
  | "filling"
  | "crown"
  | "root_canal"
  | "extraction"
  | "missing"
  | "implant"
  | "bridge"
  | "veneer"
  | "sealant";

export interface ToothRecord {
  toothNumber: number; // FDI notation 11-48
  condition: ToothCondition;
  notes?: string;
  date?: string;
}

export interface ToothChart {
  patientId: string;
  teeth: ToothRecord[];
  lastUpdated: string;
}

export type TreatmentPhaseStatus = "Planned" | "In Progress" | "Completed" | "Cancelled";

export interface TreatmentPhase {
  id: string;
  name: string;
  description: string;
  toothNumbers: number[];
  estimatedCost: number;
  status: TreatmentPhaseStatus;
  scheduledDate?: string;
  completedDate?: string;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  patientName: string;
  dentistName: string;
  createdDate: string;
  phases: TreatmentPhase[];
  totalCost: number;
  status: "Active" | "Completed" | "Cancelled";
  notes?: string;
}

export type ChairStatus = "Available" | "Occupied" | "Maintenance" | "Sterilizing";

export interface Chair {
  id: string;
  name: string;
  status: ChairStatus;
  currentPatientName?: string;
  currentDentistName?: string;
  currentProcedure?: string;
  estimatedFreeAt?: string;
}


export interface RecallEntry {
  id: string;
  patientId: string;
  patientName: string;
  lastVisit: string;
  recallDate: string;
  status: "Due" | "Overdue" | "Scheduled" | "Completed";
  type: "Routine Checkup" | "Orthodontic Review" | "Post-Procedure" | "Periodontal";
  notes?: string;
}
