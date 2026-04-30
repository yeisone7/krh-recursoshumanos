import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserManualDialog } from '@/components/manual/UserManualDialog';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies, useCompany } from '@/hooks/useCompanies';
import { useUnifiedAlerts } from '@/hooks/useUnifiedAlerts';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger } from
'@/components/ui/tooltip';
import {
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
  Bell,
  ShieldCheck,
  Building2,
  UserSearch,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Stethoscope,
  Package,
  LogOut,
  HeartPulse,
  Gavel,
  Palmtree,
  ClipboardList,
  Clock,
  GraduationCap,
  Target,
  Network,
  Landmark,
  FileBarChart,
  BarChart3,
  Calculator,
  FolderOpen,
  Shirt,
  Check,
  Sparkles,
  PenLine,
  Library,
  BookOpen,
  Link2,
  FileSignature,
  ClipboardCheck,
  Globe,
  Bot,
  ExternalLink,
  History } from
'lucide-react';
import { BanknoteIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import petroVerdeLogo from '@/assets/petrocasinos-sidebar-icon-new.png';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';
const APP_VERSION_LABEL = APP_VERSION === 'dev' ? 'dev' : APP_VERSION.slice(0, 8);

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  moduleCode?: string;
  children?: NavItem[];
}

interface SidebarProps {
  isMobileDrawer?: boolean;
  onNavigate?: () => void;
}

interface CompanyLogoProps {
  name?: string | null;
  logoUrl?: string | null;
  className?: string;
  fallbackIcon?: boolean;
}

function CompanyLogo({ name, logoUrl, className, fallbackIcon = false }: CompanyLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!logoUrl);
  const [showFallback, setShowFallback] = useState(!logoUrl);
  const fallbackTimerRef = useRef<number | null>(null);
  const companyName = name?.trim() || 'empresa actual';
  const initials = useMemo(() => {
    const ignoredWords = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'the', 'of', 'and', 's', 'sa', 'sas', 'ltda', 'inc']);
    const words = (name || 'Empresa')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((word) => word && !ignoredWords.has(word.toLowerCase()));

    const sourceWords = words.length > 0 ? words : ['Empresa'];
    return sourceWords
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }, [name]);

  useEffect(() => {
    setImageError(false);
    setIsLoading(!!logoUrl);
    setShowFallback(!logoUrl);

    if (!logoUrl) return;

    fallbackTimerRef.current = window.setTimeout(() => {
      setShowFallback(true);
      setIsLoading(false);
    }, 2500);

    return () => {
      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
    };
  }, [logoUrl]);

  return (
    <div
      className={cn("relative w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden border border-sidebar-border shrink-0", className)}
      role="img"
      aria-label={`Logo de ${companyName}`}
      title={`Logo de ${companyName}`}
    >
      {logoUrl && !imageError && !showFallback ? (
        <>
          {isLoading && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />}
        <img
          src={logoUrl}
          alt={`Logo de ${companyName}`}
            className={cn("w-full h-full object-cover transition-opacity duration-200", isLoading ? "opacity-0" : "opacity-100")}
            onLoad={() => {
              if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
              setIsLoading(false);
              setShowFallback(false);
            }}
            onError={() => {
              setImageError(true);
              setIsLoading(false);
              setShowFallback(true);
            }}
        />
        </>
      ) : fallbackIcon ? (
        <Building2 className="w-5 h-5 text-primary" aria-hidden="true" />
      ) : (
        <span className="text-sm font-bold text-sidebar-accent-foreground" aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}

// Reorganized: Grouped by workflow logic
const coreNavItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, href: '/', moduleCode: 'dashboard' },
  { label: 'Analítica RRHH', icon: <BarChart3 className="w-5 h-5" />, href: '/analitica', moduleCode: 'analitica' },
];

const personnelNavItems: NavItem[] = [
  { label: 'Empleados', icon: <Users className="w-5 h-5" />, href: '/empleados', moduleCode: 'empleados' },
  { label: 'Contratos', icon: <FileText className="w-5 h-5" />, href: '/contratos', moduleCode: 'contratos' },
];

