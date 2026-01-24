import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OnboardingGuard } from "@/components/auth/OnboardingGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Empleados from "./pages/Empleados";
import Contratos from "./pages/Contratos";
import Alertas from "./pages/Alertas";
import Dotacion from "./pages/Dotacion";
import Examenes from "./pages/Examenes";
import Seleccion from "./pages/Seleccion";
import Vacantes from "./pages/Vacantes";
import Centros from "./pages/Centros";
import Jornadas from "./pages/Jornadas";
import Seguridad from "./pages/Seguridad";
import Configuracion from "./pages/Configuracion";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <OnboardingGuard>
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/empleados" element={<Empleados />} />
                        <Route path="/contratos" element={<Contratos />} />
                        <Route path="/alertas" element={<Alertas />} />
                        <Route path="/dotacion" element={<Dotacion />} />
                        <Route path="/examenes" element={<Examenes />} />
                        <Route path="/seleccion" element={<Seleccion />} />
                        <Route path="/vacantes" element={<Vacantes />} />
                        <Route path="/centros" element={<Centros />} />
                        <Route path="/jornadas" element={<Jornadas />} />
                        <Route path="/seguridad" element={<Seguridad />} />
                        <Route path="/configuracion" element={<Configuracion />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AppLayout>
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
