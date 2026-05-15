import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Shield, Building2, MapPin, UserX, Link, UserCheck, UserMinus, AlertTriangle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { UserRoleDialog } from './UserRoleDialog';
import { UserCenterDialog } from './UserCenterDialog';
import { UserCompanyDialog } from './UserCompanyDialog';
import { LinkEmployeeDialog } from './LinkEmployeeDialog';
import { useRemoveCompanyAssignment, useToggleUserStatus, type AdminUser } from '@/hooks/useAdminUsers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { MobileCardList } from '@/components/shared/MobileCardList';

// Helper to get display name with fallbacks
function getUserDisplayName(user: AdminUser): string {
  if (user.full_name) return user.full_name;
  if (user.display_name) return user.display_name;
  if (user.email) return user.email.split('@')[0];
  return user.id.slice(0, 8) + '...';
}

// Helper to get initials for avatar
function getUserInitials(user: AdminUser): string {
  if (user.full_name) {
    const parts = user.full_name.split(' ');
    return parts.length >= 2 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  if (user.display_name) return user.display_name.slice(0, 2).toUpperCase();
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  return user.id.slice(0, 2).toUpperCase();
}

type AppRole = Database['public']['Enums']['app_role'];

const ROLE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  admin: { label: 'Admin', variant: 'default' },
  rrhh: { label: 'RRHH', variant: 'secondary' },
  psicologo: { label: 'Psicólogo', variant: 'outline' },
  jefe_area: { label: 'Jefe Área', variant: 'outline' },
  auditor: { label: 'Auditor', variant: 'outline' },
  empleado: { label: 'Empleado', variant: 'outline' },
};

interface UsersTableProps {
  users: AdminUser[];
  isLoading: boolean;
}

