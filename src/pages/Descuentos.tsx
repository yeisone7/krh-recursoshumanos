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
  DollarSign, PauseCircle, PlayCircle, CheckCircle, Accessibility
} from 'lucide-react';
import { useDeductions, useCreateDeduction, useUpdateDeduction, useDeleteDeduction, type EmployeeDeduction } from '@/hooks/useDeductions';
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
  finalizado: 'bg-muted text-muted-foreground border-border',
  cancelado: 'bg-red-100 text-red-800 border-red-200',
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

export default function Descuentos() {
  const { data: deductions = [], isLoading } = useDeductions();
  const { data: employees = [] } = useEmployees();
  const createDeduction = useCreateDeduction();
  const updateDeduction = useUpdateDeduction();
  const deleteDeduction = useDeleteDeduction();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmployeeDeduction | null>(null);
  const [accessibleMode, setAccessibleMode] = useState(false);
  const textSize = accessibleMode ? 'text-base' : 'text-sm';
  const helperTextSize = accessibleMode ? 'text-sm' : 'text-xs';

  const [formData, setFormData] = useState({
    employee_id: '',
    deduction_type: 'judicial',
    description: '',
    amount: '',
    is_percentage: false,
    percentage_value: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    is_recurring: true,
    reference_number: '',
    entity_name: '',
    notes: '',
  });

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
    setFormData({ employee_id: '', deduction_type: 'judicial', description: '', amount: '', is_percentage: false, percentage_value: '', start_date: format(new Date(), 'yyyy-MM-dd'), end_date: '', is_recurring: true, reference_number: '', entity_name: '', notes: '' });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (d: EmployeeDeduction) => {
    setEditing(d);
    setFormData({
      employee_id: d.employee_id,
      deduction_type: d.deduction_type,
      description: d.description,
      amount: String(d.amount),
      is_percentage: d.is_percentage,
      percentage_value: d.percentage_value ? String(d.percentage_value) : '',
      start_date: d.start_date,
      end_date: d.end_date || '',
      is_recurring: d.is_recurring,
      reference_number: d.reference_number || '',
      entity_name: d.entity_name || '',
      notes: d.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = () => {
    const payload: any = {
      employee_id: formData.employee_id,
      deduction_type: formData.deduction_type,
      description: formData.description,
      amount: Number(formData.amount),
      is_percentage: formData.is_percentage,
      percentage_value: formData.is_percentage ? Number(formData.percentage_value) : null,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      is_recurring: formData.is_recurring,
      reference_number: formData.reference_number || null,
      entity_name: formData.entity_name || null,
      notes: formData.notes || null,
    };

    if (editing) {
      updateDeduction.mutate({ id: editing.id, ...payload }, { onSuccess: () => setShowForm(false) });
    } else {
      payload.status = 'activo';
      createDeduction.mutate(payload, { onSuccess: () => setShowForm(false) });
    }
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Descuentos</h1>
          <p className="text-muted-foreground">Gestión de descuentos judiciales, por responsabilidad y otros</p>
        </div>
        <Button
          type="button"
          variant={accessibleMode ? 'default' : 'outline'}
          className="w-full sm:w-auto"
          aria-pressed={accessibleMode}
          aria-label={accessibleMode ? 'Desactivar modo accesible' : 'Activar modo accesible'}
          onClick={() => setAccessibleMode(prev => !prev)}
        >
          <Accessibility className="w-4 h-4 mr-2" aria-hidden="true" />
          Modo accesible
        </Button>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por empleado o descripción..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(DEDUCTION_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreate} className="sm:col-span-2 lg:col-span-1 lg:w-auto">
              <Plus className="w-4 h-4 mr-2" />
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
          <Card key={d.id}>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{d.employees_v2?.first_name} {d.employees_v2?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{d.employees_v2?.document_number}</p>
                </div>
                <Badge className={`shrink-0 text-xs border ${STATUS_COLORS[d.status]}`} variant="outline">
                  {STATUS_LABELS[d.status]}
                </Badge>
              </div>

              <div className="space-y-2">
                <Badge variant="outline" className="text-xs">{DEDUCTION_TYPE_LABELS[d.deduction_type] || d.deduction_type}</Badge>
                <p className="text-sm text-foreground">{d.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Monto</p>
                  <p className="font-medium">
                    {d.is_percentage ? `${d.percentage_value}%` : formatCurrency(Number(d.amount))}
                    {d.is_recurring && <span className="ml-1 text-xs text-muted-foreground">/mes</span>}
                  </p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Entidad</p>
                  <p className="truncate font-medium">{d.entity_name || '—'}</p>
                </div>
                <div className="col-span-2 rounded-md bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Referencia</p>
                  <p className="truncate font-medium">{d.reference_number || '—'}</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {d.status !== 'finalizado' && d.status !== 'cancelado' && (
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(d)}>
                    {d.status === 'activo' ? <PauseCircle className="w-4 h-4 mr-1 text-warning" /> : <PlayCircle className="w-4 h-4 mr-1 text-primary" />}
                    {d.status === 'activo' ? 'Pausar' : 'Reactivar'}
                  </Button>
                )}
                {d.status === 'activo' && (
                  <Button size="sm" variant="outline" onClick={() => finalize(d)}>
                    <CheckCircle className="w-4 h-4 mr-1 text-primary" /> Finalizar
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                  <Pencil className="w-4 h-4 mr-1" /> Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-destructive"><Trash2 className="w-4 h-4 mr-1" /> Eliminar</Button>
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

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Descuento' : 'Nuevo Descuento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Empleado *</Label>
              <Select value={formData.employee_id} onValueChange={v => setFormData(p => ({ ...p, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar empleado" /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.is_active).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} - {e.document_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de Descuento *</Label>
                <Select value={formData.deduction_type} onValueChange={v => setFormData(p => ({ ...p, deduction_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEDUCTION_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha Inicio *</Label>
                <Input type="date" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Ej: Embargo alimentario Juzgado 3° Civil" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.is_percentage} onCheckedChange={v => setFormData(p => ({ ...p, is_percentage: v }))} />
              <Label>Es porcentaje del salario</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{formData.is_percentage ? 'Porcentaje (%)' : 'Monto Fijo ($)'} *</Label>
                <Input type="number" min="0" step="0.01" value={formData.is_percentage ? formData.percentage_value : formData.amount} onChange={e => {
                  if (formData.is_percentage) setFormData(p => ({ ...p, percentage_value: e.target.value, amount: e.target.value }));
                  else setFormData(p => ({ ...p, amount: e.target.value }));
                }} />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input type="date" value={formData.end_date} onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.is_recurring} onCheckedChange={v => setFormData(p => ({ ...p, is_recurring: v }))} />
              <Label>Descuento recurrente (cada período de nómina)</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Entidad</Label>
                <Input value={formData.entity_name} onChange={e => setFormData(p => ({ ...p, entity_name: e.target.value }))} placeholder="Ej: Juzgado 3° Civil" />
              </div>
              <div className="space-y-2">
                <Label>N° de Referencia</Label>
                <Input value={formData.reference_number} onChange={e => setFormData(p => ({ ...p, reference_number: e.target.value }))} placeholder="Ej: RAD-2026-001" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formData.employee_id || !formData.description || (!formData.amount && !formData.percentage_value)}>
              {editing ? 'Actualizar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
