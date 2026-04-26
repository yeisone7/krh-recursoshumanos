import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { motion, AnimatePresence } from 'framer-motion';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import { useContractExpiryNotifications } from '@/hooks/useContractExpiryNotifications';
import { MobileBottomNav } from './MobileBottomNav';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, permissionsLoaded } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const isMobile = useIsMobile();
  const showAiButton = permissionsLoaded && hasPermission('asistente_ia') && location.pathname !== '/asistente-ia';
  useInactivityTimeout();
  useContractExpiryNotifications();

  useSwipeGesture({
    onSwipeRight: () => setMobileOpen(true),
    onSwipeLeft: () => setMobileOpen(false),
    enabled: isMobile,
  });

  // Show swipe hint briefly on first mobile load
  useEffect(() => {
    if (!isMobile) return;
    const key = 'swipe-hint-shown';
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    setShowSwipeHint(true);
    const timer = setTimeout(() => setShowSwipeHint(false), 3000);
    return () => clearTimeout(timer);
  }, [isMobile]);

  useEffect(() => {
    const trackedModules = ['/empleados', '/contratos', '/dotacion', '/examenes', '/alertas'];
    if (trackedModules.some((path) => location.pathname.startsWith(path))) {
      sessionStorage.setItem('krh_last_module_path', location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile swipe indicator */}
      {isMobile && !mobileOpen && (
        <AnimatePresence>
          {showSwipeHint && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.4 }}
              className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1"
            >
              <div className="w-1 h-16 rounded-r-full bg-primary/40" />
              <motion.div
                animate={{ x: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                className="text-xs text-primary/60 font-medium"
              >
                ›
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Persistent subtle edge indicator */}
      {isMobile && !mobileOpen && !showSwipeHint && (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 w-0.5 h-10 rounded-r-full bg-primary/20" />
      )}

      {/* Desktop sidebar */}
      {!isMobile && <Sidebar />}

      {/* Mobile sidebar drawer */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-sidebar-border [&>button]:hidden">
            <Sidebar isMobileDrawer onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onMobileMenuToggle={isMobile ? () => setMobileOpen(true) : undefined}
        />
        <main className={`flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 ${isMobile ? 'pb-20' : ''}`}>
          {children}
        </main>
      </div>

      {isMobile && <MobileBottomNav />}

      {showAiButton && (
        <Button
          type="button"
          size="icon"
          aria-label="Abrir Asistente IA"
          title="Asistente IA"
          onClick={() => navigate('/asistente-ia')}
          className={`fixed ${isMobile ? 'bottom-24 right-4' : 'bottom-6 right-6'} z-50 h-14 w-14 rounded-full shadow-lg [&_svg]:size-11`}
        >
          <Bot className="size-11" />
        </Button>
      )}
    </div>
  );
}