const seleccionNavItems: NavItem[] = [
  { label: 'Requisiciones', icon: <ClipboardList className="w-5 h-5" />, href: '/requisiciones', moduleCode: 'requisiciones' },
  { label: 'Selección y Vacantes', icon: <UserSearch className="w-5 h-5" />, href: '/seleccion', moduleCode: 'seleccion' },
  { label: 'Analítica Selección', icon: <BarChart3 className="w-5 h-5" />, href: '/seleccion/analitica', moduleCode: 'seleccion' },
];

const timeManagementNavItems: NavItem[] = [
  { label: 'Vacaciones', icon: <Palmtree className="w-5 h-5" />, href: '/vacaciones', moduleCode: 'vacaciones' },
  { label: 'Permisos', icon: <ClipboardList className="w-5 h-5" />, href: '/permisos', moduleCode: 'permisos' },
  { label: 'Incapacidades', icon: <HeartPulse className="w-5 h-5" />, href: '/incapacidades', moduleCode: 'incapacidades' },
];

const capacitacionesItem: NavItem = {
  label: 'Capacitaciones',
  icon: <GraduationCap className="w-5 h-5" />,
  href: '/capacitaciones',
  moduleCode: 'capacitaciones',
  children: [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, href: '/capacitaciones' },
    { label: 'Nueva con IA', icon: <Sparkles className="w-4 h-4" />, href: '/capacitaciones/crear' },
    { label: 'Nueva Manual', icon: <PenLine className="w-4 h-4" />, href: '/capacitaciones/crear-manual' },
    { label: 'Biblioteca', icon: <Library className="w-4 h-4" />, href: '/capacitaciones/biblioteca' },
    { label: 'Enlaces', icon: <Link2 className="w-4 h-4" />, href: '/capacitaciones/acceso/generar' },
    { label: 'Cumplimiento', icon: <ClipboardCheck className="w-4 h-4" />, href: '/capacitaciones/cumplimiento' },
    { label: 'Evidencias', icon: <FileSignature className="w-4 h-4" />, href: '/capacitaciones/evidencias' },
    { label: 'Analíticas', icon: <BarChart3 className="w-4 h-4" />, href: '/capacitaciones/analiticas' },
  ],
};

const evaluacionesItem: NavItem = {
  label: 'Evaluaciones Desempeño',
  icon: <Target className="w-5 h-5" />,
  href: '/evaluaciones',
  moduleCode: 'evaluaciones',
  children: [
    { label: 'Evaluaciones', icon: <Target className="w-4 h-4" />, href: '/evaluaciones' },
    { label: 'Analíticas', icon: <BarChart3 className="w-4 h-4" />, href: '/evaluaciones/analiticas' },
  ],
};

const developmentNavItems: NavItem[] = [
  { label: 'Disciplinarios', icon: <Gavel className="w-5 h-5" />, href: '/disciplinarios', moduleCode: 'disciplinarios' },
];

const benefitsNavItems: NavItem[] = [
  { label: 'Dotación', icon: <Package className="w-5 h-5" />, href: '/dotacion', moduleCode: 'dotacion' },
  { label: 'Cesantías', icon: <Landmark className="w-5 h-5" />, href: '/cesantias', moduleCode: 'cesantias' },
  { label: 'Exámenes Médicos', icon: <Stethoscope className="w-5 h-5" />, href: '/examenes', moduleCode: 'examenes' },
];

const sucursalesNavItems: NavItem[] = [
  { label: 'Centros', icon: <Building2 className="w-5 h-5" />, href: '/centros', moduleCode: 'catalogos' },
  { label: 'Fichas Centros', icon: <Building2 className="w-5 h-5" />, href: '/centros/fichas', moduleCode: 'catalogos' },
];

