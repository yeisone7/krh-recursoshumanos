import { useState, useMemo } from 'react';
import { Building2, Plus, MapPin, Phone, User, Search, Users, Pencil, MoreHorizontal, Power } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { toast } from 'sonner';

import { useOperationCenters, useUpdateOperationCenter } from '@/hooks/useCompanies';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@/contexts/AuthContext';
import { OperationCenterFormDialog } from '@/components/centers/OperationCenterFormDialog';

export default function Centros() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editCenter, setEditCenter] = useState<any | null>(null);
  const [toggleTarget, setToggleTarget] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { currentCompanyId } = useAuth();
  const { data: centers = [], isLoading: loadingCenters } = useOperationCenters();
  const { data: employees = [] } = useEmployees();
  const updateCenter = useUpdateOperationCenter();

  // Calculate employee count per center
  const centerStats = useMemo(() => {
    const stats: Record<string, number> = {};
    employees.forEach(emp => {
      const centerId = emp.work_info?.operation_center_id;
      if (centerId) {
        stats[centerId] = (stats[centerId] || 0) + 1;
      }
    });
    return stats;
  }, [employees]);

  // Filter centers by search
  const filteredCenters = useMemo(() => {
    if (!searchQuery) return centers;
    
    const query = searchQuery.toLowerCase();
    return centers.filter(center => 
      center.name.toLowerCase().includes(query) ||
      center.code?.toLowerCase().includes(query) ||
      center.city?.toLowerCase().includes(query) ||
      center.manager_name?.toLowerCase().includes(query)
    );
  }, [centers, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: centers.length,
    withEmployees: Object.keys(centerStats).length,
    totalEmployees: Object.values(centerStats).reduce((a, b) => a + b, 0),
  }), [centers, centerStats]);

  const handleEdit = (center: any) => {
    setEditCenter(center);
    setIsFormOpen(true);
  };

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    const newStatus = !(toggleTarget.is_active ?? true);
    try {
      await updateCenter.mutateAsync({ id: toggleTarget.id, is_active: newStatus } as any);
      toast.success(newStatus ? 'Centro activado' : 'Centro inactivado', {
        description: `El centro "${toggleTarget.name}" ha sido ${newStatus ? 'activado' : 'inactivado'}.`,
      });
    } catch (error: any) {
      toast.error('Error al cambiar estado', {
        description: error.message || 'Por favor intenta de nuevo',
      });
    } finally {
      setToggleTarget(null);
    }
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) setEditCenter(null);
  };

  if (!currentCompanyId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No tienes una empresa asignada. Contacta al administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Centros de Operación
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los centros de operación de tu empresa
          </p>
        </div>
        <Button onClick={() => { setEditCenter(null); setIsFormOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Centro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Centros Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent">
                <Users className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                <p className="text-sm text-muted-foreground">Empleados Asignados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary">
                <MapPin className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withEmployees}</p>
                <p className="text-sm text-muted-foreground">Centros Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Centers Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Lista de Centros</CardTitle>
              <CardDescription>
                {filteredCenters.length} centro{filteredCenters.length !== 1 ? 's' : ''} encontrado{filteredCenters.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar centros..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCenters ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCenters.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No hay centros</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'No se encontraron centros con ese criterio de búsqueda.'
                  : 'Crea tu primer centro de operación para comenzar.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Crear Centro
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Centro</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-right">Empleados</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCenters.map((center) => (
                    <TableRow key={center.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{center.name}</p>
                            {center.code && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {center.code}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {center.city && center.department 
                              ? `${center.city}, ${center.department}`
                              : center.city || center.department || 'Sin ubicación'}
                          </span>
                        </div>
                        {center.address && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            {center.address}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {center.manager_name ? (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{center.manager_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {center.phone ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{center.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={centerStats[center.id] ? 'default' : 'secondary'}>
                          {centerStats[center.id] || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(center)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setToggleTarget(center)}>
                              <Power className="w-4 h-4 mr-2" />
                              {(center as any).is_active === false ? 'Activar' : 'Inactivar'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <OperationCenterFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        editCenter={editCenter}
      />

      {/* Toggle Active Confirmation */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {(toggleTarget?.is_active ?? true) ? '¿Inactivar centro de operación?' : '¿Activar centro de operación?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(toggleTarget?.is_active ?? true)
                ? <>Estás a punto de inactivar el centro <strong>"{toggleTarget?.name}"</strong>. No aparecerá en las listas de selección.</>
                : <>Estás a punto de activar el centro <strong>"{toggleTarget?.name}"</strong>. Volverá a estar disponible en las listas de selección.</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActive}>
              {updateCenter.isPending ? 'Procesando...' : (toggleTarget?.is_active ?? true) ? 'Inactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
