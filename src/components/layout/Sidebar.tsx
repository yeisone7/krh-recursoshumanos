import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies, useCompany } from '@/hooks/useCompanies';
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
  FolderOpen,
  Shirt,
  Check,
} from 'lucide-react';
import { BanknoteIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import petroVerdeLogo from '@/assets/petro-verde-krh.png';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  children?: NavItem[];
}

// Reorganized: Grouped by workflow logic
const coreNavItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, href: '/' },
  { label: 'Analítica RRHH', icon: <BarChart3 className="w-5 h-5" />, href: '/analitica' },
];

const personnelNavItems: NavItem[] = [
  { label: 'Empleados', icon: <Users className="w-5 h-5" />, href: '/empleados' },
  { label: 'Contratos', icon: <FileText className="w-5 h-5" />, href: '/contratos' },
  { label: 'Selección y Vacantes', icon: <UserSearch className="w-5 h-5" />, href: '/seleccion' },
];

const timeManagementNavItems: NavItem[] = [
  { label: 'Vacaciones', icon: <Palmtree className="w-5 h-5" />, href: '/vacaciones' },
  { label: 'Permisos', icon: <ClipboardList className="w-5 h-5" />, href: '/permisos' },
  { label: 'Horas Extra', icon: <Clock className="w-5 h-5" />, href: '/horas-extra' },
  { label: 'Incapacidades', icon: <HeartPulse className="w-5 h-5" />, href: '/incapacidades' },
];

const developmentNavItems: NavItem[] = [
  { label: 'Capacitaciones', icon: <GraduationCap className="w-5 h-5" />, href: '/capacitaciones' },
  { label: 'Evaluación Desempeño', icon: <Target className="w-5 h-5" />, href: '/evaluaciones' },
  { label: 'Disciplinarios', icon: <Gavel className="w-5 h-5" />, href: '/disciplinarios' },
];

const benefitsNavItems: NavItem[] = [
  { label: 'Dotación', icon: <Package className="w-5 h-5" />, href: '/dotacion' },
  { label: 'Cesantías', icon: <Landmark className="w-5 h-5" />, href: '/cesantias' },
  { label: 'Exámenes Médicos', icon: <Stethoscope className="w-5 h-5" />, href: '/examenes' },
];

const catalogosItem: NavItem = {
  label: 'Catálogos',
  icon: <FolderOpen className="w-5 h-5" />,
  href: '/catalogos',
  children: [
    { label: 'Centros', icon: <Building2 className="w-4 h-4" />, href: '/centros' },
    { label: 'Áreas', icon: <Users className="w-4 h-4" />, href: '/catalogos/areas' },
    { label: 'Cargos', icon: <Briefcase className="w-4 h-4" />, href: '/catalogos/cargos' },
    { label: 'Tipos de Dotación', icon: <Shirt className="w-4 h-4" />, href: '/catalogos/tipos-dotacion' },
    { label: 'ARL', icon: <ShieldCheck className="w-4 h-4" />, href: '/catalogos/arl' },
    { label: 'EPS', icon: <HeartPulse className="w-4 h-4" />, href: '/catalogos/eps' },
    { label: 'AFP', icon: <Landmark className="w-4 h-4" />, href: '/catalogos/afp' },
    { label: 'Caja Compensación', icon: <Users className="w-4 h-4" />, href: '/catalogos/ccf' },
    { label: 'AFC', icon: <Landmark className="w-4 h-4" />, href: '/catalogos/afc' },
    { label: 'IPS', icon: <Stethoscope className="w-4 h-4" />, href: '/catalogos/ips' },
    { label: 'Bancos', icon: <BanknoteIcon className="w-4 h-4" />, href: '/catalogos/bancos' },
  ],
};

const toolsNavItems: NavItem[] = [
  { label: 'Calendario', icon: <Calendar className="w-5 h-5" />, href: '/calendario' },
  { label: 'Reportes', icon: <FileBarChart className="w-5 h-5" />, href: '/reportes' },
  { label: 'Organigrama', icon: <Network className="w-5 h-5" />, href: '/organigrama' },
  { label: 'Alertas', icon: <Bell className="w-5 h-5" />, href: '/alertas', badge: 5 },
];

const payrollNavItems: NavItem[] = [
  { label: 'Jornadas', icon: <Briefcase className="w-5 h-5" />, href: '/jornadas' },
];

