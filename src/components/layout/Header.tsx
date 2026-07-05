import { useState, useCallback, useEffect } from 'react';
import { Search, Building2, LogOut, User, Settings, BookOpen, Menu, Moon, Sun, Maximize, Minimize, Clock, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';
import { UserManualDialog } from '@/components/manual/UserManualDialog';
import { useTheme } from '@/hooks/useTheme';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { useChatUnreadCount } from '@/hooks/useChat';
import { useChatPushSubscription } from '@/hooks/useChatPushSubscription';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user, profile, companies, roles, signOut, permissionsLoaded, hasPermission } = useAuth();
  const [manualOpen, setManualOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const showChatButton = permissionsLoaded && hasPermission('chat', 'view');
  const { data: chatUnreadCount = 0 } = useChatUnreadCount(showChatButton);
  useChatPushSubscription(showChatButton);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = now.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  const formattedTime = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const cleanText = (value?: string | null) => value?.trim() || '';
  const userDisplayName =
    cleanText(profile?.full_name) ||
    cleanText(profile?.display_name) ||
    cleanText(user?.user_metadata?.full_name) ||
    [cleanText(user?.user_metadata?.first_name), cleanText(user?.user_metadata?.last_name)].filter(Boolean).join(' ') ||
    cleanText(user?.user_metadata?.name) ||
    'Usuario';

  const userInitials = userDisplayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    rrhh: 'RRHH',
    psicologo: 'Psicólogo',
    jefe_area: 'Jefe de Área',
    auditor: 'Auditor',
  };

  return (
    <>
      <header className="h-12 sm:h-14 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 gap-2 sm:gap-3">
        {/* Mobile menu button */}
        {onMobileMenuToggle && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 md:hidden" onClick={onMobileMenuToggle}>
            <Menu className="w-4 h-4" />
          </Button>
        )}

        {/* Search trigger - desktop: inline bar, mobile: icon button */}
        <div className="flex-1 max-w-[420px] hidden sm:block">
          <button
            onClick={() => setCommandOpen(true)}
            className="w-full h-9 pl-9 pr-4 rounded-md bg-background border border-border/70 hover:border-primary/30 text-sm text-muted-foreground text-left transition-colors relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <span>Buscar empleados, módulos... </span>
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Mobile search icon */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:hidden"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="w-4 h-4 text-muted-foreground" />
        </Button>

        {/* Spacer for mobile */}
        <div className="flex-1 sm:hidden" />

        {/* Right section */}
        <div className="flex items-center gap-1 sm:gap-2.5">
          {/* Date & Time - desktop only */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="capitalize">{formattedDate}</span>
            <span className="font-mono font-medium text-foreground">{formattedTime}</span>
          </div>
          {/* No company message */}
          {companies.length === 0 && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span>Sin empresa asignada</span>
            </div>
          )}




          {/* Fullscreen toggle - desktop only */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hidden sm:inline-flex"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Maximize className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}</TooltipContent>
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Moon className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</TooltipContent>
          </Tooltip>

          {/* Internal chat */}
          {showChatButton && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8" asChild>
                  <Link to="/chat" aria-label="Abrir chat">
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    {chatUnreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground ring-2 ring-card">
                        {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                      </span>
                    )}
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Chat interno</TooltipContent>
            </Tooltip>
          )}

          {/* Notifications */}
          <NotificationsPanel />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium leading-none truncate">{userDisplayName}</p>
                  {user?.email && (
                    <p className="text-xs text-muted-foreground leading-none truncate">{user.email}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {roles.map((role) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {roleLabels[role] || role}
                      </Badge>
                    ))}
                    {roles.length === 0 && (
                      <span className="text-xs text-muted-foreground">Sin rol asignado</span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/perfil" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Mi Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/configuracion" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setManualOpen(true)}>
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Manual de Usuario</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <UserManualDialog open={manualOpen} onOpenChange={setManualOpen} />
    </>
  );
}
