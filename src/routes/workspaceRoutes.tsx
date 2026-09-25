import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import type { WorkspaceRoute } from "@/components/workspace/workspaceModel";
import Dashboard from "../pages/Dashboard";
import Empleados from "../pages/Empleados";
import ContactosEmpleados from "../pages/ContactosEmpleados";
import Contratos from "../pages/Contratos";
import Incapacidades from "../pages/Incapacidades";
import CentroNotificaciones from "../pages/CentroNotificaciones";
import Chat from "../pages/Chat";
import Dotacion from "../pages/Dotacion";
import Examenes from "../pages/Examenes";
import Seleccion from "../pages/Seleccion";
import Centros from "../pages/Centros";
import CentrosFichas from "../pages/CentrosFichas";
import Seguridad from "../pages/Seguridad";
import Configuracion from "../pages/Configuracion";
import Disciplinarios from "../pages/Disciplinarios";
import Vacaciones from "../pages/Vacaciones";
import Permisos from "../pages/Permisos";
import Novedades from "../pages/Novedades";
import Capacitaciones from "../pages/Capacitaciones";
import CrearCapacitacion from "../pages/capacitaciones/CrearCapacitacion";
import CrearManual from "../pages/capacitaciones/CrearManual";
import BibliotecaCapacitaciones from "../pages/capacitaciones/Biblioteca";
import GenerarAcceso from "../pages/capacitaciones/GenerarAcceso";
import EvidenciasCapacitaciones from "../pages/capacitaciones/Evidencias";
import AnaliticasCapacitaciones from "../pages/capacitaciones/Analiticas";
import CumplimientoCapacitaciones from "../pages/capacitaciones/Cumplimiento";
import GruposCapacitaciones from "../pages/capacitaciones/Grupos";
import Evaluaciones from "../pages/Evaluaciones";
import AnaliticasEvaluaciones from "../pages/evaluaciones/AnaliticasEvaluaciones";
import Organigrama from "../pages/Organigrama";
import Cesantias from "../pages/Cesantias";
import Calendario from "../pages/Calendario";
import Cumpleanos from "../pages/Cumpleanos";
import Reportes from "../pages/Reportes";
import Analitica from "../pages/Analitica";
import AsistenteIA from "../pages/AsistenteIA";
import Empleado360 from "../pages/Empleado360";
import SuperAdmin from "../pages/SuperAdmin";
import Requisiciones from "../pages/Requisiciones";
import ReferenciasLaborales from "../pages/seleccion/ReferenciasLaborales";
import ReferenciasAcademicas from "../pages/seleccion/ReferenciasAcademicas";
import ListaRosada from "../pages/seleccion/ListaRosada";
import InformacionVacantes from "../pages/seleccion/InformacionVacantes";
import InformacionExamenesMedicos from "../pages/seleccion/InformacionExamenesMedicos";
import Perfil from "../pages/Perfil";
import PreLiquidacion from "../pages/PreLiquidacion";
import ConfiguracionLaboral from "../pages/ConfiguracionLaboral";
import Prestamos from "../pages/Prestamos";
import Descuentos from "../pages/Descuentos";
import Catalogos from "../pages/Catalogos";
import Auditoria from "../pages/Auditoria";
import Automatizaciones from "../pages/Automatizaciones";
import CumplimientoLaboral from "../pages/CumplimientoLaboral";
import PilaUgpp from "../pages/PilaUgpp";
import { CATALOG_CHILD_PERMISSION_CODES, CATALOG_PERMISSION_CODES } from "@/lib/catalogPermissions";
import { TRAINING_PERMISSION_CODES } from "@/lib/trainingPermissions";
import { COPASST_PERMISSIONS } from "@/lib/copasst";
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
} from "../pages/catalogos/index";
import { JornadasSkeleton } from "@/components/schedules/JornadasSkeleton";
const RequisitionWorkflowSettings = lazy(() => import('../pages/RequisitionWorkflowSettings'));
const CortesControl = lazy(() => import('../pages/CortesControl'));
const PermisosCorreccion = lazy(() => import('../pages/PermisosCorreccion'));
const AnaliticaSeleccion = lazy(() => import("../pages/AnaliticaSeleccion"));
const AnaliticaNomina = lazy(() => import("../pages/AnaliticaNomina"));
const AnaliticaIncapacidades = lazy(() => import("../pages/AnaliticaIncapacidades"));
const AnaliticaContratos = lazy(() => import("../pages/AnaliticaContratos"));
const AnaliticaEmpleados = lazy(() => import("../pages/AnaliticaEmpleados"));
const AnaliticaDiversidad = lazy(() => import("../pages/AnaliticaDiversidad"));
const Jornadas = lazy(() => import("../pages/Jornadas"));
const RelojChecador = lazy(() => import("../pages/RelojChecador"));
const CopasstDashboard = lazy(() => import("../pages/copasst/Dashboard"));
const CopasstElections = lazy(() => import("../pages/copasst/Elections"));
const CopasstCompliance = lazy(() => import("../pages/copasst/Compliance"));
const CopasstAnalytics = lazy(() => import("../pages/copasst/Analytics"));

