import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OnboardingGuard } from "@/components/auth/OnboardingGuard";
import { CompanyGuard } from "@/components/auth/CompanyGuard";
import { NoRoleGuard } from "@/components/auth/NoRoleGuard";
import { PermissionRoute } from "@/components/auth/PermissionRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppUpdateNotifier } from "@/components/system/AppUpdateNotifier";
import { LocationPersister } from "@/components/auth/LocationPersister";
import Dashboard from "./pages/Dashboard";
import Empleados from "./pages/Empleados";
import Contratos from "./pages/Contratos";
import Incapacidades from "./pages/Incapacidades";
import CentroNotificaciones from "./pages/CentroNotificaciones";
import Chat from "./pages/Chat";
import Dotacion from "./pages/Dotacion";
import Examenes from "./pages/Examenes";
import Seleccion from "./pages/Seleccion";
import Centros from "./pages/Centros";
import CentrosFichas from "./pages/CentrosFichas";
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
import VerificarCertificado from "./pages/public/VerificarCertificado";
import Evaluaciones from "./pages/Evaluaciones";
import AnaliticasEvaluaciones from "./pages/evaluaciones/AnaliticasEvaluaciones";
import Organigrama from "./pages/Organigrama";
import Cesantias from "./pages/Cesantias";
import Calendario from "./pages/Calendario";
import Portal from "./pages/Portal";
import Reportes from "./pages/Reportes";
import Analitica from "./pages/Analitica";
import AsistenteIA from "./pages/AsistenteIA";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
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
import Catalogos from "./pages/Catalogos";
import Auditoria from "./pages/Auditoria";
import Automatizaciones from "./pages/Automatizaciones";
import CumplimientoLaboral from "./pages/CumplimientoLaboral";
import PilaUgpp from "./pages/PilaUgpp";
import { CATALOG_CHILD_PERMISSION_CODES, CATALOG_PERMISSION_CODES } from "@/lib/catalogPermissions";
import { TRAINING_PERMISSION_CODES } from "@/lib/trainingPermissions";
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
  CatalogosTiposIdentificacion,
  CatalogosNivelesEducativos,
  CatalogosProfessions,
} from "./pages/catalogos/index";
import NotFound from "./pages/NotFound";

import { JornadasSkeleton } from "@/components/schedules/JornadasSkeleton";

const AnaliticaSeleccion = lazy(() => import("./pages/AnaliticaSeleccion"));
const AnaliticaNomina = lazy(() => import("./pages/AnaliticaNomina"));
const AnaliticaIncapacidades = lazy(() => import("./pages/AnaliticaIncapacidades"));
const Jornadas = lazy(() => import("./pages/Jornadas"));

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

