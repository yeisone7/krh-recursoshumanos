import { ReactNode, PointerEvent, useState, useEffect, useRef } from 'react';
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
import { Bot, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { AiChatPanel } from '@/components/ai/AiChatPanel';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, permissionsLoaded } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiPanelHeight, setAiPanelHeight] = useState(0);
  const [aiPanelMinimized, setAiPanelMinimized] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [aiButtonLifted, setAiButtonLifted] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const dragStartRef = useRef<{ y: number; height: number } | null>(null);
  const isMobile = useIsMobile();
  const isAiAssistant = location.pathname === '/asistente-ia';
  const showAiButton = permissionsLoaded && hasPermission('asistente_ia');
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
    if (location.pathname === '/asistente-ia') setAiPanelOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!aiPanelOpen || aiPanelMinimized) return;

    const updatePanelHeight = () => {
      const viewportHeight = window.innerHeight;
      setAiPanelHeight(isMobile ? Math.round(viewportHeight * 0.84) : Math.min(680, viewportHeight - 48));
    };

    updatePanelHeight();
    window.addEventListener('resize', updatePanelHeight);
    return () => window.removeEventListener('resize', updatePanelHeight);
  }, [aiPanelOpen, aiPanelMinimized, isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setAiButtonLifted(false);
      return;
    }

    const main = mainRef.current;
    if (!main) return;

    const handleScroll = () => setAiButtonLifted(main.scrollTop > 24);
    handleScroll();
    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => main.removeEventListener('scroll', handleScroll);
  }, [isMobile, location.pathname]);

  const handleAiPanelDragStart = (event: PointerEvent<HTMLDivElement>) => {
    if (aiPanelMinimized) return;
    const currentHeight = aiPanelHeight || Math.round(window.innerHeight * (isMobile ? 0.84 : 0.78));
    dragStartRef.current = { y: event.clientY, height: currentHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleAiPanelDrag = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;

    const deltaY = event.clientY - start.y;
    const minHeight = isMobile ? Math.max(280, window.innerHeight * 0.38) : 420;
    const maxHeight = isMobile ? window.innerHeight * 0.9 : window.innerHeight - 48;
    setAiPanelHeight(Math.round(Math.min(maxHeight, Math.max(minHeight, start.height - deltaY))));
  };

  const handleAiPanelDragEnd = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start) return;

    const draggedDown = event.clientY - start.y;
    if (draggedDown > (isMobile ? 130 : 180)) {
      setAiPanelOpen(false);
      setAiPanelMinimized(false);
    }
  };

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
        <main ref={mainRef} className={`flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 ${isMobile ? 'pb-24' : ''}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isAiAssistant ? 'ai-assistant' : location.pathname}
              initial={isAiAssistant ? { opacity: 0, scale: 0.98, y: 8 } : { opacity: 1, scale: 1, y: 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={isAiAssistant ? { opacity: 0, scale: 0.98, y: 8 } : { opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {isMobile && <MobileBottomNav />}

      <AnimatePresence>
        {showAiButton && !isAiAssistant && aiPanelOpen && (
          <motion.div
            initial={isMobile ? { y: 80, opacity: 0 } : { x: 40, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={isMobile ? { y: 80, opacity: 0 } : { x: 40, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={isMobile
              ? 'fixed inset-x-2 bottom-0 z-[60] overflow-hidden rounded-t-xl border border-border bg-card shadow-2xl'
              : 'fixed bottom-6 right-6 z-[60] w-[440px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-2xl'}
            style={{ height: aiPanelHeight || undefined }}
          >
            <div
              role="button"
              tabIndex={0}
              aria-label="Arrastrar para ajustar o cerrar el asistente"
              onPointerDown={handleAiPanelDragStart}
              onPointerMove={handleAiPanelDrag}
              onPointerUp={handleAiPanelDragEnd}
              onPointerCancel={handleAiPanelDragEnd}
              className="flex h-7 touch-none cursor-ns-resize items-center justify-center border-b border-border bg-card"
            >
              <span className="h-1.5 w-16 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="h-[calc(100%-1.75rem)] min-h-0">
              <AiChatPanel compact onClose={() => setAiPanelOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showAiButton && (
        <Button
          type="button"
          size="icon"
          aria-label={isAiAssistant ? 'Minimizar Asistente IA' : 'Abrir Asistente IA'}
          title={isAiAssistant ? 'Minimizar Asistente IA' : 'Asistente IA'}
          onClick={() => {
            if (!isAiAssistant) {
              setAiPanelOpen(true);
              return;
            }
            if (isAiAssistant) {
              navigate(sessionStorage.getItem('krh_last_module_path') || '/');
              return;
            }
            navigate('/asistente-ia');
          }}
          className={`fixed ${isMobile ? aiPanelOpen && !isAiAssistant ? 'hidden' : '' : aiPanelOpen && !isAiAssistant ? 'hidden bottom-6 right-6' : 'bottom-6 right-6'} z-50 h-14 w-14 rounded-full shadow-lg transition-[bottom,right] duration-200 [&_svg]:size-[1.575rem] sm:[&_svg]:size-[1.8rem]`}
          style={isMobile ? {
            bottom: `calc(env(safe-area-inset-bottom, 0px) + ${isAiAssistant ? '10rem' : aiButtonLifted ? '7.25rem' : '5.75rem'})`,
            right: 'calc(env(safe-area-inset-right, 0px) + 1rem)',
          } : undefined}
        >
          {isAiAssistant ? <Minimize2 className="size-[1.575rem] sm:size-[1.8rem]" /> : <Bot className="size-[1.575rem] sm:size-[1.8rem]" />}
        </Button>
      )}
    </div>
  );
}
