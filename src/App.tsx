import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OnboardingGuard } from "@/components/auth/OnboardingGuard";
import { CompanyGuard } from "@/components/auth/CompanyGuard";
import { NoRoleGuard } from "@/components/auth/NoRoleGuard";
import { PermissionRoute } from "@/components/auth/PermissionRoute";
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
import CentrosFichas from "./pages/CentrosFichas";
import Jornadas from "./pages/Jornadas";
import Seguridad from "./pages/Seguridad";
import Configuracion from "./pages/Configuracion";
import Disciplinarios from "./pages/Disciplinarios";
import Vacaciones from "./pages/Vacaciones";
import Permisos from "./pages/Permisos";
import Novedades from "./pages/Novedades";
import Capacitaciones from "./pages/Capacitaciones";
import CrearCapacitacion from "./pages/capacitaciones/CrearCapacitacion";
import CrearManual from "./pages/capacitaciones/CrearManual";
import BibliotecaCapacitaciones from "./pages/capacitaciones/Biblioteca";
import GenerarAcceso from "./pages/capacitaciones/GenerarAcceso";
import EvidenciasCapacitaciones from "./pages/capacitaciones/Evidencias";
import AnaliticasCapacitaciones from "./pages/capacitaciones/Analiticas";
import CumplimientoCapacitaciones from "./pages/capacitaciones/Cumplimiento";
import AccesoPublico from "./pages/capacitaciones/AccesoPublico";
import DescargosPublico from "./pages/DescargosPublico";
import RegistroPublico from "./pages/RegistroPublico";
import Evaluaciones from "./pages/Evaluaciones";
import AnaliticasEvaluaciones from "./pages/evaluaciones/AnaliticasEvaluaciones";
import Organigrama from "./pages/Organigrama";
import Cesantias from "./pages/Cesantias";
import Calendario from "./pages/Calendario";
import Portal from "./pages/Portal";
import Reportes from "./pages/Reportes";
import Analitica from "./pages/Analitica";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import SelectCompany from "./pages/SelectCompany";
import Empleado360 from "./pages/Empleado360";
import SuperAdmin from "./pages/SuperAdmin";
import Requisiciones from "./pages/Requisiciones";
import Perfil from "./pages/Perfil";
import PreLiquidacion from "./pages/PreLiquidacion";
import ConfiguracionLaboral from "./pages/ConfiguracionLaboral";
import Prestamos from "./pages/Prestamos";
import Descuentos from "./pages/Descuentos";
import Install from "./pages/Install";
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
  CatalogosPlataformasPublicacion,
} from "./pages/catalogos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Helper to wrap a page with permission check
const P = ({ module, children }: { module: string; children: React.ReactNode }) => (
  <PermissionRoute moduleCode={module}>{children}</PermissionRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/capacitacion" element={<AccesoPublico />} />
            <Route path="/descargos" element={<DescargosPublico />} />
            <Route path="/registro" element={<RegistroPublico />} />
            <Route path="/install" element={<Install />} />
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
                    <CompanyGuard>
                    <NoRoleGuard>
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={<P module="dashboard"><Dashboard /></P>} />
                        <Route path="/empleados/:id/360" element={<P module="empleados"><Empleado360 /></P>} />
                        <Route path="/empleados" element={<P module="empleados"><Empleados /></P>} />
                        <Route path="/contratos" element={<P module="contratos"><Contratos /></P>} />
                        <Route path="/incapacidades" element={<P module="incapacidades"><Incapacidades /></P>} />
                        <Route path="/alertas" element={<P module="alertas"><Alertas /></P>} />
                        <Route path="/dotacion" element={<P module="dotacion"><Dotacion /></P>} />
                        <Route path="/examenes" element={<P module="examenes"><Examenes /></P>} />
                        <Route path="/seleccion" element={<P module="seleccion"><Seleccion /></P>} />
                        <Route path="/requisiciones" element={<P module="requisiciones"><Requisiciones /></P>} />
                        <Route path="/centros" element={<P module="centros"><Centros /></P>} />
                        <Route path="/centros/fichas" element={<P module="centros"><CentrosFichas /></P>} />
                        <Route path="/jornadas" element={<P module="jornadas"><Jornadas /></P>} />
                        <Route path="/disciplinarios" element={<P module="disciplinarios"><Disciplinarios /></P>} />
                        <Route path="/vacaciones" element={<P module="vacaciones"><Vacaciones /></P>} />
                        <Route path="/permisos" element={<P module="permisos"><Permisos /></P>} />
                        <Route path="/novedades" element={<P module="novedades"><Novedades /></P>} />
                        <Route path="/pre-liquidacion" element={<P module="pre_liquidacion"><PreLiquidacion /></P>} />
                        <Route path="/configuracion-laboral" element={<P module="config_laboral"><ConfiguracionLaboral /></P>} />
                        <Route path="/prestamos" element={<P module="prestamos"><Prestamos /></P>} />
                        <Route path="/descuentos" element={<P module="descuentos"><Descuentos /></P>} />
                        <Route path="/capacitaciones" element={<P module="capacitaciones"><Capacitaciones /></P>} />
                        <Route path="/capacitaciones/crear" element={<P module="capacitaciones"><CrearCapacitacion /></P>} />
                        <Route path="/capacitaciones/crear-manual" element={<P module="capacitaciones"><CrearManual /></P>} />
                        <Route path="/capacitaciones/biblioteca" element={<P module="capacitaciones"><BibliotecaCapacitaciones /></P>} />
                        <Route path="/capacitaciones/acceso/generar" element={<P module="capacitaciones"><GenerarAcceso /></P>} />
                        <Route path="/capacitaciones/evidencias" element={<P module="capacitaciones"><EvidenciasCapacitaciones /></P>} />
                        <Route path="/capacitaciones/analiticas" element={<P module="capacitaciones"><AnaliticasCapacitaciones /></P>} />
                        <Route path="/capacitaciones/cumplimiento" element={<P module="capacitaciones"><CumplimientoCapacitaciones /></P>} />
                        <Route path="/evaluaciones" element={<P module="evaluaciones"><Evaluaciones /></P>} />
                        <Route path="/evaluaciones/analiticas" element={<P module="evaluaciones"><AnaliticasEvaluaciones /></P>} />
                        <Route path="/organigrama" element={<P module="organigrama"><Organigrama /></P>} />
                        <Route path="/cesantias" element={<P module="cesantias"><Cesantias /></P>} />
                        <Route path="/calendario" element={<P module="calendario"><Calendario /></P>} />
                        <Route path="/reportes" element={<P module="reportes"><Reportes /></P>} />
                        <Route path="/analitica" element={<P module="analitica"><Analitica /></P>} />
                        <Route path="/catalogos/areas" element={<P module="catalogos"><CatalogosAreas /></P>} />
                        <Route path="/catalogos/cargos" element={<P module="catalogos"><CatalogosCargos /></P>} />
                        <Route path="/catalogos/tipos-dotacion" element={<P module="catalogos"><CatalogosTiposDotacion /></P>} />
                        <Route path="/catalogos/arl" element={<P module="catalogos"><CatalogosARL /></P>} />
                        <Route path="/catalogos/eps" element={<P module="catalogos"><CatalogosEPS /></P>} />
                        <Route path="/catalogos/afp" element={<P module="catalogos"><CatalogosAFP /></P>} />
                        <Route path="/catalogos/ccf" element={<P module="catalogos"><CatalogosCCF /></P>} />
                        <Route path="/catalogos/afc" element={<P module="catalogos"><CatalogosAFC /></P>} />
                        <Route path="/catalogos/ips" element={<P module="catalogos"><CatalogosIPS /></P>} />
                        <Route path="/catalogos/bancos" element={<P module="catalogos"><CatalogosBancos /></P>} />
                        <Route path="/catalogos/tipos-contrato" element={<P module="catalogos"><CatalogosTiposContrato /></P>} />
                        <Route path="/catalogos/festivos" element={<P module="catalogos"><CatalogosFestivos /></P>} />
                        <Route path="/catalogos/motivos-novedad" element={<P module="catalogos"><CatalogosMotivosNovedad /></P>} />
                        <Route path="/catalogos/plataformas-publicacion" element={<P module="catalogos"><CatalogosPlataformasPublicacion /></P>} />
                        <Route path="/perfil" element={<Perfil />} />
                        <Route path="/super-admin" element={<SuperAdmin />} />
                        <Route path="/seguridad" element={<P module="seguridad"><Seguridad /></P>} />
                        <Route path="/configuracion" element={<P module="configuracion"><Configuracion /></P>} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AppLayout>
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
