import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Users, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef, useLayoutEffect, useState, useEffect } from 'react';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Contratos', path: '/contratos', icon: FileText },
  { label: 'Empleados', path: '/empleados', icon: Users },
  { label: 'Jornadas', path: '/jornadas', icon: Clock },
  { label: 'Capacitación', path: '/capacitaciones', icon: BookOpen },
];

const STORAGE_KEY = 'mobile-nav-prev-index';
const MOBILE_NAV_COLOR = '#1192cb';
const MOBILE_NAV_BORDER_COLOR = '#0f83b7';
const MOBILE_NAV_SHADOW = 'rgba(17, 146, 203, 0.28)';

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorX, setIndicatorX] = useState<number | null>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  const navTextColor = 'hsl(var(--primary-foreground))';
  const navIconMutedColor = 'hsl(var(--primary-foreground) / 0.9)';

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
    const x = elRect.left - containerRect.left + elRect.width / 2 - 32; // 32 = half of indicator size (w-16 = 64px / 2)
    setIndicatorX(x);
  }, [activeIndex]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div
        ref={containerRef}
        className="relative border-t"
        style={{
          backgroundColor: MOBILE_NAV_COLOR,
          borderColor: MOBILE_NAV_BORDER_COLOR,
          boxShadow: `0 -4px 12px -2px ${MOBILE_NAV_SHADOW}`,
        }}
      >
        {/* Floating active indicator */}
        {indicatorX !== null && activeIndex >= 0 && (
          <div
            className="absolute -top-7 z-10 flex items-center justify-center w-16 h-16 rounded-full shadow-lg"
            style={{
              left: `${indicatorX}px`,
              backgroundColor: 'hsl(var(--card))',
              borderColor: MOBILE_NAV_COLOR,
              borderWidth: '4px',
              borderStyle: 'solid',
              boxShadow: '0 6px 16px -3px rgba(0, 0, 0, 0.35)',
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
                  style={{ color: MOBILE_NAV_COLOR }}
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
                    style={{ color: navIconMutedColor }}
                  />
                </div>

                {/* Label */}
                <span
                  className="text-[10px] leading-tight truncate max-w-full transition-colors duration-200"
                  style={{
                    color: navTextColor,
                    opacity: active ? 1 : 0.9,
                    fontWeight: active ? 700 : 600,
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
