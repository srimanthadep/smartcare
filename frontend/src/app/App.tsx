import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { Toaster } from "@/shared/ui/toaster";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { AuthProvider } from "@/shared/contexts/AuthContext";
import { ThemeProvider } from "@/shared/contexts/ThemeContext";
import { SocketProvider } from "@/shared/contexts/SocketContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import AppLayout from "@/app/components/AppLayout";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import PublicLayout from "@/app/components/PublicLayout";
import InstallPromptBanner from "@/app/components/InstallPromptBanner";
import AdminProtectedRoute from "@/modules/admin/components/AdminProtectedRoute";
import AdminLayout from "@/modules/admin/components/AdminLayout";

// Lazy-loaded Components for On-Demand Bundle Fetching
const Login = lazy(() => import("@/modules/auth/Login"));
const Signup = lazy(() => import("@/modules/auth/Signup"));
const Dashboard = lazy(() => import("@/modules/dashboard/Dashboard"));
const PatientList = lazy(() => import("@/modules/patients/PatientList"));
const PatientProfile = lazy(() => import("@/modules/patients/PatientProfile"));
const PatientRegistration = lazy(() => import("@/modules/patients/PatientRegistration"));
const PatientEdit = lazy(() => import("@/modules/patients/PatientEdit"));
const Appointments = lazy(() => import("@/modules/appointments/Appointments"));
const Prescriptions = lazy(() => import("@/modules/prescriptions/Prescriptions"));
const Billing = lazy(() => import("@/modules/billing/Billing"));
const Analytics = lazy(() => import("@/modules/analytics/Analytics"));
const Expenses = lazy(() => import("@/modules/expenses/Expenses"));
const Pharmacy = lazy(() => import("@/modules/prescriptions/Pharmacy"));
const AI = lazy(() => import("@/modules/ai/AI"));
const Notifications = lazy(() => import("@/modules/notifications/Notifications"));
const Settings = lazy(() => import("@/modules/settings/Settings"));
const RecallSystem = lazy(() => import("@/modules/recalls/RecallSystem"));
const ActivityLogs = lazy(() => import("@/modules/analytics/ActivityLogs"));
const XRays = lazy(() => import("@/modules/xrays/XRays"));
const NotFound = lazy(() => import("@/app/NotFound"));
const PublicBooking = lazy(() => import("@/modules/appointments/PublicBooking"));
const DoctorPublicProfile = lazy(() => import("@/modules/doctors/DoctorPublicProfile"));
const AdminDashboard = lazy(() => import("@/modules/admin/pages/AdminDashboard"));
const UserManagement = lazy(() => import("@/modules/admin/pages/UserManagement"));
const AuditLogs = lazy(() => import("@/modules/admin/pages/AuditLogs"));
const DeleteHistory = lazy(() => import("@/modules/admin/pages/DeleteHistory"));
const QueueMonitor = lazy(() => import("@/modules/admin/pages/QueueMonitor"));
const SystemHealth = lazy(() => import("@/modules/admin/pages/SystemHealth"));
const SecurityCenter = lazy(() => import("@/modules/admin/pages/SecurityCenter"));
const NotificationCenter = lazy(() => import("@/modules/admin/pages/NotificationCenter"));
const BackupCenter = lazy(() => import("@/modules/admin/pages/BackupCenter"));
const AIAnalytics = lazy(() => import("@/modules/admin/pages/AIAnalytics"));
const AdminSettings = lazy(() => import("@/modules/admin/pages/AdminSettings"));

// Premium backdrop-blurred fallback loading screen
const LoadingScreen = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-slate-950/20 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="text-sm font-medium text-slate-400">Loading SmartCare...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data stays "fresh" for 5 minutes
      gcTime: 1000 * 60 * 15,    // Cache stays in memory for 15 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route element={<PublicLayout />}>
                  <Route path="/book" element={<PublicBooking />} />
                  <Route path="/doctors/:id" element={<DoctorPublicProfile />} />
                </Route>
                <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="patients" element={<PatientList />} />
                  <Route path="patients/new" element={<PatientRegistration />} />
                  <Route path="patients/:id" element={<PatientProfile />} />
                  <Route path="patients/edit/:id" element={<PatientEdit />} />
                  <Route path="appointments" element={<Appointments />} />
                  <Route path="prescriptions" element={<Prescriptions />} />
                  <Route path="billing" element={<Billing />} />
                  <Route path="pharmacy" element={<Pharmacy />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="recalls" element={<RecallSystem />} />
                  <Route path="xrays" element={<XRays />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="ai" element={<AI />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="logs" element={<ActivityLogs />} />
                  <Route path="delete-history" element={<DeleteHistory />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
                <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<UserManagement />} />
                  <Route path="audit-logs" element={<AuditLogs />} />
                  <Route path="delete-history" element={<DeleteHistory />} />
                  <Route path="queue" element={<QueueMonitor />} />
                  <Route path="health" element={<SystemHealth />} />
                  <Route path="security" element={<SecurityCenter />} />
                  <Route path="notifications" element={<NotificationCenter />} />
                  <Route path="backups" element={<BackupCenter />} />
                  <Route path="ai-analytics" element={<AIAnalytics />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <InstallPromptBanner />
          </BrowserRouter>
          </TooltipProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
