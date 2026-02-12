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
import Incapacidades from "./pages/Incapacidades";
import Alertas from "./pages/Alertas";
import Dotacion from "./pages/Dotacion";
import Examenes from "./pages/Examenes";
import Seleccion from "./pages/Seleccion";
import Centros from "./pages/Centros";
import Jornadas from "./pages/Jornadas";
import Seguridad from "./pages/Seguridad";
import Configuracion from "./pages/Configuracion";
import Disciplinarios from "./pages/Disciplinarios";
import Vacaciones from "./pages/Vacaciones";
import Permisos from "./pages/Permisos";
import Novedades from "./pages/Novedades";
import Capacitaciones from "./pages/Capacitaciones";
import Evaluaciones from "./pages/Evaluaciones";
import Organigrama from "./pages/Organigrama";
import Cesantias from "./pages/Cesantias";
import Calendario from "./pages/Calendario";
import Portal from "./pages/Portal";
import Reportes from "./pages/Reportes";
import Analitica from "./pages/Analitica";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Empleado360 from "./pages/Empleado360";
import Requisiciones from "./pages/Requisiciones";
import Perfil from "./pages/Perfil";
import PreLiquidacion from "./pages/PreLiquidacion";
import ConfiguracionLaboral from "./pages/ConfiguracionLaboral";
import { 
  CatalogosAreas, 
  CatalogosCargos, 
  CatalogosTiposDotacion,
  CatalogosARL,
  CatalogosEPS,
  CatalogosAFP,
  CatalogosCCF,
  CatalogosAFC,
  CatalogosIPS,
  CatalogosBancos,
  CatalogosTiposContrato,
  CatalogosFestivos,
  CatalogosMotivosNovedad,
} from "./pages/catalogos";
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
            <Route path="/portal" element={
              <ProtectedRoute>
                <Portal />
              </ProtectedRoute>
            } />
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
                        <Route path="/empleados/:id/360" element={<Empleado360 />} />
                        <Route path="/empleados" element={<Empleados />} />
                        <Route path="/contratos" element={<Contratos />} />
                        <Route path="/incapacidades" element={<Incapacidades />} />
                        <Route path="/alertas" element={<Alertas />} />
                        <Route path="/dotacion" element={<Dotacion />} />
                        <Route path="/examenes" element={<Examenes />} />
                        <Route path="/seleccion" element={<Seleccion />} />
                        <Route path="/requisiciones" element={<Requisiciones />} />
                        <Route path="/centros" element={<Centros />} />
                        <Route path="/jornadas" element={<Jornadas />} />
                        <Route path="/disciplinarios" element={<Disciplinarios />} />
                        <Route path="/vacaciones" element={<Vacaciones />} />
                        <Route path="/permisos" element={<Permisos />} />
                        <Route path="/novedades" element={<Novedades />} />
                        <Route path="/pre-liquidacion" element={<PreLiquidacion />} />
                        <Route path="/configuracion-laboral" element={<ConfiguracionLaboral />} />
                        <Route path="/capacitaciones" element={<Capacitaciones />} />
                        <Route path="/evaluaciones" element={<Evaluaciones />} />
                        <Route path="/organigrama" element={<Organigrama />} />
                        <Route path="/cesantias" element={<Cesantias />} />
                        <Route path="/calendario" element={<Calendario />} />
                        <Route path="/reportes" element={<Reportes />} />
                        <Route path="/analitica" element={<Analitica />} />
                        <Route path="/catalogos/areas" element={<CatalogosAreas />} />
                        <Route path="/catalogos/cargos" element={<CatalogosCargos />} />
                        <Route path="/catalogos/tipos-dotacion" element={<CatalogosTiposDotacion />} />
                        <Route path="/catalogos/arl" element={<CatalogosARL />} />
                        <Route path="/catalogos/eps" element={<CatalogosEPS />} />
                        <Route path="/catalogos/afp" element={<CatalogosAFP />} />
                        <Route path="/catalogos/ccf" element={<CatalogosCCF />} />
                        <Route path="/catalogos/afc" element={<CatalogosAFC />} />
                        <Route path="/catalogos/ips" element={<CatalogosIPS />} />
                        <Route path="/catalogos/bancos" element={<CatalogosBancos />} />
                        <Route path="/catalogos/tipos-contrato" element={<CatalogosTiposContrato />} />
                        <Route path="/catalogos/festivos" element={<CatalogosFestivos />} />
                        <Route path="/catalogos/motivos-novedad" element={<CatalogosMotivosNovedad />} />
                        <Route path="/perfil" element={<Perfil />} />
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
