import { useState, useMemo } from 'react';
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
import { MoreHorizontal, Shield, Building2, MapPin, UserX, Link, UserCheck, UserMinus, AlertTriangle } from 'lucide-react';
import { UserRoleDialog } from './UserRoleDialog';
import { UserCenterDialog } from './UserCenterDialog';
import { LinkEmployeeDialog } from './LinkEmployeeDialog';
import { useRemoveCompanyAssignment, useToggleUserStatus, type AdminUser } from '@/hooks/useAdminUsers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

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
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [userToToggle, setUserToToggle] = useState<AdminUser | null>(null);
  const removeCompany = useRemoveCompanyAssignment();
  const toggleStatus = useToggleUserStatus();

  const handleManageRoles = (user: AdminUser) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const handleManageCenters = (user: AdminUser) => {
    setSelectedUser(user);
    setCenterDialogOpen(true);
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
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Empresas</TableHead>
              <TableHead>Centros</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map(i => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 bg-muted rounded animate-pulse w-32" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded animate-pulse w-16" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded animate-pulse w-20" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded animate-pulse w-24" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded animate-pulse w-20" />
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-border p-12 text-center">
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
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Usuario</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Empresas</TableHead>
              <TableHead>Centros</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id} className={!user.is_active ? 'opacity-60' : ''}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className={`h-9 w-9 ${!user.is_active ? 'opacity-50' : ''}`}>
                      <AvatarImage src={user.avatar_url} alt={getUserDisplayName(user)} />
                      <AvatarFallback className={user.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}>
                        {getUserInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {getUserDisplayName(user)}
                        {user.id === currentUser?.id && (
                          <span className="ml-1.5 text-xs text-muted-foreground">(Tú)</span>
                        )}
                      </p>
                      {user.email && (
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={() => handleToggleStatus(user)}
                      disabled={user.id === currentUser?.id || toggleStatus.isPending}
                      className="data-[state=checked]:bg-success"
                    />
                    <Badge 
                      variant={user.is_active ? 'outline' : 'secondary'}
                      className={user.is_active ? 'bg-success-light text-success border-success/20' : 'bg-muted text-muted-foreground'}
                    >
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length === 0 ? (
                      <span className="text-sm text-muted-foreground italic">Sin roles</span>
                    ) : (
                      user.roles.map(role => (
                        <Badge 
                          key={role} 
                          variant={ROLE_LABELS[role]?.variant || 'outline'}
                          className="text-xs"
                        >
                          {ROLE_LABELS[role]?.label || role}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.companies.map(company => (
                      <Badge key={company.id} variant="outline" className="text-xs">
                        <Building2 className="w-3 h-3 mr-1" />
                        {company.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.centers.length === 0 ? (
                      <span className="text-sm text-muted-foreground italic">Todos</span>
                    ) : (
                      user.centers.slice(0, 2).map(center => (
                        <Badge key={center.id} variant="outline" className="text-xs">
                          <MapPin className="w-3 h-3 mr-1" />
                          {center.name}
                        </Badge>
                      ))
                    )}
                    {user.centers.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{user.centers.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
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
                      <DropdownMenuItem onClick={() => handleLinkEmployee(user)}>
                        <Link className="w-4 h-4 mr-2" />
                        Vincular Empleado
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleToggleStatus(user)}
                        disabled={user.id === currentUser?.id}
                      >
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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

      <LinkEmployeeDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        userId={selectedUser?.id || ''}
      />

      {/* Deactivation Confirmation Dialog */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Desactivar Usuario
            </AlertDialogTitle>
            <AlertDialogDescription>
              El usuario no podrá acceder al sistema mientras esté desactivado. 
              Puedes reactivarlo en cualquier momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
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

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToToggle && confirmToggleStatus(userToToggle, false, deactivateReason)}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
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