export function UsersTable({ users, isLoading }: UsersTableProps) {
  const { currentCompanyId, user: currentUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [centerDialogOpen, setCenterDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [userToToggle, setUserToToggle] = useState<AdminUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const removeCompany = useRemoveCompanyAssignment();
  const toggleStatus = useToggleUserStatus();

  const renderActionsMenu = (user: AdminUser) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleManageRoles(user)}>
          <Shield className="w-4 h-4 mr-2" />
          Gestionar Roles
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleManageCenters(user)}>
          <MapPin className="w-4 h-4 mr-2" />
          Asignar Centros
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleManageCompanies(user)}>
          <Building2 className="w-4 h-4 mr-2" />
          Asignar Empresas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLinkEmployee(user)}>
          <Link className="w-4 h-4 mr-2" />
          Vincular Empleado
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleToggleStatus(user)} disabled={user.id === currentUser?.id}>
          {user.is_active ? (
            <>
              <UserMinus className="w-4 h-4 mr-2" />
              Desactivar Usuario
            </>
          ) : (
            <>
              <UserCheck className="w-4 h-4 mr-2" />
              Activar Usuario
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => handleRemoveFromCompany(user)}
          disabled={user.id === currentUser?.id}
        >
          <UserX className="w-4 h-4 mr-2" />
          Eliminar de Empresa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u => 
      getUserDisplayName(u).toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.roles.some(r => r.toLowerCase().includes(q)) ||
      u.custom_roles.some(r => r.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  const handleManageRoles = (user: AdminUser) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const handleManageCenters = (user: AdminUser) => {
    setSelectedUser(user);
    setCenterDialogOpen(true);
  };

  const handleManageCompanies = (user: AdminUser) => {
    setSelectedUser(user);
    setCompanyDialogOpen(true);
  };

  const handleLinkEmployee = (user: AdminUser) => {
    setSelectedUser(user);
    setLinkDialogOpen(true);
  };

  const handleRemoveFromCompany = async (user: AdminUser) => {
    if (!currentCompanyId) return;
    
    // Don't allow removing yourself
    if (user.id === currentUser?.id) {
      toast.error('No puedes eliminarte a ti mismo de la empresa');
      return;
    }

    try {
      await removeCompany.mutateAsync({ userId: user.id, companyId: currentCompanyId });
      toast.success('Usuario eliminado de la empresa');
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  const handleToggleStatus = (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      toast.error('No puedes desactivarte a ti mismo');
      return;
    }

    if (user.is_active) {
      // Opening dialog to deactivate
      setUserToToggle(user);
      setDeactivateReason('');
      setDeactivateDialogOpen(true);
    } else {
      // Activate directly
      confirmToggleStatus(user, true);
    }
  };

  const confirmToggleStatus = async (user: AdminUser, activate: boolean, reason?: string) => {
    try {
      await toggleStatus.mutateAsync({
        userId: user.id,
        isActive: activate,
        reason: reason,
      });
      toast.success(activate ? 'Usuario activado' : 'Usuario desactivado');
      setDeactivateDialogOpen(false);
      setUserToToggle(null);
    } catch (error) {
      toast.error('Error al cambiar estado del usuario');
    }
  };

  if (isLoading) {
    return (
      <>
      <div className="space-y-3 md:hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="card-elevated space-y-3 p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-background animate-pulse" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-background animate-pulse" />
                <div className="h-3 w-44 rounded bg-background animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-10 rounded bg-background animate-pulse" />
              <div className="h-10 rounded bg-background animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Roles por empresa</TableHead>
              <TableHead>Empresas</TableHead>
              <TableHead>Centros</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map(i => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 bg-background rounded animate-pulse w-32" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-background rounded animate-pulse w-16" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-background rounded animate-pulse w-20" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-background rounded animate-pulse w-24" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-background rounded animate-pulse w-20" />
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      </>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center sm:p-12">
        <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Sin usuarios</h3>
        <p className="text-muted-foreground">
          No hay usuarios asignados a esta empresa. Invita usuarios para comenzar.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Search bar */}
      <div className="relative group px-2 mb-8">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
        </div>
        <Input
          placeholder="BUSCAR OPERADOR POR NOMBRE, EMAIL O ROL ESTRATÉGICO..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-12 rounded-2xl bg-white/50 border-slate-200 focus:bg-white focus:border-primary focus:ring-primary/10 transition-all font-bold text-[10px] uppercase tracking-widest"
        />
      </div>

      <MobileCardList
        className="md:hidden"
        emptyMessage="No se encontraron usuarios"
        items={filteredUsers.map(user => ({
          id: user.id,
          title: (
            <span>
              {getUserDisplayName(user)}
              {user.id === currentUser?.id && <span className="ml-1.5 text-xs text-muted-foreground">(Tú)</span>}
            </span>
          ),
          subtitle: user.email || 'Sin correo registrado',
          badge: (
            <Badge
              variant={user.is_active ? 'outline' : 'secondary'}
              className={user.is_active ? 'bg-success-light text-success border-success/20' : 'bg-background text-muted-foreground'}
            >
              {user.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
          fields: [
            {
              label: 'Roles',
              value: user.custom_roles.length === 0 && user.roles.length === 0 ? (
                <span className="text-muted-foreground italic">Sin roles</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {user.custom_roles.map(role => <Badge key={role} variant="secondary" className="text-xs">{role}</Badge>)}
                  {user.roles.map(role => (
                    <Badge key={role} variant={ROLE_LABELS[role]?.variant || 'outline'} className="text-xs">
                      {ROLE_LABELS[role]?.label || role}
                    </Badge>
                  ))}
                </div>
              ),
              className: 'col-span-2',
            },
            {
              label: 'Empresas',
              value: user.companies.length === 0 ? '—' : `${user.companies.length}`,
            },
            {
              label: 'Centros',
              value: user.centers.length === 0 ? 'Todos' : `${user.centers.length}`,
            },
          ],
          actions: (
            <>
              <div className="flex items-center gap-2">
                <Switch
                  checked={user.is_active}
                  onCheckedChange={() => handleToggleStatus(user)}
                  disabled={user.id === currentUser?.id || toggleStatus.isPending}
                  className="data-[state=checked]:bg-success"
                />
                <span className="text-sm text-muted-foreground">Estado</span>
              </div>
              {renderActionsMenu(user)}
            </>
          ),
          itemClassName: !user.is_active ? 'opacity-60' : undefined,
        }))}
      />

      <div className="hidden md:block rounded-[2.5rem] bg-background border border-border/40 overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
        <Table className="min-w-[860px]">
          <TableHeader className="bg-background">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identidad Digital</TableHead>
              <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[150px]">Estado Acceso</TableHead>
              <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Asignación de Roles</TableHead>
              <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estructura Corporativa</TableHead>
              <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nodos de Operación</TableHead>
              <TableHead className="w-[80px] px-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map(user => (
              <TableRow key={user.id} className={cn(
                "group hover:bg-primary/[0.02] transition-colors border-slate-50",
                !user.is_active && "opacity-60 grayscale-[0.5]"
              )}>
                <TableCell className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <Avatar className={cn(
                      "h-12 w-12 rounded-2xl border border-slate-100 transition-transform group-hover:scale-110",
                      !user.is_active && "opacity-50"
                    )}>
                      <AvatarImage src={user.avatar_url} alt={getUserDisplayName(user)} />
                      <AvatarFallback className={cn(
                        "font-black text-xs",
                        user.is_active ? 'bg-primary/10 text-primary' : 'bg-background text-slate-400'
                      )}>
                        {getUserInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 uppercase tracking-tight leading-none mb-1 flex items-center gap-2">
                        {getUserDisplayName(user)}
                        {user.id === currentUser?.id && (
                          <Badge className="bg-primary/10 text-primary border-none font-black text-[8px] px-1.5 h-4 uppercase tracking-widest">TÚ</Badge>
                        )}
                      </div>
                      {user.email && (
                        <p className="text-[10px] font-bold text-slate-400 lowercase tracking-tight truncate">{user.email}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={() => handleToggleStatus(user)}
                      disabled={user.id === currentUser?.id || toggleStatus.isPending}
                      className="data-[state=checked]:bg-emerald-500 scale-90"
                    />
                    <Badge 
                      variant="outline"
                      className={cn(
                        "font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest",
                        user.is_active 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                          : 'bg-background border-slate-100 text-slate-400'
                      )}
                    >
                      {user.is_active ? 'ACTIVO' : 'INACTIVO'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="px-8 py-6">
                  <div className="flex flex-wrap gap-1.5">
                    {user.custom_roles.length === 0 && user.roles.length === 0 ? (
                      <span className="text-[10px] font-bold text-slate-300 uppercase italic">Sin roles</span>
                    ) : (
                      <>
                      {user.custom_roles.map(role => (
                        <Badge key={role} variant="secondary" className="bg-background text-slate-600 border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">
                          {role}
                        </Badge>
                      ))}
                      {user.roles.map(role => (
                        <Badge 
                          key={role} 
                          variant="outline"
                          className={cn(
                            "font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest border-primary/20",
                            ROLE_LABELS[role]?.variant === 'default' ? 'text-primary' : 'bg-background text-slate-500'
                          )}
                        >
                          {ROLE_LABELS[role]?.label || role}
                        </Badge>
                      ))}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-8 py-6">
                  <div className="flex flex-wrap gap-1.5">
                    {user.companies.map(company => (
                      <Badge key={company.id} variant="outline" className="bg-white border-slate-100 text-slate-500 font-bold text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {company.name}
                      </Badge>
                    ))}
                    {user.companies.length === 0 && <span className="text-[10px] font-bold text-slate-300 uppercase italic">Sin asignar</span>}
                  </div>
                </TableCell>
                <TableCell className="px-8 py-6">
                  <div className="flex flex-wrap gap-1.5">
                    {user.centers.length === 0 ? (
                      <Badge variant="outline" className="bg-emerald-50 border-emerald-100 text-emerald-600 font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">Global</Badge>
                    ) : (
                      user.centers.slice(0, 2).map(center => (
                        <Badge key={center.id} variant="outline" className="bg-white border-slate-100 text-slate-500 font-bold text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {center.name}
                        </Badge>
                      ))
                    )}
                    {user.centers.length > 2 && (
                      <Badge variant="outline" className="bg-background border-slate-200 text-slate-400 font-black text-[9px] px-2 py-0.5 rounded-lg">
                        +{user.centers.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-8 py-6 text-right">
                  {renderActionsMenu(user)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      <UserRoleDialog
        user={selectedUser}
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
      />

      <UserCenterDialog
        user={selectedUser}
        open={centerDialogOpen}
        onOpenChange={setCenterDialogOpen}
      />

      <UserCompanyDialog
        user={selectedUser}
        open={companyDialogOpen}
        onOpenChange={setCompanyDialogOpen}
      />

      <LinkEmployeeDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        userId={selectedUser?.id || ''}
        userEmail={selectedUser?.email}
      />

      {/* Deactivation Confirmation Dialog */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden">
          <AlertDialogHeader className="shrink-0">
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Desactivar Usuario
            </AlertDialogTitle>
            <AlertDialogDescription>
              El usuario no podrá acceder al sistema mientras esté desactivado. 
              Puedes reactivarlo en cualquier momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4 pr-1">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo de desactivación (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Ej: Licencia sin sueldo, Suspensión temporal..."
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter className="shrink-0 flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToToggle && confirmToggleStatus(userToToggle, false, deactivateReason)}
              className="w-full bg-warning text-warning-foreground hover:bg-warning/90 sm:w-auto"
            >
              <UserMinus className="w-4 h-4 mr-2" />
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
