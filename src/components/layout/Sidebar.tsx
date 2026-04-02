import { useState, useMemo, useCallback, useEffect } from 'react';
import { UserManualDialog } from '@/components/manual/UserManualDialog';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies, useCompany } from '@/hooks/useCompanies';
import { useUnifiedAlerts } from '@/hooks/useUnifiedAlerts';
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
  Globe } from
'lucide-react';
import { BanknoteIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import petroVerdeLogo from '@/assets/petrocasinos-sidebar-icon-new.png';

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
];

const payrollNavItems: NavItem[] = [
  { label: 'Jornadas', icon: <Briefcase className="w-5 h-5" />, href: '/jornadas', moduleCode: 'jornadas' },
  { label: 'Novedades', icon: <Clock className="w-5 h-5" />, href: '/novedades', moduleCode: 'novedades' },
  { label: 'Pre-Liquidación', icon: <Calculator className="w-5 h-5" />, href: '/pre-liquidacion', moduleCode: 'pre_liquidacion' },
  { label: 'Préstamos', icon: <BanknoteIcon className="w-5 h-5" />, href: '/prestamos', moduleCode: 'prestamos' },
  { label: 'Descuentos', icon: <ClipboardList className="w-5 h-5" />, href: '/descuentos', moduleCode: 'descuentos' },
  { label: 'Configuración Laboral', icon: <Settings className="w-5 h-5" />, href: '/configuracion-laboral', moduleCode: 'config_laboral' },
];

