import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Clock, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md safe-area-bottom md:hidden">
      <div className="flex items-end justify-around px-1 pt-1 pb-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg transition-all duration-200 min-w-0 flex-1',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center rounded-full transition-all duration-300',
                  active
                    ? 'w-11 h-11 -mt-5 bg-primary text-primary-foreground shadow-lg ring-4 ring-background'
                    : 'w-8 h-8'
                )}
              >
                <item.icon className={cn(active ? 'w-5 h-5' : 'w-5 h-5')} />
              </div>
              <span
                className={cn(
                  'text-[10px] leading-tight truncate max-w-full',
                  active ? 'font-semibold' : 'font-medium'
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
