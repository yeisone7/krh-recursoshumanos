import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { applySelectionCatalogQueryDefaults } from "@/lib/selectionCatalogCache";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OnboardingGuard } from "@/components/auth/OnboardingGuard";
import { CompanyGuard } from "@/components/auth/CompanyGuard";
import { NoRoleGuard } from "@/components/auth/NoRoleGuard";
import { PermissionRoute } from "@/components/auth/PermissionRoute";
import { WorkspaceApp, WorkspaceOutlet } from "@/components/workspace/WorkspaceApp";
import { workspaceRoutes } from "@/routes/workspaceRoutes";
import { AppUpdateNotifier } from "@/components/system/AppUpdateNotifier";
import { LocationPersister } from "@/components/auth/LocationPersister";
import AccesoPublico from "./pages/capacitaciones/AccesoPublico";
import DescargosPublico from "./pages/DescargosPublico";
import RegistroPublico from "./pages/RegistroPublico";
import PublicLeaveRequest from "./pages/PublicLeaveRequest";
import VerificarCertificado from "./pages/public/VerificarCertificado";
import Portal from "./pages/Portal";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import ForcedPasswordChange from "./pages/ForcedPasswordChange";
import Onboarding from "./pages/Onboarding";
import SelectCompany from "./pages/SelectCompany";
import Install from "./pages/Install";


const TimeClockEntry = lazy(() => import("./pages/TimeClockEntry"));
const PublicTimeClock = lazy(() => import("./pages/PublicTimeClock"));
const TimeClockScreen = lazy(() => import("./pages/TimeClockScreen"));
const CopasstPublicVote = lazy(() => import("./pages/copasst/PublicVote"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

applySelectionCatalogQueryDefaults(queryClient);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <AppUpdateNotifier />
          <LocationPersister />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/change-password-required" element={
              <ProtectedRoute allowForcedPasswordChange>
                <ForcedPasswordChange />
              </ProtectedRoute>
            } />
            <Route path="/capacitacion" element={<AccesoPublico />} />
            <Route path="/capacitacion/grupo" element={<AccesoPublico groupMode />} />
            <Route path="/copasst/votar" element={<Suspense fallback={null}><CopasstPublicVote /></Suspense>} />
            <Route path="/descargos" element={<DescargosPublico />} />
            <Route path="/registro" element={<RegistroPublico />} />
            <Route path="/solicitud-permiso" element={<PublicLeaveRequest />} />
            <Route path="/asistencia/:token" element={<Suspense fallback={null}><PublicTimeClock /></Suspense>} />
            <Route path="/verificar-certificado/:token" element={<VerificarCertificado />} />
            <Route path="/install" element={<Install />} />
            <Route path="/portal" element={
              <ProtectedRoute>
                <Portal />
              </ProtectedRoute>
            } />
            <Route path="/marcar" element={
              <Suspense fallback={null}><TimeClockEntry /></Suspense>
            } />
            <Route path="/reloj-checador/pantalla/:pointId" element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <CompanyGuard>
                    <PermissionRoute moduleCode="reloj_checador" action="create">
                      <Suspense fallback={null}><TimeClockScreen /></Suspense>
                    </PermissionRoute>
                  </CompanyGuard>
                </OnboardingGuard>
              </ProtectedRoute>
            } />
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/select-company" element={
              <ProtectedRoute>
                <SelectCompany />
              </ProtectedRoute>
            } />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <OnboardingGuard>
                    <NoRoleGuard>
                    <CompanyGuard>
                    <WorkspaceApp routes={workspaceRoutes}>
                      <WorkspaceOutlet />
                    </WorkspaceApp>
                    </CompanyGuard>
                    </NoRoleGuard>
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