const catalogosItem: NavItem = {
  label: 'Catálogos',
  icon: <FolderOpen className="w-5 h-5" />,
  href: '/catalogos',
  moduleCode: 'catalogos',
  children: [
    { label: 'Áreas', icon: <Users className="w-4 h-4" />, href: '/catalogos/areas' },
    { label: 'Cargos', icon: <Briefcase className="w-4 h-4" />, href: '/catalogos/cargos' },
    { label: 'Tipos de Contrato', icon: <FileText className="w-4 h-4" />, href: '/catalogos/tipos-contrato' },
    { label: 'Tipos de Dotación', icon: <Shirt className="w-4 h-4" />, href: '/catalogos/tipos-dotacion' },
    { label: 'Días Festivos', icon: <Calendar className="w-4 h-4" />, href: '/catalogos/festivos' },
    { label: 'ARL', icon: <ShieldCheck className="w-4 h-4" />, href: '/catalogos/arl' },
    { label: 'EPS', icon: <HeartPulse className="w-4 h-4" />, href: '/catalogos/eps' },
    { label: 'AFP', icon: <Landmark className="w-4 h-4" />, href: '/catalogos/afp' },
    { label: 'Caja Compensación', icon: <Users className="w-4 h-4" />, href: '/catalogos/ccf' },
    { label: 'AFC', icon: <Landmark className="w-4 h-4" />, href: '/catalogos/afc' },
    { label: 'IPS', icon: <Stethoscope className="w-4 h-4" />, href: '/catalogos/ips' },
    { label: 'Bancos', icon: <BanknoteIcon className="w-4 h-4" />, href: '/catalogos/bancos' },
    { label: 'Motivos Novedad', icon: <ClipboardList className="w-4 h-4" />, href: '/catalogos/motivos-novedad' },
    { label: 'Plataformas Publicación', icon: <Globe className="w-4 h-4" />, href: '/catalogos/plataformas-publicacion' },
  ],
};

const toolsNavItemsBase: NavItem[] = [
  { label: 'Calendario', icon: <Calendar className="w-5 h-5" />, href: '/calendario', moduleCode: 'calendario' },
  { label: 'Reportes', icon: <FileBarChart className="w-5 h-5" />, href: '/reportes', moduleCode: 'reportes' },
  { label: 'Organigrama', icon: <Network className="w-5 h-5" />, href: '/organigrama', moduleCode: 'organigrama' },
  { label: 'Asistente IA', icon: <Bot className="w-5 h-5" />, href: '/asistente-ia', moduleCode: 'asistente_ia' },
];

const payrollNavItems: NavItem[] = [
  { label: 'Jornadas', icon: <Briefcase className="w-5 h-5" />, href: '/jornadas', moduleCode: 'jornadas' },
  { label: 'Novedades', icon: <Clock className="w-5 h-5" />, href: '/novedades', moduleCode: 'novedades' },
  { label: 'Analítica Nómina', icon: <BarChart3 className="w-5 h-5" />, href: '/nomina/analitica', moduleCode: 'novedades' },
  { label: 'Pre-Liquidación', icon: <Calculator className="w-5 h-5" />, href: '/pre-liquidacion', moduleCode: 'pre_liquidacion' },
  { label: 'Préstamos', icon: <BanknoteIcon className="w-5 h-5" />, href: '/prestamos', moduleCode: 'prestamos' },
  { label: 'Descuentos', icon: <ClipboardList className="w-5 h-5" />, href: '/descuentos', moduleCode: 'descuentos' },
  { label: 'Configuración Laboral', icon: <Settings className="w-5 h-5" />, href: '/configuracion-laboral', moduleCode: 'config_laboral' },
];

const adminNavItems: NavItem[] = [
  { label: 'Seguridad', icon: <ShieldCheck className="w-5 h-5" />, href: '/seguridad', moduleCode: 'seguridad' },
  { label: 'Auditoría', icon: <History className="w-5 h-5" />, href: '/auditoria', moduleCode: 'seguridad' },
  { label: 'Configuración', icon: <Settings className="w-5 h-5" />, href: '/configuracion', moduleCode: 'configuracion' },
];


