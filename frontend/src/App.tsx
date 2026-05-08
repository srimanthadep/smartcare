import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import PatientList from "@/pages/PatientList";
import PatientProfile from "@/pages/PatientProfile";
import PatientRegistration from "@/pages/PatientRegistration";
import PatientEdit from "@/pages/PatientEdit";
import Appointments from "@/pages/Appointments";
import Prescriptions from "@/pages/Prescriptions";
import Billing from "@/pages/Billing";
import Analytics from "@/pages/Analytics";
import Pharmacy from "@/pages/Pharmacy";
import AI from "@/pages/AI";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import RecallSystem from "@/pages/RecallSystem";
import ActivityLogs from "@/pages/ActivityLogs";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFound from "@/pages/NotFound";
import PublicLayout from "@/components/PublicLayout";
import PublicBooking from "@/pages/PublicBooking";
import DoctorPublicProfile from "@/pages/DoctorPublicProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
                <Route path="recalls" element={<RecallSystem />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="ai" element={<AI />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="logs" element={<ActivityLogs />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
