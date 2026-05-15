import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Plus, Search, Trash2, Gavel, AlertTriangle, Pencil,
  DollarSign, PauseCircle, PlayCircle, CheckCircle
} from 'lucide-react';
import { useDeductions, useUpdateDeduction, useDeleteDeduction, type EmployeeDeduction } from '@/hooks/useDeductions';
import { DeductionFormDialog } from '@/components/payroll/DeductionFormDialog';
import { useEmployees } from '@/hooks/useEmployees';

const DEDUCTION_TYPE_LABELS: Record<string, string> = {
  judicial: 'Descuento Judicial',
  responsabilidad: 'Responsabilidad',
  cooperativa: 'Cooperativa',
  sindicato: 'Sindicato',
  otro: 'Otro',
};

const STATUS_LABELS: Record<string, string> = {
  activo: 'Activo',
  pausado: 'Pausado',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  activo: 'bg-green-100 text-green-800 border-green-200',
  pausado: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  finalizado: 'bg-background text-muted-foreground border-border',
  cancelado: 'bg-red-100 text-red-800 border-red-200',
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

export default function Descuentos() {
  const { data: deductions = [], isLoading } = useDeductions();
  const { data: employees = [] } = useEmployees();
  const updateDeduction = useUpdateDeduction();
  const deleteDeduction = useDeleteDeduction();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmployeeDeduction | null>(null);

  const filtered = useMemo(() => {
    return deductions.filter(d => {
      const name = `${d.employees_v2?.first_name} ${d.employees_v2?.last_name} ${d.employees_v2?.document_number} ${d.description}`.toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || d.deduction_type === typeFilter;
      return matchSearch && matchType;
    });
  }, [deductions, search, typeFilter]);

  // KPIs
  const activeDeductions = deductions.filter(d => d.status === 'activo');
  const totalMonthly = activeDeductions.reduce((s, d) => s + (d.is_percentage ? 0 : Number(d.amount)), 0);
  const judicialCount = activeDeductions.filter(d => d.deduction_type === 'judicial').length;
  const responsabilidadCount = activeDeductions.filter(d => d.deduction_type === 'responsabilidad').length;

  const resetForm = () => {
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (d: EmployeeDeduction) => {
    setEditing(d);
    setShowForm(true);
  };

  const toggleStatus = (d: EmployeeDeduction) => {
    const newStatus = d.status === 'activo' ? 'pausado' : 'activo';
    updateDeduction.mutate({ id: d.id, status: newStatus });
  };

  const finalize = (d: EmployeeDeduction) => {
    updateDeduction.mutate({ id: d.id, status: 'finalizado' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Descuentos</h1>
        <p className="text-muted-foreground">Gestión de descuentos judiciales, por responsabilidad y otros</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Descuentos Fijos/Mes</p>
                <p className="text-lg font-bold">{formatCurrency(totalMonthly)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Descuentos Activos</p>
                <p className="text-lg font-bold">{activeDeductions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Judiciales</p>
                <p className="text-lg font-bold">{judicialCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Responsabilidades</p>
                <p className="text-lg font-bold">{responsabilidadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <div className="relative min-w-0 lg:flex-1 lg:min-w-[200px]">
              <Label htmlFor="deductions-search" className="sr-only">Buscar descuentos por empleado o descripción</Label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input id="deductions-search" aria-label="Buscar descuentos por empleado o descripción" placeholder="Buscar por empleado o descripción..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full lg:w-[180px]" aria-label="Filtrar descuentos por tipo">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(DEDUCTION_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreate} className="sm:col-span-2 lg:col-span-1 lg:w-auto" aria-label="Crear nuevo descuento">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Nuevo Descuento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Entidad/Referencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No se encontraron descuentos</TableCell></TableRow>
              ) : filtered.map(d => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{d.employees_v2?.first_name} {d.employees_v2?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{d.employees_v2?.document_number}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{DEDUCTION_TYPE_LABELS[d.deduction_type] || d.deduction_type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{d.description}</TableCell>
                  <TableCell className="text-right font-medium">
                    {d.is_percentage ? `${d.percentage_value}%` : formatCurrency(Number(d.amount))}
                    {d.is_recurring && <span className="text-xs text-muted-foreground block">/mes</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {d.entity_name && <p>{d.entity_name}</p>}
                    {d.reference_number && <p className="text-xs text-muted-foreground">Ref: {d.reference_number}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs border ${STATUS_COLORS[d.status]}`} variant="outline">
                      {STATUS_LABELS[d.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      {d.status !== 'finalizado' && d.status !== 'cancelado' && (
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => toggleStatus(d)} title={d.status === 'activo' ? 'Pausar' : 'Reactivar'}>
                          {d.status === 'activo' ? <PauseCircle className="w-4 h-4 text-yellow-600" /> : <PlayCircle className="w-4 h-4 text-green-600" />}
                        </Button>
                      )}
                      {d.status === 'activo' && (
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => finalize(d)} title="Finalizar">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => openEdit(d)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive h-8"><Trash2 className="w-4 h-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar descuento?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteDeduction.mutate(d.id)}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Cargando...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No se encontraron descuentos</CardContent></Card>
        ) : filtered.map(d => (
          <Card key={d.id} tabIndex={0} role="article" aria-label={`Descuento de ${d.employees_v2?.first_name || ''} ${d.employees_v2?.last_name || ''}: ${d.description}. Estado ${STATUS_LABELS[d.status]}`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{d.employees_v2?.first_name} {d.employees_v2?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{d.employees_v2?.document_number}</p>
                </div>
                <Badge className={`shrink-0 text-xs border ${STATUS_COLORS[d.status]}`} variant="outline" aria-label={`Estado ${STATUS_LABELS[d.status]}`}>
                  {STATUS_LABELS[d.status]}
                </Badge>
              </div>

              <div className="space-y-2">
                <Badge variant="outline" className="text-xs">{DEDUCTION_TYPE_LABELS[d.deduction_type] || d.deduction_type}</Badge>
                <p className="text-sm text-foreground">{d.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-background p-2">
                  <p className="text-xs text-muted-foreground">Monto</p>
                  <p className="font-medium">
                    {d.is_percentage ? `${d.percentage_value}%` : formatCurrency(Number(d.amount))}
                    {d.is_recurring && <span className="ml-1 text-xs text-muted-foreground">/mes</span>}
                  </p>
                </div>
                <div className="rounded-md bg-background p-2">
                  <p className="text-xs text-muted-foreground">Entidad</p>
                  <p className="truncate font-medium">{d.entity_name || '—'}</p>
                </div>
                <div className="col-span-2 rounded-md bg-background p-2">
                  <p className="text-xs text-muted-foreground">Referencia</p>
                  <p className="truncate font-medium">{d.reference_number || '—'}</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {d.status !== 'finalizado' && d.status !== 'cancelado' && (
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(d)} aria-label={`${d.status === 'activo' ? 'Pausar' : 'Reactivar'} descuento de ${d.employees_v2?.first_name || ''} ${d.employees_v2?.last_name || ''}`}>
                    {d.status === 'activo' ? <PauseCircle className="w-4 h-4 mr-1 text-warning" aria-hidden="true" /> : <PlayCircle className="w-4 h-4 mr-1 text-primary" aria-hidden="true" />}
                    {d.status === 'activo' ? 'Pausar' : 'Reactivar'}
                  </Button>
                )}
                {d.status === 'activo' && (
                  <Button size="sm" variant="outline" onClick={() => finalize(d)} aria-label={`Finalizar descuento de ${d.employees_v2?.first_name || ''} ${d.employees_v2?.last_name || ''}`}>
                    <CheckCircle className="w-4 h-4 mr-1 text-primary" aria-hidden="true" /> Finalizar
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(d)} aria-label={`Editar descuento de ${d.employees_v2?.first_name || ''} ${d.employees_v2?.last_name || ''}`}>
                  <Pencil className="w-4 h-4 mr-1" aria-hidden="true" /> Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-destructive" aria-label={`Eliminar descuento de ${d.employees_v2?.first_name || ''} ${d.employees_v2?.last_name || ''}`}><Trash2 className="w-4 h-4 mr-1" aria-hidden="true" /> Eliminar</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar descuento?</AlertDialogTitle>
                      <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteDeduction.mutate(d.id)}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DeductionFormDialog 
        open={showForm} 
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            resetForm();
          } else {
            setShowForm(true);
          }
        }} 
        deduction={editing} 
      />
    </div>
  );
}