export function Sidebar({ isMobileDrawer = false, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [catalogosOpen, setCatalogosOpen] = useState(false);
  const [capacitacionesOpen, setCapacitacionesOpen] = useState(false);
  const [evaluacionesOpen, setEvaluacionesOpen] = useState(false);
  const location = useLocation();
  const { data: unifiedAlerts } = useUnifiedAlerts();
  const alertCount = unifiedAlerts?.length || 0;
  const { canView, isAdmin, isSuperAdmin, permissionsLoaded } = useAuth();

  // In mobile drawer mode, never collapse - always show full sidebar
  const isCollapsed = isMobileDrawer ? false : collapsed;

  // Filter nav items based on permissions
  const filterItems = useCallback((items: NavItem[]): NavItem[] => {
    if (isAdmin || !permissionsLoaded) return items;
    return items.filter(item => {
      if (!item.moduleCode) return true;
      return canView(item.moduleCode);
    });
  }, [canView, isAdmin, permissionsLoaded]);

  const canViewItem = useCallback((item: NavItem): boolean => {
    if (isAdmin || !permissionsLoaded) return true;
    if (!item.moduleCode) return true;
    return canView(item.moduleCode);
  }, [canView, isAdmin, permissionsLoaded]);

  const canViewQuickAccessItem = useCallback((item: NavItem): boolean => {
    if (isAdmin || isSuperAdmin) return true;
    if (!permissionsLoaded) return false;
    if (!item.moduleCode) return true;
    return canView(item.moduleCode);
  }, [canView, isAdmin, isSuperAdmin, permissionsLoaded]);

  const filteredCoreNavItems = useMemo(() => filterItems(coreNavItems), [filterItems]);
  const filteredPersonnelNavItems = useMemo(() => filterItems(personnelNavItems), [filterItems]);
  const filteredSucursalesNavItems = useMemo(() => filterItems(sucursalesNavItems), [filterItems]);
  const filteredSeleccionNavItems = useMemo(() => filterItems(seleccionNavItems), [filterItems]);
  const filteredTimeManagementNavItems = useMemo(() => filterItems(timeManagementNavItems), [filterItems]);
  const filteredDevelopmentNavItems = useMemo(() => filterItems(developmentNavItems), [filterItems]);
  const filteredBenefitsNavItems = useMemo(() => filterItems(benefitsNavItems), [filterItems]);
  const filteredPayrollNavItems = useMemo(() => filterItems(payrollNavItems), [filterItems]);
  const filteredAdminNavItems = useMemo(() => filterItems(adminNavItems), [filterItems]);
  const filteredToolsNavItemsBase = useMemo(() => filterItems(toolsNavItemsBase), [filterItems]);

  const toolsNavItems = useMemo<NavItem[]>(() => [
    ...filteredToolsNavItemsBase,
    ...(canViewItem({ label: 'Alertas', icon: <Bell className="w-5 h-5" />, href: '/alertas', moduleCode: 'alertas' })
      ? [
          { label: 'Alertas', icon: <Bell className="w-5 h-5" />, href: '/alertas', moduleCode: 'alertas', badge: alertCount > 0 ? alertCount : undefined },
          { label: 'Notificaciones', icon: <Bell className="w-5 h-5" />, href: '/notificaciones', moduleCode: 'alertas' },
        ]
      : []),
  ], [alertCount, filteredToolsNavItemsBase, canViewItem]);

  const quickAccessItems = useMemo<NavItem[]>(() => [
    { label: 'Empleados', icon: <Users className="size-6 shrink-0" strokeWidth={2} />, href: '/empleados', moduleCode: 'empleados' },
    { label: 'Contratos', icon: <FileText className="size-6 shrink-0" strokeWidth={2} />, href: '/contratos', moduleCode: 'contratos' },
    { label: 'Alertas', icon: <Bell className="size-6 shrink-0" strokeWidth={2} />, href: '/alertas', moduleCode: 'alertas', badge: alertCount > 0 ? alertCount : undefined },
  ].filter(canViewQuickAccessItem), [alertCount, canViewQuickAccessItem]);

  const showCapacitaciones = canViewItem(capacitacionesItem);
  const showEvaluaciones = canViewItem(evaluacionesItem);
  const showCatalogos = canViewItem(catalogosItem);

  // Auto-open menus based on route (in useEffect to avoid setState during render)
  const pathname = location.pathname;
  useEffect(() => {
    if (pathname.startsWith('/catalogos') || pathname.startsWith('/centros')) {
      setCatalogosOpen(true);
    }
    if (pathname.startsWith('/capacitaciones')) {
      setCapacitacionesOpen(true);
    }
    if (pathname.startsWith('/evaluaciones')) {
      setEvaluacionesOpen(true);
    }
  }, [pathname]);

  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  const NavLinkItem = ({ item }: {item: NavItem;}) => {
    const isActive = location.pathname === item.href;

    const linkContent =
    <Link to={item.href} onClick={handleNavClick}>
        <motion.div
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "flex items-center gap-3 rounded-lg transition-all duration-200 group relative [&_svg]:shrink-0 [&_svg]:stroke-[2]",
          isCollapsed
            ? "mx-auto h-11 w-11 justify-center p-0 [&_svg]:size-5 [&_svg]:block [&_svg]:shape-geometricPrecision [&_svg]:[vector-effect:non-scaling-stroke]"
            : "px-3 py-2",
          isActive ?
          "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" :
          "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/70"
        )}>

          <span className={cn(
          "transition-colors",
          isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
        )}>
            {item.icon}
          </span>
          {!isCollapsed &&
            <span className="font-bold text-sm whitespace-nowrap overflow-hidden">
              {item.label}
            </span>
          }
          {item.badge && !isCollapsed &&
        <span className="ml-auto min-w-5 rounded-full bg-primary px-2 py-0.5 text-center text-xs font-extrabold text-primary-foreground shadow-sm">
              {item.badge}
            </span>
        }
          {item.badge && isCollapsed &&
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground ring-2 ring-sidebar shadow-sm">
              {item.badge}
            </span>
        }
        </motion.div>
      </Link>;


    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent
            side="right"
              className="rounded-lg border border-border bg-popover px-3 py-2 font-bold text-popover-foreground shadow-lg"
            sideOffset={8}>

            <div className="flex items-center gap-2">
              <span>{item.label}</span>
              {item.badge &&
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-extrabold text-primary-foreground">
                  {item.badge}
                </span>
              }
            </div>
          </TooltipContent>
        </Tooltip>);

    }

    return linkContent;
  };

  const SectionLabel = ({ label }: {label: string;}) => (
    !isCollapsed ? (
      <p className="text-[10px] font-extrabold text-sidebar-foreground/45 uppercase tracking-[0.16em] px-3 pt-4 pb-1">
        {label}
      </p>
    ) : null
  );

  const QuickAccessMenu = () => (
    quickAccessItems.length > 0 ? (
      <div className="pt-3">
        <SectionLabel label="Accesos rápidos" />
        <div className={cn("gap-2", isCollapsed ? "flex flex-col" : "grid grid-cols-3")}>
          {quickAccessItems.map((item) => {
            const isActive = location.pathname === item.href;
            const content = (
              <Link key={item.href} to={item.href} onClick={handleNavClick}>
                <motion.div
                  whileHover={{ backgroundColor: 'hsl(var(--sidebar-accent))' }}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    "relative flex items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&_svg]:block [&_svg]:shape-geometricPrecision [&_svg]:[vector-effect:non-scaling-stroke]",
                    isCollapsed ? "mx-auto h-11 w-11 p-0 [&_svg]:size-5" : "h-16 flex-col gap-1 px-1",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  )}
                >
                  {item.icon}
                  {!isCollapsed && <span className="max-w-full truncate text-[10px] font-extrabold leading-tight">{item.label}</span>}
                  {item.badge && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground ring-2 ring-sidebar">
                      {item.badge}
                    </span>
                  )}
                </motion.div>
              </Link>
            );

            return isCollapsed ? (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="rounded-lg border border-border bg-popover px-3 py-2 font-bold text-popover-foreground shadow-lg">
                  {item.label === 'Alertas' ? 'Alertas Activas' : item.label}
                </TooltipContent>
              </Tooltip>
            ) : content;
          })}
        </div>
      </div>
    ) : null
  );


  const ExpandableMenu = ({ item, isOpen, setIsOpen }: {
    item: NavItem;
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
  }) => {
    const isAnyChildActive = item.children?.some((child) => location.pathname === child.href);

    const menuButton =
    <motion.div
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => !isCollapsed && setIsOpen(!isOpen)}
      className={cn(
        "flex items-center gap-3 rounded-lg transition-all duration-200 group relative cursor-pointer [&_svg]:shrink-0 [&_svg]:stroke-[2]",
        isCollapsed
          ? "mx-auto h-11 w-11 justify-center p-0 [&_svg]:size-5 [&_svg]:block [&_svg]:shape-geometricPrecision [&_svg]:[vector-effect:non-scaling-stroke]"
          : "px-3 py-2",
        isAnyChildActive ?
        "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" :
        "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/70"
      )}>

        <span className={cn(
        "transition-colors",
        isAnyChildActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
      )}>
          {item.icon}
        </span>
        {!isCollapsed &&
          <span className="font-bold text-sm whitespace-nowrap overflow-hidden flex-1">
            {item.label}
          </span>
        }
        {!isCollapsed &&
      <ChevronDown className={cn(
        "w-4 h-4 transition-transform",
        isOpen && "rotate-180"
      )} />
      }
      </motion.div>;


    return (
      <div>
        {isCollapsed ?
        <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              {menuButton}
            </TooltipTrigger>
            <TooltipContent
            side="right"
            className="overflow-hidden rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg"
            sideOffset={8}>

              <div className="py-2">
                <p className="mb-1 border-b border-border px-3 pb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  {item.label}
                </p>
                {item.children?.map((child) => {
                const isActive = location.pathname === child.href;
                return (
                  <Link key={child.href} to={child.href} onClick={handleNavClick}>
                      <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-sm font-bold transition-colors [&_svg]:shrink-0 [&_svg]:stroke-[2]",
                      isActive ?
                        "bg-sidebar-accent text-sidebar-accent-foreground font-medium" :
                      "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                    )}>
                        {child.icon}
                        <span>{child.label}</span>
                      </div>
                    </Link>);

              })}
              </div>
            </TooltipContent>
          </Tooltip> :

        menuButton
        }
        
        <AnimatePresence initial={false}>
          {isOpen && !isCollapsed &&
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-4 pl-3 border-l border-sidebar-border space-y-1 mt-1">

              {item.children?.map((child) => {
              const isActive = location.pathname === child.href;
              return (
                <Link key={child.href} to={child.href} onClick={handleNavClick}>
                    <motion.div
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 group [&_svg]:shrink-0 [&_svg]:stroke-[2]",
                      isActive ?
                      "bg-sidebar-accent text-sidebar-accent-foreground" :
                      "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/70"
                    )}>

                      <span className={cn(
                      "transition-colors",
                      isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
                    )}>
                        {child.icon}
                      </span>
                      <span className="font-bold text-sm">{child.label}</span>
                    </motion.div>
                  </Link>);

            })}
            </motion.div>
          }
        </AnimatePresence>
      </div>);

  };

  const CatalogosMenu = () => (
    <ExpandableMenu
      item={catalogosItem}
      isOpen={catalogosOpen}
      setIsOpen={setCatalogosOpen}
    />
  );


  return (
    <TooltipProvider>
      <motion.aside
        initial={false}
        animate={{ width: isMobileDrawer ? '100%' : (isCollapsed ? 80 : 260) }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          "h-screen bg-sidebar flex flex-col border-r border-sidebar-border relative shadow-sm after:absolute after:right-0 after:top-0 after:h-full after:w-2.5 after:translate-x-full after:bg-gradient-to-r after:from-foreground/10 after:via-foreground/5 after:to-transparent after:blur-[1.5px] after:pointer-events-none after:transition-[width,opacity,filter] after:duration-300 after:ease-in-out",
          isCollapsed ? "after:w-2 after:opacity-80 after:blur-[1px]" : "after:w-2.5 after:opacity-100 after:blur-[1.5px]",
          isMobileDrawer && "h-full"
        )}>

      {/* Collapse/Expand Toggle Button - hidden in mobile drawer */}
      {!isMobileDrawer && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-20 -right-3 z-50 w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-[0_8px_18px_hsl(var(--primary)/0.35),0_2px_6px_hsl(var(--foreground)/0.18)] flex items-center justify-center hover:bg-primary/90 hover:shadow-[0_10px_22px_hsl(var(--primary)/0.42),0_3px_8px_hsl(var(--foreground)/0.22)] transition-[background-color,box-shadow,transform] hover:scale-105">
          {collapsed ?
            <ChevronRight className="w-3.5 h-3.5" /> :
            <ChevronLeft className="w-3.5 h-3.5" />
          }
        </button>
      )}

      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!isCollapsed ?
            <motion.div
              key="full-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2">

              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                <img src={petroVerdeLogo} alt="KRH Logo" className="w-10 h-10 object-cover rounded-xl" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-xl text-sidebar-primary leading-tight">KRH</span>
                 <span className="text-[11px] font-bold text-sidebar-foreground leading-tight whitespace-nowrap">Talento Humano</span>
              </div>
            </motion.div> :

            <motion.div
              key="icon-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center mx-auto">

              <img src={petroVerdeLogo} alt="KRH Logo" className="w-10 h-10 object-cover rounded-xl" />
            </motion.div>
            }
        </AnimatePresence>
      </div>




      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Core */}
        {filteredCoreNavItems.length > 0 && (
          <div className="space-y-0.5">
            {filteredCoreNavItems.map((item) =>
              <NavLinkItem key={item.href} item={item} />
            )}
          </div>
        )}

        <QuickAccessMenu />

        {/* Personnel */}
        {filteredPersonnelNavItems.length > 0 && (
          <>
            <SectionLabel label="Personal" />
            <div className="space-y-0.5">
              {filteredPersonnelNavItems.map((item) =>
                <NavLinkItem key={item.href} item={item} />
              )}
            </div>
          </>
        )}

        {/* Sucursales */}
        {filteredSucursalesNavItems.length > 0 && (
          <>
            <SectionLabel label="Sucursales" />
            <div className="space-y-0.5">
              {filteredSucursalesNavItems.map((item) =>
                <NavLinkItem key={item.href} item={item} />
              )}
            </div>
          </>
        )}

        {/* Selección */}
        {filteredSeleccionNavItems.length > 0 && (
          <>
            <SectionLabel label="Selección" />
            <div className="space-y-0.5">
              {filteredSeleccionNavItems.map((item) =>
                <NavLinkItem key={item.href} item={item} />
              )}
            </div>
          </>
        )}

        {/* Payroll */}
        {filteredPayrollNavItems.length > 0 && (
          <>
            <SectionLabel label="Nómina" />
            <div className="space-y-0.5">
              {filteredPayrollNavItems.map((item) =>
                <NavLinkItem key={item.href} item={item} />
              )}
            </div>
          </>
        )}

        {/* Time Management */}
        {filteredTimeManagementNavItems.length > 0 && (
          <>
            <SectionLabel label="Tiempo" />
            <div className="space-y-0.5">
              {filteredTimeManagementNavItems.map((item) =>
                <NavLinkItem key={item.href} item={item} />
              )}
            </div>
          </>
        )}

        {/* Development */}
        {(showCapacitaciones || showEvaluaciones || filteredDevelopmentNavItems.length > 0) && (
          <>
            <SectionLabel label="Desarrollo" />
            <div className="space-y-0.5">
              {showCapacitaciones && (
                <ExpandableMenu
                  item={capacitacionesItem}
                  isOpen={capacitacionesOpen}
                  setIsOpen={setCapacitacionesOpen}
                />
              )}
              {showEvaluaciones && (
                <ExpandableMenu
                  item={evaluacionesItem}
                  isOpen={evaluacionesOpen}
                  setIsOpen={setEvaluacionesOpen}
                />
              )}
              {filteredDevelopmentNavItems.map((item) =>
                <NavLinkItem key={item.href} item={item} />
              )}
            </div>
          </>
        )}

        {/* Benefits */}
        {filteredBenefitsNavItems.length > 0 && (
          <>
            <SectionLabel label="Beneficios" />
            <div className="space-y-0.5">
              {filteredBenefitsNavItems.map((item) =>
                <NavLinkItem key={item.href} item={item} />
              )}
            </div>
          </>
        )}

        {/* Tools */}
        {toolsNavItems.length > 0 && (
          <>
            <SectionLabel label="Herramientas" />
            <div className="space-y-0.5">
              {toolsNavItems.map((item) =>
                <NavLinkItem key={item.href} item={item} />
              )}
            </div>
          </>
        )}

        {/* Admin */}
        {(showCatalogos || filteredAdminNavItems.length > 0 || isSuperAdmin) && (
          <>
            <SectionLabel label="Administración" />
            <div className="space-y-0.5">
              {showCatalogos && <CatalogosMenu />}
              {filteredAdminNavItems.map((item) =>
                <NavLinkItem key={item.href} item={item} />
              )}
              {isSuperAdmin && (
                <NavLinkItem item={{ label: 'Super Admin', icon: <Globe className="w-5 h-5" />, href: '/super-admin' }} />
              )}
            </div>
          </>
        )}
      </nav>

      {/* User section */}
        <CompanyUserSection collapsed={isCollapsed} onNavigate={onNavigate} />
    </motion.aside>
    </TooltipProvider>);

}

