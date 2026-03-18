import { useState, useCallback, useEffect } from 'react';
import { Search, Building2, LogOut, User, Settings, BookOpen, Menu, Moon, Sun, Maximize, Minimize } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user, companies, currentCompanyId, setCurrentCompanyId, roles, signOut } = useAuth();
  const [manualOpen, setManualOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const currentCompany = companies.find(c => c.id === currentCompanyId);
  const userInitials = user?.email?.substring(0, 2).toUpperCase() || 'U';

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    rrhh: 'RRHH',
    psicologo: 'Psicólogo',
    jefe_area: 'Jefe de Área',
    auditor: 'Auditor',
  };

  return (
    <>
      <header className="h-14 sm:h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4">
        {/* Mobile menu button */}
        {onMobileMenuToggle && (
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 md:hidden" onClick={onMobileMenuToggle}>
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {/* Search trigger - desktop: inline bar, mobile: icon button */}
        <div className="flex-1 max-w-md hidden sm:block">
          <button
            onClick={() => setCommandOpen(true)}
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-transparent hover:border-border text-sm text-muted-foreground text-left transition-all relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
          className="h-9 w-9 sm:hidden"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="w-5 h-5 text-muted-foreground" />
        </Button>

        {/* Spacer for mobile */}
        <div className="flex-1 sm:hidden" />

        {/* Right section */}
        <div className="flex items-center gap-1 sm:gap-4">
          {/* Company selector - hidden on mobile, shown from md */}
          {companies.length > 0 && (
            <div className="hidden md:flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <Select 
                value={currentCompanyId || undefined} 
                onValueChange={setCurrentCompanyId}
              >
                <SelectTrigger className="w-[200px] h-9 text-sm border-0 bg-muted/50 hover:bg-muted focus:ring-1 focus:ring-primary/20">
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* No company message */}
          {companies.length === 0 && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span>Sin empresa asignada</span>
            </div>
          )}

          {/* Manual shortcut - hidden on mobile */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hidden sm:inline-flex"
                onClick={() => setManualOpen(true)}
              >
                <BookOpen className="w-4 h-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Manual de Usuario</TooltipContent>
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
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

          {/* Notifications */}
          <NotificationsPanel />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium leading-none truncate">{user?.email}</p>
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