export const workspaceRoutes: WorkspaceRoute[] = [
  { path: "/", title: "Inicio", element: <Dashboard /> },
  { path: "/empleados/:id/360", title: "Empleado 360", permissions: ["empleados"], element: <Empleado360 /> },
  { path: "/empleados", title: "Empleados", permissions: ["empleados"], element: <Empleados /> },
  { path: "/empleados/contactos", title: "Contactos de empleados", permissions: ["empleados"], element: <ContactosEmpleados /> },
  { path: "/empleados/analitica", title: "Analítica · Empleados", permissions: ["analitica_empleados"], element: <Suspense fallback={null}><AnaliticaEmpleados /></Suspense> },
  { path: "/contratos", title: "Contratos", permissions: ["contratos"], element: <Contratos /> },
  { path: "/contratos/analitica", title: "Analítica · Contratos", permissions: ["analitica_contratos"], element: <Suspense fallback={null}><AnaliticaContratos /></Suspense> },
  { path: "/incapacidades", title: "Incapacidades", permissions: ["incapacidades"], element: <Incapacidades /> },
  { path: "/incapacidades/analitica", title: "Analítica · Incapacidades", permissions: ["analitica_incapacidades"], element: <Suspense fallback={null}><AnaliticaIncapacidades /></Suspense> },
  { path: "/alertas", title: "Alertas", permissions: ["alertas"], element: <Navigate to="/notificaciones" replace /> },
  { path: "/notificaciones", title: "Notificaciones", permissions: ["alertas"], element: <CentroNotificaciones /> },
  { path: "/chat", title: "Chat", permissions: ["chat"], element: <Chat /> },
  { path: "/dotacion", title: "Dotación", permissions: ["dotacion"], element: <Dotacion /> },
  { path: "/examenes", title: "Examenes", permissions: ["examenes"], element: <Examenes /> },
  { path: "/seleccion", title: "Selección", permissions: ["seleccion"], element: <Seleccion /> },
  { path: "/seleccion/analitica", title: "Analítica · Selección", permissions: ["analitica_seleccion"], element: <Suspense fallback={null}><AnaliticaSeleccion /></Suspense> },
  { path: "/seleccion/catalogos/referencias-laborales", title: "Referencias laborales", permissions: ["catalogos_seleccion_referencias_laborales"], element: <ReferenciasLaborales /> },
  { path: "/seleccion/catalogos/referencias-academicas", title: "Referencias académicas", permissions: ["catalogos_seleccion_referencias_academicas"], element: <ReferenciasAcademicas /> },
  { path: "/seleccion/catalogos/lista-rosada", title: "Lista rosada", permissions: ["catalogos_seleccion_lista_rosada"], element: <ListaRosada /> },
  { path: "/seleccion/catalogos/informacion-vacantes", title: "Información de vacantes", permissions: ["catalogos_seleccion_informacion_vacantes"], element: <InformacionVacantes /> },
  { path: "/seleccion/catalogos/informacion-examenes-medicos", title: "Información de exámenes médicos", permissions: ["catalogos_seleccion_informacion_examenes_medicos"], element: <InformacionExamenesMedicos /> },
  { path: "/requisiciones", title: "Requisiciones", permissions: ["requisiciones"], element: <Requisiciones /> },
  { path: "/centros", title: "Centros", permissions: ["centros"], element: <Centros /> },
  { path: "/centros/fichas", title: "Fichas · Centros", permissions: ["centros"], element: <CentrosFichas /> },
  { path: "/jornadas", title: "Reporte de Turnos", permissions: ["jornadas"], element: <Suspense fallback={<JornadasSkeleton />}><Jornadas /></Suspense> },
  { path: "/reloj-checador", title: "Reloj checador", permissions: ["reloj_checador"], element: <Suspense fallback={null}><RelojChecador /></Suspense> },
  { path: "/nomina/analitica", title: "Analítica · Nómina", permissions: ["analitica_nomina"], element: <Suspense fallback={null}><AnaliticaNomina /></Suspense> },
  { path: "/disciplinarios", title: "Disciplinarios", permissions: ["disciplinarios"], element: <Disciplinarios /> },
  { path: "/vacaciones", title: "Vacaciones", permissions: ["vacaciones"], element: <Vacaciones /> },
  { path: "/permisos", title: "Permisos", permissions: ["permisos"], element: <Permisos /> },
  { path: "/novedades", title: "Novedades", permissions: ["novedades"], element: <Novedades /> },
  { path: "/pre-liquidacion", title: "Preliquidación", permissions: ["pre_liquidacion"], element: <PreLiquidacion /> },
  { path: "/configuracion-laboral", title: "Configuración laboral", permissions: ["config_laboral"], element: <ConfiguracionLaboral /> },
  { path: "/cortes-control", title: "Cortes control", permissions: ["cortes_control"], element: <Suspense fallback={null}><CortesControl /></Suspense> },
  { path: "/cortes-control/permisos", title: "Permisos de corrección", element: <Suspense fallback={null}><PermisosCorreccion /></Suspense> },
  { path: "/prestamos", title: "Préstamos", permissions: ["prestamos"], element: <Prestamos /> },
  { path: "/descuentos", title: "Descuentos", permissions: ["descuentos"], element: <Descuentos /> },
  { path: "/capacitaciones", title: "Capacitaciones", permissions: [TRAINING_PERMISSION_CODES.dashboard], element: <Capacitaciones /> },
  { path: "/capacitaciones/crear", title: "Crear capacitación con IA", permissions: [TRAINING_PERMISSION_CODES.ai], element: <CrearCapacitacion /> },
  { path: "/capacitaciones/crear-manual", title: "Crear capacitación manual", permissions: [TRAINING_PERMISSION_CODES.manual], element: <CrearManual /> },
  { path: "/capacitaciones/biblioteca", title: "Biblioteca · Capacitaciones", permissions: [TRAINING_PERMISSION_CODES.library], element: <BibliotecaCapacitaciones /> },
  { path: "/capacitaciones/acceso/generar", title: "Enlaces de capacitación", permissions: [TRAINING_PERMISSION_CODES.links], element: <GenerarAcceso /> },
  { path: "/capacitaciones/evidencias", title: "Evidencias · Capacitaciones", permissions: [TRAINING_PERMISSION_CODES.evidence], element: <EvidenciasCapacitaciones /> },
  { path: "/capacitaciones/analiticas", title: "Analíticas · Capacitaciones", permissions: [TRAINING_PERMISSION_CODES.analytics], element: <AnaliticasCapacitaciones /> },
  { path: "/capacitaciones/cumplimiento", title: "Cumplimiento · Capacitaciones", permissions: [TRAINING_PERMISSION_CODES.compliance], element: <CumplimientoCapacitaciones /> },
  { path: "/capacitaciones/grupos", title: "Grupos · Capacitaciones", permissions: [TRAINING_PERMISSION_CODES.groups], element: <GruposCapacitaciones /> },
  { path: "/copasst", title: "COPASST", permissions: Object.values(COPASST_PERMISSIONS), element: <Suspense fallback={null}><CopasstDashboard /></Suspense> },
  { path: "/copasst/elecciones", title: "Elecciones · COPASST", permissions: [COPASST_PERMISSIONS.elections], element: <Suspense fallback={null}><CopasstElections /></Suspense> },
  { path: "/copasst/cumplimiento", title: "Cumplimiento · COPASST", permissions: [COPASST_PERMISSIONS.compliance], element: <Suspense fallback={null}><CopasstCompliance /></Suspense> },
  { path: "/copasst/analitica", title: "Analítica · COPASST", permissions: [COPASST_PERMISSIONS.analytics], element: <Suspense fallback={null}><CopasstAnalytics /></Suspense> },
  { path: "/evaluaciones", title: "Evaluaciones", permissions: ["evaluaciones"], element: <Evaluaciones /> },
  { path: "/evaluaciones/analiticas", title: "Analíticas · Evaluaciones", permissions: ["analitica_evaluaciones"], element: <AnaliticasEvaluaciones /> },
  { path: "/organigrama", title: "Organigrama", permissions: ["organigrama"], element: <Organigrama /> },
  { path: "/cesantias", title: "Cesantías", permissions: ["cesantias"], element: <Cesantias /> },
  { path: "/calendario", title: "Calendario", permissions: ["calendario"], element: <Calendario /> },
  { path: "/cumpleanos", title: "Cumpleaños", permissions: ["reportes"], element: <Cumpleanos /> },
  { path: "/reportes", title: "Reportes", permissions: ["reportes"], element: <Reportes /> },
  { path: "/analitica", title: "Analítica", permissions: ["analitica"], element: <Analitica /> },
  { path: "/analitica/diversidad", title: "Diversidad", permissions: ["analitica"], element: <Suspense fallback={null}><AnaliticaDiversidad /></Suspense> },
  { path: "/asistente-ia", title: "Asistente IA", permissions: ["asistente_ia"], element: <AsistenteIA /> },
  { path: "/automatizaciones", title: "Automatizaciones", permissions: ["automatizaciones"], element: <Automatizaciones /> },
  { path: "/cumplimiento-laboral", title: "Cumplimiento laboral", permissions: ["cumplimiento_laboral"], element: <CumplimientoLaboral /> },
  { path: "/pila-ugpp", title: "PILA / UGPP", permissions: ["pila_ugpp"], element: <PilaUgpp /> },
  { path: "/catalogos", title: "Catálogos", permissions: [CATALOG_PERMISSION_CODES.index, ...CATALOG_CHILD_PERMISSION_CODES], element: <Catalogos /> },
  { path: "/catalogos/areas", title: "Areas", permissions: [CATALOG_PERMISSION_CODES.areas], element: <CatalogosAreas /> },
  { path: "/catalogos/cargos", title: "Cargos", permissions: [CATALOG_PERMISSION_CODES.cargos], element: <CatalogosCargos /> },
  { path: "/catalogos/tipos-dotacion", title: "Tipos de dotación", permissions: [CATALOG_PERMISSION_CODES.tiposDotacion], element: <CatalogosTiposDotacion /> },
  { path: "/catalogos/arl", title: "ARL", permissions: [CATALOG_PERMISSION_CODES.arl], element: <CatalogosARL /> },
  { path: "/catalogos/eps", title: "EPS", permissions: [CATALOG_PERMISSION_CODES.eps], element: <CatalogosEPS /> },
  { path: "/catalogos/afp", title: "AFP", permissions: [CATALOG_PERMISSION_CODES.afp], element: <CatalogosAFP /> },
  { path: "/catalogos/ccf", title: "CCF", permissions: [CATALOG_PERMISSION_CODES.ccf], element: <CatalogosCCF /> },
  { path: "/catalogos/afc", title: "AFC", permissions: [CATALOG_PERMISSION_CODES.afc], element: <CatalogosAFC /> },
  { path: "/catalogos/ips", title: "IPS", permissions: [CATALOG_PERMISSION_CODES.ips], element: <CatalogosIPS /> },
  { path: "/catalogos/bancos", title: "Bancos", permissions: [CATALOG_PERMISSION_CODES.bancos], element: <CatalogosBancos /> },
  { path: "/catalogos/tipos-contrato", title: "Tipos contrato", permissions: [CATALOG_PERMISSION_CODES.tiposContrato], element: <CatalogosTiposContrato /> },
  { path: "/catalogos/festivos", title: "Festivos", permissions: [CATALOG_PERMISSION_CODES.festivos], element: <CatalogosFestivos /> },
  { path: "/catalogos/motivos-novedad", title: "Motivos novedad", permissions: [CATALOG_PERMISSION_CODES.motivosNovedad], element: <CatalogosMotivosNovedad /> },
  { path: "/catalogos/plataformas-publicacion", title: "Plataformas publicacion", permissions: [CATALOG_PERMISSION_CODES.plataformasPublicacion], element: <CatalogosPlataformasPublicacion /> },
  { path: "/catalogos/tipos-identificacion", title: "Tipos de identificación", permissions: [CATALOG_PERMISSION_CODES.tiposIdentificacion], element: <CatalogosTiposIdentificacion /> },
  { path: "/catalogos/niveles-educativos", title: "Niveles educativos", permissions: [CATALOG_PERMISSION_CODES.nivelesEducativos], element: <CatalogosNivelesEducativos /> },
  { path: "/catalogos/profesiones", title: "Profesiones", permissions: [CATALOG_PERMISSION_CODES.profesiones], element: <CatalogosProfessions /> },
  { path: "/perfil", title: "Perfil", element: <Perfil /> },
  { path: "/super-admin", title: "Super Admin", element: <SuperAdmin /> },
  { path: "/seguridad", title: "Seguridad", permissions: ["seguridad"], element: <Seguridad /> },
  { path: "/auditoria", title: "Auditoría", permissions: ["auditoria"], element: <Auditoria /> },
  { path: "/configuracion", title: "Configuración", permissions: ["configuracion"], element: <Configuracion /> },
  { path: "/configuracion/requisiciones", title: "Flujo de requisiciones", permissions: ["req_workflow_config"], action: "update", element: <Suspense fallback={null}><RequisitionWorkflowSettings /></Suspense> },
];
