import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Stethoscope,
  Package,
  LogOut,
  HeartPulse,
  Gavel,
  Palmtree,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, href: '/' },
  { label: 'Empleados', icon: <Users className="w-5 h-5" />, href: '/empleados' },
  { label: 'Contratos', icon: <FileText className="w-5 h-5" />, href: '/contratos' },
  { label: 'Vacaciones', icon: <Palmtree className="w-5 h-5" />, href: '/vacaciones' },
  { label: 'Permisos', icon: <ClipboardList className="w-5 h-5" />, href: '/permisos' },
  { label: 'Incapacidades', icon: <HeartPulse className="w-5 h-5" />, href: '/incapacidades' },
  { label: 'Disciplinarios', icon: <Gavel className="w-5 h-5" />, href: '/disciplinarios' },
  { label: 'Dotación', icon: <Package className="w-5 h-5" />, href: '/dotacion' },
  { label: 'Exámenes Médicos', icon: <Stethoscope className="w-5 h-5" />, href: '/examenes' },
  { label: 'Selección', icon: <UserSearch className="w-5 h-5" />, href: '/seleccion' },
  { label: 'Vacantes', icon: <Briefcase className="w-5 h-5" />, href: '/vacantes' },
];

const secondaryNavItems: NavItem[] = [
  { label: 'Alertas', icon: <Bell className="w-5 h-5" />, href: '/alertas', badge: 5 },
  { label: 'Centros', icon: <Building2 className="w-5 h-5" />, href: '/centros' },
  { label: 'Jornadas', icon: <Calendar className="w-5 h-5" />, href: '/jornadas' },
  { label: 'Seguridad', icon: <ShieldCheck className="w-5 h-5" />, href: '/seguridad' },
  { label: 'Configuración', icon: <Settings className="w-5 h-5" />, href: '/configuracion' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href;
    
    return (
      <Link to={item.href}>
        <motion.div
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
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

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen bg-sidebar flex flex-col border-r border-sidebar-border"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="full-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">K</span>
              </div>
              <span className="font-display font-bold text-xl text-sidebar-primary">KRH</span>
            </motion.div>
          ) : (
            <motion.div
              key="icon-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center mx-auto"
            >
              <span className="text-lg font-bold text-primary-foreground">K</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-3 p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <div className="my-4 mx-3 border-t border-sidebar-border" />

        <div className="space-y-1">
          {secondaryNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg",
          collapsed ? "justify-center" : ""
        )}>
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-semibold text-sidebar-accent-foreground">JD</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">Juan Díaz</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">Administrador</p>
            </div>
          )}
          {!collapsed && (
            <button className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}