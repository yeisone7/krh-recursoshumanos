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
                  animate={active ? { y: -14, scale: 1 } : { y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="relative"
                >
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-full transition-colors duration-300',
                      active
                        ? 'w-12 h-12 text-white shadow-lg ring-[3px] ring-background'
                        : 'w-9 h-9 text-muted-foreground'
                    )}
                    style={active ? { backgroundColor: '#e76921' } : undefined}
                  >
                    <item.icon className={cn(active ? 'w-5 h-5' : 'w-5 h-5')} strokeWidth={active ? 2.2 : 1.8} />
                  </div>
                </motion.div>

                {/* Label */}
                <motion.span
                  animate={active ? { y: -4 } : { y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={cn(
                    'text-[10px] leading-tight truncate max-w-full transition-colors duration-200',
                    active ? 'font-bold' : 'text-muted-foreground font-medium'
                  )}
                  style={active ? { color: '#e76921' } : undefined}
                >
                  {item.label}
                </motion.span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