function CompanyUserSection({ collapsed, onNavigate }: {collapsed: boolean; onNavigate?: () => void;}) {
  const { user, roles, signOut, currentCompanyId, setCurrentCompanyId, isSuperAdmin, companies: authCompanies } = useAuth();
  const { data: queriedCompanies } = useCompanies();
  const companies = isSuperAdmin ? (queriedCompanies || authCompanies) : authCompanies;
  const { data: currentCompany } = useCompany(currentCompanyId || undefined);
  const { data: userProfile } = useQuery({
    queryKey: ['sidebar-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name, display_name')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
  const navigate = useNavigate();
  const [manualOpen, setManualOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    rrhh: 'RRHH',
    psicologo: 'Psicólogo',
    jefe_area: 'Jefe de Área',
    auditor: 'Auditor',
    empleado: 'Empleado'
  };

  const userEmail = user?.email || '';
  const cleanText = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  const userName =
    cleanText(userProfile?.full_name) ||
    cleanText(userProfile?.display_name) ||
    cleanText(user?.user_metadata?.full_name) ||
    cleanText(user?.user_metadata?.name) ||
    userEmail ||
    'Usuario';
  const primaryRole = roles[0] ? roleLabels[roles[0]] || roles[0] : 'Usuario';
  const canSwitchCompany = roles.includes('admin') || isSuperAdmin;
  const hasMultipleCompanies = companies && companies.length > 1;
  const handleNavigate = (path: string) => {
    navigate(path);
    if (onNavigate) onNavigate();
  };

  return (<>
    <div className="border-t border-sidebar-border p-3 bg-sidebar">
      <Popover>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border border-sidebar-border bg-card shadow-sm cursor-pointer hover:border-primary/40 hover:shadow-md transition-all",
              collapsed ? "justify-center p-2" : "px-3 py-2"
            )}>
            <CompanyLogo name={currentCompany?.name} logoUrl={currentCompany?.logo_url} />
            {!collapsed &&
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{currentCompany?.name || 'Seleccionar empresa'}</p>
                 <p className="text-[11px] text-muted-foreground truncate">{userEmail || userName}</p>
                 <p className="text-[10px] font-normal leading-tight text-muted-foreground/70 truncate">v{APP_VERSION_LABEL}</p>
              </div>
            }
            {!collapsed &&
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
            }
          </div>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          className="w-64 p-0 bg-popover border border-border shadow-lg"
          sideOffset={8}>
          <div className="p-4 border-b border-border space-y-3">
            <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
              <PopoverTrigger asChild disabled={!canSwitchCompany || !hasMultipleCompanies}>
                <button className={cn(
                  "w-full flex items-center gap-3 rounded-lg text-left transition-colors",
                  canSwitchCompany && hasMultipleCompanies ? "hover:bg-accent p-2 -m-2 cursor-pointer" : "cursor-default"
                )}>
                  <CompanyLogo name={currentCompany?.name} logoUrl={currentCompany?.logo_url} className="bg-accent border-border" fallbackIcon />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{currentCompany?.name || 'Seleccionar empresa'}</p>
                    <p className="text-xs text-muted-foreground truncate">{userName}</p>
                  </div>
                  {canSwitchCompany && hasMultipleCompanies && <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" align="start" className="w-64 p-1 bg-popover border border-border shadow-lg" sideOffset={12}>
                <div className="space-y-0.5">
                  {companies?.map((company) =>
                  <button
                    key={company.id}
                    onClick={() => {
                      setCurrentCompanyId(company.id);
                      if (user) localStorage.setItem(`last_company_${user.id}`, company.id);
                      setCompanyOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                      currentCompanyId === company.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                    )}>
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="truncate flex-1 text-left">{company.name}</span>
                    {currentCompanyId === company.id && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <p className="text-sm font-medium text-foreground truncate">{userEmail}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
              {primaryRole}
            </span>
          </div>
          <div className="p-2">
            <button
              onClick={() => handleNavigate('/perfil')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors">
              <Users className="w-4 h-4" />
              Mi Perfil
            </button>
            <button
              onClick={() => handleNavigate('/configuracion')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors">
              <Settings className="w-4 h-4" />
              Configuración
            </button>
            <button
              onClick={() => setManualOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors">
              <BookOpen className="w-4 h-4" />
              Manual de Usuario
            </button>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors">
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
    <UserManualDialog open={manualOpen} onOpenChange={setManualOpen} />
    </>);
}