const PAny = ({ modules, children }: { modules: string[]; children: React.ReactNode }) => (
  <PermissionRoute moduleCode={modules[0]} anyModuleCodes={modules}>{children}</PermissionRoute>
);

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
            <Route path="/capacitacion" element={<AccesoPublico />} />
            <Route path="/descargos" element={<DescargosPublico />} />
            <Route path="/registro" element={<RegistroPublico />} />
            <Route path="/verificar-certificado/:token" element={<VerificarCertificado />} />
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
                    <NoRoleGuard>
                    <CompanyGuard>
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/empleados/:id/360" element={<P module="empleados"><Empleado360 /></P>} />
                        <Route path="/empleados" element={<P module="empleados"><Empleados /></P>} />
                        <Route path="/contratos" element={<P module="contratos"><Contratos /></P>} />
                        <Route path="/incapacidades" element={<P module="incapacidades"><Incapacidades /></P>} />
                        <Route path="/incapacidades/analitica" element={<P module="analitica_incapacidades"><Suspense fallback={null}><AnaliticaIncapacidades /></Suspense></P>} />
                        <Route path="/alertas" element={<P module="alertas"><Navigate to="/notificaciones" replace /></P>} />
                        <Route path="/notificaciones" element={<P module="alertas"><CentroNotificaciones /></P>} />
                        <Route path="/chat" element={<P module="chat"><Chat /></P>} />
                        <Route path="/dotacion" element={<P module="dotacion"><Dotacion /></P>} />
                        <Route path="/examenes" element={<P module="examenes"><Examenes /></P>} />
                        <Route path="/seleccion" element={<P module="seleccion"><Seleccion /></P>} />
                        <Route path="/seleccion/analitica" element={<P module="analitica_seleccion"><Suspense fallback={null}><AnaliticaSeleccion /></Suspense></P>} />
                        <Route path="/requisiciones" element={<P module="requisiciones"><Requisiciones /></P>} />
                        <Route path="/centros" element={<P module="centros"><Centros /></P>} />
                        <Route path="/centros/fichas" element={<P module="centros"><CentrosFichas /></P>} />
                        <Route path="/jornadas" element={<P module="jornadas"><Suspense fallback={<JornadasSkeleton />}><Jornadas /></Suspense></P>} />
                        <Route path="/nomina/analitica" element={<P module="analitica_nomina"><Suspense fallback={null}><AnaliticaNomina /></Suspense></P>} />
                        <Route path="/disciplinarios" element={<P module="disciplinarios"><Disciplinarios /></P>} />
                        <Route path="/vacaciones" element={<P module="vacaciones"><Vacaciones /></P>} />
                        <Route path="/permisos" element={<P module="permisos"><Permisos /></P>} />
                        <Route path="/novedades" element={<P module="novedades"><Novedades /></P>} />
                        <Route path="/pre-liquidacion" element={<P module="pre_liquidacion"><PreLiquidacion /></P>} />
                        <Route path="/configuracion-laboral" element={<P module="config_laboral"><ConfiguracionLaboral /></P>} />
                        <Route path="/prestamos" element={<P module="prestamos"><Prestamos /></P>} />
                        <Route path="/descuentos" element={<P module="descuentos"><Descuentos /></P>} />
                        <Route path="/capacitaciones" element={<P module={TRAINING_PERMISSION_CODES.dashboard}><Capacitaciones /></P>} />
                        <Route path="/capacitaciones/crear" element={<P module={TRAINING_PERMISSION_CODES.ai}><CrearCapacitacion /></P>} />
                        <Route path="/capacitaciones/crear-manual" element={<P module={TRAINING_PERMISSION_CODES.manual}><CrearManual /></P>} />
                        <Route path="/capacitaciones/biblioteca" element={<P module={TRAINING_PERMISSION_CODES.library}><BibliotecaCapacitaciones /></P>} />
                        <Route path="/capacitaciones/acceso/generar" element={<P module={TRAINING_PERMISSION_CODES.links}><GenerarAcceso /></P>} />
                        <Route path="/capacitaciones/evidencias" element={<P module={TRAINING_PERMISSION_CODES.evidence}><EvidenciasCapacitaciones /></P>} />
                        <Route path="/capacitaciones/analiticas" element={<P module={TRAINING_PERMISSION_CODES.analytics}><AnaliticasCapacitaciones /></P>} />
                        <Route path="/capacitaciones/cumplimiento" element={<P module={TRAINING_PERMISSION_CODES.compliance}><CumplimientoCapacitaciones /></P>} />
                        <Route path="/evaluaciones" element={<P module="evaluaciones"><Evaluaciones /></P>} />
                        <Route path="/evaluaciones/analiticas" element={<P module="analitica_evaluaciones"><AnaliticasEvaluaciones /></P>} />
                        <Route path="/organigrama" element={<P module="organigrama"><Organigrama /></P>} />
                        <Route path="/cesantias" element={<P module="cesantias"><Cesantias /></P>} />
                        <Route path="/calendario" element={<P module="calendario"><Calendario /></P>} />
                        <Route path="/reportes" element={<P module="reportes"><Reportes /></P>} />
                        <Route path="/analitica" element={<P module="analitica"><Analitica /></P>} />
                        <Route path="/asistente-ia" element={<P module="asistente_ia"><AsistenteIA /></P>} />
                        <Route path="/automatizaciones" element={<P module="automatizaciones"><Automatizaciones /></P>} />
                        <Route path="/cumplimiento-laboral" element={<P module="cumplimiento_laboral"><CumplimientoLaboral /></P>} />
                        <Route path="/pila-ugpp" element={<P module="pila_ugpp"><PilaUgpp /></P>} />
                        <Route path="/catalogos" element={<PAny modules={[CATALOG_PERMISSION_CODES.index, ...CATALOG_CHILD_PERMISSION_CODES]}><Catalogos /></PAny>} />
                        <Route path="/catalogos/areas" element={<P module={CATALOG_PERMISSION_CODES.areas}><CatalogosAreas /></P>} />
                        <Route path="/catalogos/cargos" element={<P module={CATALOG_PERMISSION_CODES.cargos}><CatalogosCargos /></P>} />
                        <Route path="/catalogos/tipos-dotacion" element={<P module={CATALOG_PERMISSION_CODES.tiposDotacion}><CatalogosTiposDotacion /></P>} />
                        <Route path="/catalogos/arl" element={<P module={CATALOG_PERMISSION_CODES.arl}><CatalogosARL /></P>} />
                        <Route path="/catalogos/eps" element={<P module={CATALOG_PERMISSION_CODES.eps}><CatalogosEPS /></P>} />
                        <Route path="/catalogos/afp" element={<P module={CATALOG_PERMISSION_CODES.afp}><CatalogosAFP /></P>} />
                        <Route path="/catalogos/ccf" element={<P module={CATALOG_PERMISSION_CODES.ccf}><CatalogosCCF /></P>} />
                        <Route path="/catalogos/afc" element={<P module={CATALOG_PERMISSION_CODES.afc}><CatalogosAFC /></P>} />
                        <Route path="/catalogos/ips" element={<P module={CATALOG_PERMISSION_CODES.ips}><CatalogosIPS /></P>} />
                        <Route path="/catalogos/bancos" element={<P module={CATALOG_PERMISSION_CODES.bancos}><CatalogosBancos /></P>} />
                        <Route path="/catalogos/tipos-contrato" element={<P module={CATALOG_PERMISSION_CODES.tiposContrato}><CatalogosTiposContrato /></P>} />
                        <Route path="/catalogos/festivos" element={<P module={CATALOG_PERMISSION_CODES.festivos}><CatalogosFestivos /></P>} />
                        <Route path="/catalogos/motivos-novedad" element={<P module={CATALOG_PERMISSION_CODES.motivosNovedad}><CatalogosMotivosNovedad /></P>} />
                        <Route path="/catalogos/plataformas-publicacion" element={<P module={CATALOG_PERMISSION_CODES.plataformasPublicacion}><CatalogosPlataformasPublicacion /></P>} />
                        <Route path="/catalogos/tipos-identificacion" element={<P module={CATALOG_PERMISSION_CODES.tiposIdentificacion}><CatalogosTiposIdentificacion /></P>} />
                        <Route path="/catalogos/niveles-educativos" element={<P module={CATALOG_PERMISSION_CODES.nivelesEducativos}><CatalogosNivelesEducativos /></P>} />
                        <Route path="/catalogos/profesiones" element={<P module={CATALOG_PERMISSION_CODES.profesiones}><CatalogosProfessions /></P>} />
                        <Route path="/perfil" element={<Perfil />} />
                        <Route path="/super-admin" element={<SuperAdmin />} />
                        <Route path="/seguridad" element={<P module="seguridad"><Seguridad /></P>} />
                        <Route path="/auditoria" element={<P module="auditoria"><Auditoria /></P>} />
                        <Route path="/configuracion" element={<P module="configuracion"><Configuracion /></P>} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AppLayout>
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
