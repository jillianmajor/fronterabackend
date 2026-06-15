import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";

// Provider Portal
import ProviderDashboard from "./pages/provider/ProviderDashboard";
import ProviderAvailability from "./pages/provider/ProviderAvailability";
import ProviderSchedule from "./pages/provider/ProviderSchedule";
import ProviderTimesheet from "./pages/provider/ProviderTimesheet";
import ProviderForms from "./pages/provider/ProviderForms";
import ProviderContacts from "./pages/provider/ProviderContacts";
import ProviderFAQ from "./pages/provider/ProviderFAQ";
import ProviderSettings from "./pages/provider/ProviderSettings";
import ProviderHolidays from "./pages/provider/ProviderHolidays";
import ProviderNotifications from "./pages/provider/ProviderNotifications";

// Client Portal
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientSchedules from "./pages/client/ClientSchedules";
import ClientProviders from "./pages/client/ClientProviders";
// Removed: ClientBilling (Optum-specific portal, no billing tab)
import ClientContacts from "./pages/client/ClientContacts";


import ClientSettings from "./pages/client/ClientSettings";

// Corporate Portal
import CorporateDashboard from "./pages/corporate/CorporateDashboard";
import CorporateVendors from "./pages/corporate/CorporateVendors";
import CorporateCredentialing from "./pages/corporate/CorporateCredentialing";
import CorporateSettings from "./pages/corporate/CorporateSettings";
import CorporatePTOCalendar from "./pages/corporate/CorporatePTOCalendar";
import CorporateTimeOffReview from "./pages/corporate/CorporateTimeOffReview";
import CorporatePRNAvailability from "./pages/corporate/CorporatePRNAvailability";
import CorporateProviders from "./pages/corporate/CorporateProviders";
import CorporateOnboardProvider from "./pages/corporate/CorporateOnboardProvider";
import CorporateAvailabilityCalendar from "./pages/corporate/CorporateAvailabilityCalendar";
import CorporateAnnouncements from "./pages/corporate/CorporateAnnouncements";

// Public pages
import AcceptInvite from "./pages/AcceptInvite";

// Shared
import AnnouncementsPage from "./pages/shared/AnnouncementsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />

            {/* Provider Portal — provider_user only */}
            <Route path="/provider" element={<ProtectedRoute portalType="provider"><ProviderDashboard /></ProtectedRoute>} />
            <Route path="/provider/availability" element={<ProtectedRoute portalType="provider"><ProviderAvailability /></ProtectedRoute>} />
            <Route path="/provider/schedule" element={<ProtectedRoute portalType="provider"><ProviderSchedule /></ProtectedRoute>} />
            <Route path="/provider/timesheet" element={<ProtectedRoute portalType="provider"><ProviderTimesheet /></ProtectedRoute>} />
            <Route path="/provider/holidays" element={<ProtectedRoute portalType="provider"><ProviderHolidays /></ProtectedRoute>} />
            <Route path="/provider/notifications" element={<ProtectedRoute portalType="provider"><ProviderNotifications /></ProtectedRoute>} />
            <Route path="/provider/forms" element={<ProtectedRoute portalType="provider"><ProviderForms /></ProtectedRoute>} />
            <Route path="/provider/contacts" element={<ProtectedRoute portalType="provider"><ProviderContacts /></ProtectedRoute>} />
            <Route path="/provider/faq" element={<ProtectedRoute portalType="provider"><ProviderFAQ /></ProtectedRoute>} />
            <Route path="/provider/settings" element={<ProtectedRoute portalType="provider"><ProviderSettings /></ProtectedRoute>} />
            <Route path="/provider/announcements" element={<ProtectedRoute portalType="provider"><AnnouncementsPage portalType="provider" /></ProtectedRoute>} />

            {/* Client Portal — client_user only */}
            <Route path="/client" element={<ProtectedRoute portalType="client"><ClientDashboard /></ProtectedRoute>} />
            <Route path="/client/schedules" element={<ProtectedRoute portalType="client"><ClientSchedules /></ProtectedRoute>} />
            <Route path="/client/providers" element={<ProtectedRoute portalType="client"><ClientProviders /></ProtectedRoute>} />
            <Route path="/client/contacts" element={<ProtectedRoute portalType="client"><ClientContacts /></ProtectedRoute>} />
            
            
            <Route path="/client/settings" element={<ProtectedRoute portalType="client"><ClientSettings /></ProtectedRoute>} />
            <Route path="/client/announcements" element={<ProtectedRoute portalType="client"><AnnouncementsPage portalType="client" /></ProtectedRoute>} />

            {/* Corporate Portal — internal_staff + admin */}
            <Route path="/corporate" element={<ProtectedRoute portalType="corporate"><CorporateDashboard /></ProtectedRoute>} />
            <Route path="/corporate/providers" element={<ProtectedRoute portalType="corporate"><CorporateProviders /></ProtectedRoute>} />
            <Route path="/corporate/onboard" element={<ProtectedRoute portalType="corporate"><CorporateOnboardProvider /></ProtectedRoute>} />
            <Route path="/corporate/vendors" element={<ProtectedRoute portalType="corporate"><CorporateVendors /></ProtectedRoute>} />
            <Route path="/corporate/credentialing" element={<ProtectedRoute portalType="corporate"><CorporateCredentialing /></ProtectedRoute>} />
            
            <Route path="/corporate/pto-calendar" element={<ProtectedRoute portalType="corporate"><CorporatePTOCalendar /></ProtectedRoute>} />
            <Route path="/corporate/time-off" element={<ProtectedRoute portalType="corporate"><CorporateTimeOffReview /></ProtectedRoute>} />
            <Route path="/corporate/prn-availability" element={<ProtectedRoute portalType="corporate"><CorporatePRNAvailability /></ProtectedRoute>} />
            <Route path="/corporate/availability-calendar" element={<ProtectedRoute portalType="corporate"><CorporateAvailabilityCalendar /></ProtectedRoute>} />
            <Route path="/corporate/settings" element={<ProtectedRoute portalType="corporate"><CorporateSettings /></ProtectedRoute>} />
            <Route path="/corporate/announcements" element={<ProtectedRoute portalType="corporate"><CorporateAnnouncements /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