const adminNavItems: NavItem[] = [
  { label: 'Seguridad', icon: <ShieldCheck className="w-5 h-5" />, href: '/seguridad' },
  { label: 'Configuración', icon: <Settings className="w-5 h-5" />, href: '/configuracion' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [catalogosOpen, setCatalogosOpen] = useState(false);
  const location = useLocation();

  // Auto-open catalogos menu if on a catalogos route or centros
  const isCatalogosRoute = location.pathname.startsWith('/catalogos') || location.pathname === '/centros';
  if (isCatalogosRoute && !catalogosOpen) {
    setCatalogosOpen(true);
  }

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href;
    
    return (
      <Link to={item.href}>
        <motion.div
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <span className={cn(
            "transition-colors",
            isActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
          )}>
            {item.icon}
          </span>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-medium text-sm whitespace-nowrap overflow-hidden"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
          {item.badge && !collapsed && (
            <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
              {item.badge}
            </span>
          )}
          {item.badge && collapsed && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center">
              {item.badge}
            </span>
          )}
        </motion.div>
      </Link>
    );
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <AnimatePresence>
      {!collapsed && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-3 pt-4 pb-1"
        >
          {label}
        </motion.p>
      )}
    </AnimatePresence>
  );

  const CatalogosMenu = () => {
    const isAnyChildActive = catalogosItem.children?.some(child => location.pathname === child.href);
    
    return (
      <div>
        <motion.div
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => !collapsed && setCatalogosOpen(!catalogosOpen)}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative cursor-pointer",
            isAnyChildActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <span className={cn(
            "transition-colors",
            isAnyChildActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
          )}>
            {catalogosItem.icon}
          </span>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-medium text-sm whitespace-nowrap overflow-hidden flex-1"
              >
                {catalogosItem.label}
              </motion.span>
            )}
          </AnimatePresence>
          {!collapsed && (
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              catalogosOpen && "rotate-180"
            )} />
          )}
        </motion.div>
        
        <AnimatePresence>
          {catalogosOpen && !collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-4 pl-3 border-l border-sidebar-border space-y-1 mt-1"
            >
              {catalogosItem.children?.map((child) => {
                const isActive = location.pathname === child.href;
                return (
                  <Link key={child.href} to={child.href}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 group",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                    >
                      <span className={cn(
                        "transition-colors",
                        isActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                      )}>
                        {child.icon}
                      </span>
                      <span className="font-medium text-sm">{child.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen bg-sidebar flex flex-col border-r border-sidebar-border relative"
    >
      {/* Collapse/Expand Toggle Button - Floating on edge near company selector */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-20 -right-3 z-50 w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Logo */}
      <div className="h-16 flex items-center justify-center px-4 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="full-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                <img src={petroVerdeLogo} alt="KRH Logo" className="w-10 h-10 object-cover rounded-xl" />
              </div>
              <span className="font-display font-bold text-xl text-sidebar-primary">KRH</span>
            </motion.div>
          ) : (
            <motion.div
              key="icon-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center mx-auto"
            >
              <img src={petroVerdeLogo} alt="KRH Logo" className="w-10 h-10 object-cover rounded-xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Company Selector */}
      <CompanySelector collapsed={collapsed} />

      {/* Navigation - Hidden scrollbar */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Core */}
        <div className="space-y-0.5">
          {coreNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Personnel */}
        <SectionLabel label="Personal" />
        <div className="space-y-0.5">
          {personnelNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Payroll */}
        <SectionLabel label="Nómina" />
        <div className="space-y-0.5">
          {payrollNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Time Management */}
        <SectionLabel label="Tiempo" />
        <div className="space-y-0.5">
          {timeManagementNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Development */}
        <SectionLabel label="Desarrollo" />
        <div className="space-y-0.5">
          {developmentNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Benefits */}
        <SectionLabel label="Beneficios" />
        <div className="space-y-0.5">
          {benefitsNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Tools */}
        <SectionLabel label="Herramientas" />
        <div className="space-y-0.5">
          {toolsNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Admin */}
        <SectionLabel label="Administración" />
        <div className="space-y-0.5">
          <CatalogosMenu />
          {adminNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* User section */}
      <UserSection collapsed={collapsed} />
    </motion.aside>
  );
}

function CompanySelector({ collapsed }: { collapsed: boolean }) {
  const { currentCompanyId, setCurrentCompanyId, roles } = useAuth();
  const { data: companies } = useCompanies();
  const { data: currentCompany } = useCompany(currentCompanyId || undefined);
  const [open, setOpen] = useState(false);
  
  // Only admins can switch companies
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
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-b border-sidebar-border">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={!canSwitchCompany || !hasMultipleCompanies}>
          <button 
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left",
              canSwitchCompany && hasMultipleCompanies 
                ? "hover:bg-sidebar-accent/50 cursor-pointer" 
                : "cursor-default"
            )}
          >
            <Building2 className="w-4 h-4 text-sidebar-foreground/60 shrink-0" />
            <span className="text-sm font-medium text-sidebar-foreground truncate flex-1">
              {currentCompany?.name || 'Seleccionar empresa'}
            </span>
            {canSwitchCompany && hasMultipleCompanies && (
              <ChevronDown className="w-4 h-4 text-sidebar-foreground/50 shrink-0" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          side="bottom" 
          align="start" 
          className="w-56 p-1 bg-popover border border-border shadow-lg"
          sideOffset={4}
        >
          <div className="space-y-0.5">
            {companies?.map((company) => (
              <button
                key={company.id}
                onClick={() => {
                  setCurrentCompanyId(company.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                  currentCompanyId === company.id
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1 text-left">{company.name}</span>
                {currentCompanyId === company.id && (
                  <Check className="w-4 h-4 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function UserSection({ collapsed }: { collapsed: boolean }) {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    rrhh: 'RRHH',
    psicologo: 'Psicólogo',
    jefe_area: 'Jefe de Área',
    auditor: 'Auditor',
    empleado: 'Empleado',
  };

  const userEmail = user?.email || '';
  const userInitials = userEmail.substring(0, 2).toUpperCase();
  const avatarUrl = user?.user_metadata?.avatar_url;
  const primaryRole = roles[0] ? roleLabels[roles[0]] || roles[0] : 'Usuario';

  return (
    <div className="border-t border-sidebar-border p-3">
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-sidebar-accent/50 transition-colors",
              collapsed ? "justify-center" : ""
            )}
          >
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-sidebar-accent-foreground">{userInitials}</span>
              )}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{userEmail}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{primaryRole}</p>
              </div>
            )}
            {!collapsed && (
              <ChevronDown className="w-4 h-4 text-sidebar-foreground/50" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="start" 
          className="w-64 p-0 bg-popover border border-border shadow-lg"
          sideOffset={8}
        >
          <div className="p-4 border-b border-border">
            <p className="text-sm font-medium text-foreground">{userEmail}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
              {primaryRole}
            </span>
          </div>
          <div className="p-2">
            <button
              onClick={() => navigate('/perfil')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors"
            >
              <Users className="w-4 h-4" />
              Mi Perfil
            </button>
            <button
              onClick={() => navigate('/configuracion')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configuración
            </button>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
