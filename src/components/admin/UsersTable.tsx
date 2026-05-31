import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
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
import { MoreHorizontal, Shield, Building2, MapPin, UserX, Link, UserCheck, UserMinus, AlertTriangle, Search, Mail, Phone, Loader2, Calendar, Settings2, Trash2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { UserRoleDialog } from './UserRoleDialog';
import { UserCenterDialog } from './UserCenterDialog';
import { UserCompanyDialog } from './UserCompanyDialog';
import { LinkEmployeeDialog } from './LinkEmployeeDialog';
import { UserNameEditDialog } from './UserNameEditDialog';
import { useRemoveCompanyAssignment, useToggleUserStatus, type AdminUser } from '@/hooks/useAdminUsers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { MobileCardList } from '@/components/shared/MobileCardList';

// Helper to get display name with fallbacks
function getUserDisplayName(user: AdminUser): string {
  if (user.full_name) return user.full_name;
  if (user.display_name) return user.display_name;
  if (user.email) return user.email;
  return `Usuario (${user.id.slice(0, 4)}...${user.id.slice(-4)})`;
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
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [userToToggle, setUserToToggle] = useState<AdminUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const removeCompany = useRemoveCompanyAssignment();
  const toggleStatus = useToggleUserStatus();

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u => 
      getUserDisplayName(u).toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.mobile?.toLowerCase().includes(q) ||
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

  const handleEditName = (user: AdminUser) => {
    setSelectedUser(user);
    setNameDialogOpen(true);
  };

  const handleRemoveFromCompany = async (user: AdminUser) => {
    if (!currentCompanyId) return;
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
      setUserToToggle(user);
      setDeactivateReason('');
      setDeactivateDialogOpen(true);
    } else {
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

  const renderActionsMenu = (user: AdminUser) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm">
          <MoreHorizontal className="h-4.5 w-4.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-100 p-2 shadow-2xl">
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Mando Operativo</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-50" />
        <DropdownMenuItem onClick={() => handleEditName(user)} className="rounded-xl h-10 gap-3 font-bold text-xs uppercase tracking-tight transition-colors focus:bg-primary/5 focus:text-primary cursor-pointer">
          <Pencil className="w-4 h-4" />
          Editar Identidad
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleManageRoles(user)} className="rounded-xl h-10 gap-3 font-bold text-xs uppercase tracking-tight transition-colors focus:bg-primary/5 focus:text-primary cursor-pointer">
          <Shield className="w-4 h-4" />
          Privilegios
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleManageCenters(user)} className="rounded-xl h-10 gap-3 font-bold text-xs uppercase tracking-tight transition-colors focus:bg-primary/5 focus:text-primary cursor-pointer">
          <MapPin className="w-4 h-4" />
          Asignar Centros
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleManageCompanies(user)} className="rounded-xl h-10 gap-3 font-bold text-xs uppercase tracking-tight transition-colors focus:bg-primary/5 focus:text-primary cursor-pointer">
          <Building2 className="w-4 h-4" />
          Multi-Empresa
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLinkEmployee(user)} className="rounded-xl h-10 gap-3 font-bold text-xs uppercase tracking-tight transition-colors focus:bg-primary/5 focus:text-primary cursor-pointer">
          <Link className="w-4 h-4" />
          Nexo Empleado
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-slate-50" />
        <DropdownMenuItem 
          onClick={() => handleToggleStatus(user)} 
          disabled={user.id === currentUser?.id}
          className={cn(
            "rounded-xl h-10 gap-3 font-bold text-xs uppercase tracking-tight transition-colors cursor-pointer",
            user.is_active ? "focus:bg-red-50 focus:text-red-500" : "focus:bg-emerald-50 focus:text-emerald-500"
          )}
        >
          {user.is_active ? (
            <>
              <UserMinus className="w-4 h-4" />
              Bloquear Acceso
            </>
          ) : (
            <>
              <UserCheck className="w-4 h-4" />
              Restaurar Acceso
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-xl h-10 gap-3 font-black text-[10px] uppercase tracking-widest text-red-600 focus:bg-red-600 focus:text-white cursor-pointer"
          onClick={() => handleRemoveFromCompany(user)}
          disabled={user.id === currentUser?.id}
        >
          <Trash2 className="w-4 h-4" />
          EXPULSAR ENTIDAD
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 animate-pulse" />
          <Loader2 className="absolute inset-0 h-16 w-16 animate-spin text-primary/40 stroke-[2.5]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-widest text-slate-900">Sincronizando Usuarios</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Obteniendo identidades digitales...</p>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="h-20 w-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-200 mb-6">
          <Users className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Directorio Vacío</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] max-w-xs">No hay operadores asignados a esta unidad corporativa aún.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search bar inside the component area */}
      <div className="relative group px-2">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors stroke-[2.5]" />
        </div>
        <Input
          placeholder="FILTRAR POR NOMBRE, EMAIL O ROL ESTRATÉGICO..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-14 pl-14 rounded-2xl bg-white border-slate-100 focus:border-primary focus:ring-8 focus:ring-primary/5 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
        />
      </div>

      <div className="px-2">
      <MobileCardList
        className="md:hidden"
        emptyMessage="No se localizaron coincidencias"
        items={filteredUsers.map(user => ({
          id: user.id,
          title: (
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 uppercase tracking-tight">{getUserDisplayName(user)}</span>
              {user.id === currentUser?.id && <Badge className="bg-primary/10 text-primary border-none font-black text-[8px] px-1.5 h-4 uppercase tracking-widest">TÚ</Badge>}
            </div>
          ),
          subtitle: user.email || 'Identidad sin correo',
          badge: (
            <Badge 
              className={cn(
                "font-black text-[8px] uppercase tracking-widest border-none px-2 py-0.5 rounded",
                user.is_active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-500'
              )}
            >
              {user.is_active ? 'ACTIVO' : 'BLOQUEADO'}
            </Badge>
          ),
          icon: (
            <Avatar className="h-12 w-12 rounded-xl border-none bg-primary/5 shadow-none">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-transparent text-primary font-black text-xs">{getUserInitials(user)}</AvatarFallback>
            </Avatar>
          ),
          fields: [
            {
              label: 'Celular',
              value: <span className="text-[10px] font-black uppercase text-slate-900">{user.mobile || 'NO REGISTRADO'}</span>,
            },
            {
              label: 'Privilegios',
              value: (
                <div className="flex flex-wrap gap-1">
                  {user.custom_roles.length === 0 && user.roles.length === 0 ? (
                    <span className="text-[9px] font-black text-slate-300 uppercase italic">Sin Roles</span>
                  ) : (
                    <>
                      {user.custom_roles.map(role => <Badge key={role} className="bg-primary/5 text-primary border-none font-black text-[8px] px-1.5 py-0.5 rounded uppercase">{role}</Badge>)}
                      {user.roles.map(role => (
                        <Badge 
                          key={role} 
                          className={cn(
                            "border-none font-black text-[8px] px-1.5 py-0.5 rounded uppercase",
                            role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-primary/5 text-primary'
                          )}
                        >
                          {ROLE_LABELS[role]?.label || role}
                        </Badge>
                      ))}
                    </>
                  )}
                </div>
              ),
              className: 'col-span-2',
            },
            {
              label: 'Nodos',
              value: <span className="font-black text-[10px] text-slate-900">{user.centers.length || 'TODOS'}</span>,
            }
          ],
          actions: (
            <div className="flex items-center justify-between w-full mt-2 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-3">
                <Switch
                  checked={user.is_active}
                  onCheckedChange={() => handleToggleStatus(user)}
                  disabled={user.id === currentUser?.id || toggleStatus.isPending}
                  className="data-[state=checked]:bg-emerald-500 scale-90"
                />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Control de Acceso</span>
              </div>
              {renderActionsMenu(user)}
            </div>
          ),
          itemClassName: !user.is_active ? 'opacity-60 grayscale' : undefined,
        }))}
      />

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="max-h-[700px] overflow-auto custom-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-slate-100">
              <TableRow className="border-slate-200 hover:bg-slate-100">
                <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600">Identidad Digital</TableHead>
                <TableHead className="w-[180px] px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600">Status Acceso</TableHead>
                <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600">Roles & Privilegios</TableHead>
                <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600">Ecosistema Corporativo</TableHead>
                <TableHead className="w-[120px] px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-600">Centros</TableHead>
                <TableHead className="w-[100px] px-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-200 bg-white">
              {filteredUsers.map((user, idx) => (
                <motion.tr 
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={cn(
                    "group border-slate-200 transition-colors hover:bg-slate-50",
                    !user.is_active && "bg-slate-100/70 opacity-75 grayscale-[0.25]"
                  )}
                >
                  <TableCell className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className="relative h-14 w-14 shrink-0">
                        <div className={cn(
                          "absolute -inset-1 rounded-xl opacity-0 transition-opacity group-hover:opacity-100",
                          user.is_active ? "bg-primary/10" : "bg-slate-200"
                        )} />
                        <Avatar className="relative h-full w-full rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                          <AvatarImage src={user.avatar_url} alt={getUserDisplayName(user)} className="object-cover" />
                          <AvatarFallback className={cn(
                            "font-black text-sm",
                            user.is_active ? 'bg-transparent text-primary' : 'bg-slate-100 text-slate-500'
                          )}>
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 font-black uppercase leading-none tracking-tight text-slate-950">
                          {getUserDisplayName(user)}
                          {user.id === currentUser?.id && (
                            <Badge className="bg-primary/10 text-primary border-none font-black text-[8px] px-1.5 h-4 uppercase tracking-widest">SISTEMA:TÚ</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-primary" />
                          <p className="max-w-[200px] truncate text-[10px] font-semibold lowercase tracking-tight text-slate-500">{user.email || 'correo no disponible'}</p>
                        </div>
                        {user.mobile && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-primary" />
                            <p className="max-w-[200px] truncate text-[10px] font-semibold tracking-tight text-slate-500">{user.mobile}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={() => handleToggleStatus(user)}
                        disabled={user.id === currentUser?.id || toggleStatus.isPending}
                        className="data-[state=checked]:bg-emerald-500 shadow-sm"
                      />
                      <Badge 
                        variant="outline"
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest shadow-none",
                          user.is_active 
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                            : 'border-slate-300 bg-slate-200 text-slate-600'
                        )}
                      >
                        {user.is_active ? 'HABILITADO' : 'SUSPENDIDO'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6">
                    <div className="flex flex-wrap gap-2">
                      {user.custom_roles.length === 0 && user.roles.length === 0 ? (
                        <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest italic">— Sin Privilegios —</span>
                      ) : (
                        <>
                          {user.custom_roles.map(role => (
                            <Badge key={role} className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-primary shadow-none hover:bg-primary/10">
                              {role}
                            </Badge>
                          ))}
                          {user.roles.map(role => (
                            <Badge 
                              key={role} 
                              className={cn(
                                "rounded-md border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest shadow-none",
                                role === 'admin' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-primary/20 bg-primary/10 text-primary'
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
                    <div className="flex flex-wrap gap-2">
                      {user.companies.map(company => (
                        <div key={company.id} className="group/entity flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 transition-all hover:border-primary/30 hover:bg-white">
                          <Building2 className="h-3.5 w-3.5 text-primary transition-colors" />
                          <span className="text-[10px] font-black uppercase tracking-tight text-slate-700">{company.name}</span>
                        </div>
                      ))}
                      {user.companies.length === 0 && <span className="text-[10px] font-black text-slate-200 uppercase italic">Libre de Entidad</span>}
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6 text-center">
                    <div className="inline-flex flex-col items-center gap-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary shadow-none">
                        <MapPin className="h-4 w-4 stroke-[2.5]" />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-950">
                        {user.centers.length === 0 ? 'TODOS' : user.centers.length}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6 text-right">
                    <div className="transition-opacity">
                      {renderActionsMenu(user)}
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      </div>

      <UserRoleDialog user={selectedUser} open={roleDialogOpen} onOpenChange={setRoleDialogOpen} />
      <UserCenterDialog user={selectedUser} open={centerDialogOpen} onOpenChange={setCenterDialogOpen} />
      <UserCompanyDialog user={selectedUser} open={companyDialogOpen} onOpenChange={setCompanyDialogOpen} />
      <LinkEmployeeDialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen} userId={selectedUser?.id || ''} userEmail={selectedUser?.email} />
      <UserNameEditDialog user={selectedUser} open={nameDialogOpen} onOpenChange={setNameDialogOpen} />

      {/* Deactivation Confirmation Dialog */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-slate-100 bg-white p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-[1.25rem] bg-amber-50 text-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Bloqueo de Acceso</AlertDialogTitle>
                <AlertDialogDescription className="text-[11px] font-black uppercase tracking-widest text-slate-400 leading-relaxed">
                  El operador perderá privilegios de autenticación de forma inmediata. <br />
                  Podrás restaurar el nexo digital en cualquier momento.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
          </div>
          
          <div className="mt-6 space-y-3">
            <Label htmlFor="reason" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bitácora de Seguridad (Opcional)</Label>
            <Textarea
              id="reason"
              placeholder="ESPECIFICA EL MOTIVO DEL BLOQUEO..."
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
              className="resize-none rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all font-bold text-xs p-4 h-24"
            />
          </div>

          <AlertDialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="h-14 rounded-2xl border-slate-200 font-black uppercase text-[10px] tracking-widest flex-1">CANCELAR</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToToggle && confirmToggleStatus(userToToggle, false, deactivateReason)}
              className="h-14 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] flex-1 shadow-xl shadow-primary/20"
            >
              <UserMinus className="w-4 h-4 mr-3" />
              CONFIRMAR BLOQUEO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