const adminNavItems: NavItem[] = [
  { label: 'Seguridad', icon: <ShieldCheck className="w-5 h-5" />, href: '/seguridad', moduleCode: 'seguridad' },
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
      ? [{ label: 'Alertas', icon: <Bell className="w-5 h-5" />, href: '/alertas', moduleCode: 'alertas', badge: alertCount > 0 ? alertCount : undefined }]
      : []),
  ], [alertCount, filteredToolsNavItemsBase, canViewItem]);

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
          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
          isActive ?
          "bg-sidebar-accent text-sidebar-accent-foreground" :
          "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        )}>

          <span className={cn(
          "transition-colors",
          isActive ? "text-secondary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
        )}>
            {item.icon}
          </span>
          {!isCollapsed &&
            <span className="font-medium text-sm whitespace-nowrap overflow-hidden">
              {item.label}
            </span>
          }
          {item.badge && !isCollapsed &&
        <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
              {item.badge}
            </span>
        }
          {item.badge && isCollapsed &&
        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center">
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
            className="bg-sidebar border-sidebar-border text-sidebar-foreground font-medium px-3 py-2 shadow-lg"
            sideOffset={8}>

            <div className="flex items-center gap-2">
              <span>{item.label}</span>
              {item.badge &&
              <span className="bg-destructive text-destructive-foreground text-xs font-semibold px-1.5 py-0.5 rounded-full">
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
      <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-3 pt-4 pb-1">
        {label}
      </p>
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
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative cursor-pointer",
        isAnyChildActive ?
        "bg-sidebar-accent text-sidebar-accent-foreground" :
        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}>

        <span className={cn(
        "transition-colors",
        isAnyChildActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
      )}>
          {item.icon}
        </span>
        {!isCollapsed &&
          <span className="font-medium text-sm whitespace-nowrap overflow-hidden flex-1">
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
            className="bg-sidebar border-sidebar-border text-sidebar-foreground p-0 shadow-lg"
            sideOffset={8}>

              <div className="py-2">
                <p className="px-3 pb-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider border-b border-sidebar-border mb-1">
                  {item.label}
                </p>
                {item.children?.map((child) => {
                const isActive = location.pathname === child.href;
                return (
                  <Link key={child.href} to={child.href} onClick={handleNavClick}>
                      <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                      isActive ?
                      "bg-sidebar-accent text-primary font-medium" :
                      "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 group",
                      isActive ?
                      "bg-sidebar-accent text-sidebar-accent-foreground" :
                      "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}>

                      <span className={cn(
                      "transition-colors",
                      isActive ? "text-secondary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                    )}>
                        {child.icon}
                      </span>
                      <span className="font-medium text-sm">{child.label}</span>
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
          "h-screen bg-sidebar flex flex-col border-r border-sidebar-border relative",
          isMobileDrawer && "h-full"
        )}>

      {/* Collapse/Expand Toggle Button - hidden in mobile drawer */}
      {!isMobileDrawer && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-20 -right-3 z-50 w-6 h-6 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center hover:bg-secondary/90 transition-colors">
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
                <span className="font-display font-bold text-xl text-sidebar-primary leading-tight">KRH</span>
                <span className="text-[11px] font-semibold text-white leading-tight whitespace-nowrap">Talento Humano</span>
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
        {(showCatalogos || filteredAdminNavItems.length > 0) && (
          <>
            <SectionLabel label="Administración" />
            <div className="space-y-0.5">
              {showCatalogos && <CatalogosMenu />}
              {filteredAdminNavItems.map((item) =>
                <NavLinkItem key={item.href} item={item} />
              )}
            </div>
          </>
        )}
      </nav>

      {/* User section */}
      <UserSection collapsed={isCollapsed} onNavigate={onNavigate} />
    </motion.aside>
    </TooltipProvider>);

}

function CompanySelector({ collapsed }: {collapsed: boolean;}) {
  const { currentCompanyId, setCurrentCompanyId, roles } = useAuth();
  const { data: companies } = useCompanies();
  const { data: currentCompany } = useCompany(currentCompanyId || undefined);
  const [open, setOpen] = useState(false);

  const canSwitchCompany = roles.includes('admin');
  const hasMultipleCompanies = companies && companies.length > 1;

  if (collapsed) {
    return (
      <div className="px-3 py-2">
        <div className="w-full flex justify-center">
          <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center">
            <Building2 className="w-4 h-4 text-sidebar-foreground" />
          </div>
        </div>
      </div>);
  }

  return (
    <div className="px-3 py-2 border-b border-sidebar-border">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={!canSwitchCompany || !hasMultipleCompanies}>
          <button
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left",
              canSwitchCompany && hasMultipleCompanies ?
              "hover:bg-sidebar-accent/50 cursor-pointer" :
              "cursor-default"
            )}>
            <Building2 className="w-4 h-4 text-sidebar-foreground/60 shrink-0" />
            <span className="text-sm font-medium text-sidebar-foreground truncate flex-1">
              {currentCompany?.name || 'Seleccionar empresa'}
            </span>
            {canSwitchCompany && hasMultipleCompanies &&
            <ChevronDown className="w-4 h-4 text-sidebar-foreground/50 shrink-0" />
            }
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className="w-56 p-1 bg-popover border border-border shadow-lg"
          sideOffset={4}>
          <div className="space-y-0.5">
            {companies?.map((company) =>
            <button
              key={company.id}
              onClick={() => {
                setCurrentCompanyId(company.id);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                currentCompanyId === company.id ?
                "bg-primary/10 text-primary" :
                "text-foreground hover:bg-accent"
              )}>
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1 text-left">{company.name}</span>
                {currentCompanyId === company.id &&
              <Check className="w-4 h-4 shrink-0" />
              }
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>);
}

function UserSection({ collapsed, onNavigate }: {collapsed: boolean; onNavigate?: () => void;}) {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [manualOpen, setManualOpen] = useState(false);

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    rrhh: 'RRHH',
    psicologo: 'Psicólogo',
    jefe_area: 'Jefe de Área',
    auditor: 'Auditor',
    empleado: 'Empleado'
  };

  const userEmail = user?.email || '';
  const userInitials = userEmail.substring(0, 2).toUpperCase();
  const avatarUrl = user?.user_metadata?.avatar_url;
  const primaryRole = roles[0] ? roleLabels[roles[0]] || roles[0] : 'Usuario';

  const handleNavigate = (path: string) => {
    navigate(path);
    if (onNavigate) onNavigate();
  };

  return (<>
    <div className="border-t border-sidebar-border p-3">
      <Popover>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-sidebar-accent/50 transition-colors",
              collapsed ? "justify-center" : ""
            )}>
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
              {avatarUrl ?
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> :
              <span className="text-sm font-semibold text-white">{userInitials}</span>
              }
            </div>
            {!collapsed &&
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{userEmail}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{primaryRole}</p>
              </div>
            }
            {!collapsed &&
            <ChevronDown className="w-4 h-4 text-sidebar-foreground/50" />
            }
          </div>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          className="w-64 p-0 bg-popover border border-border shadow-lg"
          sideOffset={8}>
          <div className="p-4 border-b border-border">
            <p className="text-sm font-medium text-foreground">{userEmail}</p>
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
