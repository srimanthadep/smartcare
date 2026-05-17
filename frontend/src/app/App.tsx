import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { Toaster } from "@/shared/ui/toaster";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { AuthProvider } from "@/shared/contexts/AuthContext";
import { ThemeProvider } from "@/shared/contexts/ThemeContext";
import { SocketProvider } from "@/shared/contexts/SocketContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import AppLayout from "@/app/components/AppLayout";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import Login from "@/modules/auth/Login";
import Signup from "@/modules/auth/Signup";
import Dashboard from "@/modules/dashboard/Dashboard";
import PatientList from "@/modules/patients/PatientList";
import PatientProfile from "@/modules/patients/PatientProfile";
import PatientRegistration from "@/modules/patients/PatientRegistration";
import PatientEdit from "@/modules/patients/PatientEdit";
import Appointments from "@/modules/appointments/Appointments";
import Prescriptions from "@/modules/prescriptions/Prescriptions";
import Billing from "@/modules/billing/Billing";
import Analytics from "@/modules/analytics/Analytics";
import Expenses from "@/modules/expenses/Expenses";
import Pharmacy from "@/modules/prescriptions/Pharmacy";
import AI from "@/modules/ai/AI";
import Notifications from "@/modules/notifications/Notifications";
import Settings from "@/modules/settings/Settings";
import RecallSystem from "@/modules/recalls/RecallSystem";
import ActivityLogs from "@/modules/analytics/ActivityLogs";
import XRays from "@/modules/xrays/XRays";
import NotFound from "@/app/NotFound";
import PublicLayout from "@/app/components/PublicLayout";
import PublicBooking from "@/modules/appointments/PublicBooking";
import DoctorPublicProfile from "@/modules/doctors/DoctorPublicProfile";
import InstallPromptBanner from "@/app/components/InstallPromptBanner";
import AdminProtectedRoute from "@/modules/admin/components/AdminProtectedRoute";
import AdminLayout from "@/modules/admin/components/AdminLayout";
import AdminDashboard from "@/modules/admin/pages/AdminDashboard";
import UserManagement from "@/modules/admin/pages/UserManagement";
import AuditLogs from "@/modules/admin/pages/AuditLogs";
import DeleteHistory from "@/modules/admin/pages/DeleteHistory";
import QueueMonitor from "@/modules/admin/pages/QueueMonitor";
import SystemHealth from "@/modules/admin/pages/SystemHealth";
import SecurityCenter from "@/modules/admin/pages/SecurityCenter";
import NotificationCenter from "@/modules/admin/pages/NotificationCenter";
import BackupCenter from "@/modules/admin/pages/BackupCenter";
import AIAnalytics from "@/modules/admin/pages/AIAnalytics";
import AdminSettings from "@/modules/admin/pages/AdminSettings";

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
