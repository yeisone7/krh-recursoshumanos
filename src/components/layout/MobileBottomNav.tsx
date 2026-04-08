import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Clock, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef, useLayoutEffect, useState, useEffect } from 'react';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Empleados', path: '/empleados', icon: Users },
  { label: 'Contratos', path: '/contratos', icon: FileText },
  { label: 'Jornadas', path: '/jornadas', icon: Clock },
  { label: 'Capacitaciones', path: '/capacitaciones', icon: GraduationCap },
];

const STORAGE_KEY = 'mobile-nav-prev-index';

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorX, setIndicatorX] = useState<number | null>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const activeIndex = navItems.findIndex((item) => isActive(item.path));

  // Restore previous index for initial animation
  useEffect(() => {
    const prev = sessionStorage.getItem(STORAGE_KEY);
    if (prev !== null) {
      setHasAnimated(true);
    }
  }, []);

  // Persist active index
  useEffect(() => {
    if (activeIndex >= 0) {
      sessionStorage.setItem(STORAGE_KEY, String(activeIndex));
    }
  }, [activeIndex]);

  // Calculate indicator position
  useLayoutEffect(() => {
    const el = itemsRef.current[activeIndex];
    const container = containerRef.current;
    if (!el || !container) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const x = elRect.left - containerRect.left + elRect.width / 2 - 24; // 24 = half of indicator size (w-12 = 48px / 2)
    setIndicatorX(x);
  }, [activeIndex]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div
        ref={containerRef}
        className="relative border-t"
        style={{
          backgroundColor: 'hsl(var(--card))',
          borderColor: 'hsl(var(--border))',
          boxShadow: '0 -4px 12px -2px hsl(var(--foreground) / 0.06)',
        }}
      >
        {/* Floating active indicator */}
        {indicatorX !== null && activeIndex >= 0 && (
          <div
            className="absolute -top-5 z-10 flex items-center justify-center w-12 h-12 rounded-full shadow-lg"
            style={{
              left: `${indicatorX}px`,
              backgroundColor: '#e76921',
              borderColor: 'hsl(var(--card))',
              borderWidth: '4px',
              borderStyle: 'solid',
              boxShadow: '0 4px 14px -2px rgba(231, 105, 33, 0.4)',
              transition: hasAnimated
                ? 'transform 1s cubic-bezier(0.22, 1, 0.36, 1), left 1s cubic-bezier(0.22, 1, 0.36, 1)'
                : 'none',
            }}
          >
            {(() => {
              const ActiveIcon = navItems[activeIndex]?.icon;
              return ActiveIcon ? (
                <ActiveIcon
                  className="w-5 h-5"
                  strokeWidth={2.2}
                  style={{ color: 'hsl(var(--primary-foreground))' }}
                />
              ) : null;
            })()}
          </div>
        )}

        <div className="flex items-end justify-around px-1 pt-3 pb-2 safe-area-bottom">
          {navItems.map((item, index) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                ref={(el) => { itemsRef.current[index] = el; }}
                onClick={() => {
                  if (!hasAnimated) setHasAnimated(true);
                  navigate(item.path);
                }}
                className="flex flex-col items-center gap-1 min-w-0 flex-1 relative pb-0.5"
              >
                {/* Inline icon — hidden when active */}
                <div
                  className="flex items-center justify-center w-6 h-6 transition-all duration-300"
                  style={{
                    opacity: active ? 0 : 1,
                    transform: active ? 'scale(0.5)' : 'scale(1)',
                  }}
                >
                  <item.icon
                    className="w-5 h-5"
                    strokeWidth={1.8}
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                  />
                </div>

                {/* Label */}
                <span
                  className="text-[10px] leading-tight truncate max-w-full transition-colors duration-200"
                  style={{
                    color: active ? '#e76921' : 'hsl(var(--muted-foreground))',
                    fontWeight: active ? 600 : 500,
                  }}
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
