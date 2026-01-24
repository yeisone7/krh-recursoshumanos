import { useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Shield, Building2, MapPin, UserX } from 'lucide-react';
import { UserRoleDialog } from './UserRoleDialog';
import { UserCenterDialog } from './UserCenterDialog';
import { useRemoveCompanyAssignment, type AdminUser } from '@/hooks/useAdminUsers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const ROLE_LABELS: Record<AppRole, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  admin: { label: 'Admin', variant: 'default' },
  rrhh: { label: 'RRHH', variant: 'secondary' },
  psicologo: { label: 'Psicólogo', variant: 'outline' },
  jefe_area: { label: 'Jefe Área', variant: 'outline' },
  auditor: { label: 'Auditor', variant: 'outline' },
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
  const removeCompany = useRemoveCompanyAssignment();

  const handleManageRoles = (user: AdminUser) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const handleManageCenters = (user: AdminUser) => {
    setSelectedUser(user);
    setCenterDialogOpen(true);
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

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
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
              <TableHead>Roles</TableHead>
              <TableHead>Empresas</TableHead>
              <TableHead>Centros</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {user.id.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.id.slice(0, 8)}...</p>
                      <p className="text-xs text-muted-foreground">
                        {user.id === currentUser?.id && '(Tú)'}
                      </p>
                    </div>
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
                      <DropdownMenuSeparator />
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
    </>
  );
}
