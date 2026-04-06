import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Clock, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Empleados', path: '/empleados', icon: Users },
  { label: 'Contratos', path: '/contratos', icon: FileText },
  { label: 'Jornadas', path: '/jornadas', icon: Clock },
  { label: 'Capacitaciones', path: '/capacitaciones', icon: GraduationCap },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const activeIndex = navItems.findIndex((item) => isActive(item.path));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Background with top curve illusion */}
      <div className="relative bg-muted/80 backdrop-blur-lg border-t border-border/50">

        <div className="flex items-end justify-around px-1 pt-2 pb-2 safe-area-bottom">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-0.5 min-w-0 flex-1 relative"
              >
                {/* Icon container */}
                <motion.div
                  animate={active ? { y: -20 } : { y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="relative"
                >
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-full transition-colors duration-300',
                      active
                        ? 'w-13 h-13 bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(0,0,0,0.25)] ring-[4px] ring-background'
                        : 'w-9 h-9 text-muted-foreground'
                    )}
                  >
                    <item.icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                  </div>
                </motion.div>

                {/* Label - always aligned at the same position */}
                <span
                  className={cn(
                    'text-[10px] leading-tight truncate max-w-full transition-colors duration-200',
                    active ? 'text-primary font-bold' : 'text-muted-foreground font-medium'
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
