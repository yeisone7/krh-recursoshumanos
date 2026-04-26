import { useState } from 'react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { es } from 'date-fns/locale';
import { Plus, Download, Search, Clock, FileText, Pencil, Trash2, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { NoveltyFormDialog } from '@/components/payroll';
import { usePayrollNovelties, useDeletePayrollNovelty } from '@/hooks/usePayrollNovelties';
import { usePayrollConfig } from '@/hooks/usePayrollConfig';
import { NOVELTY_TYPE_LABELS, type NoveltyType, type PayrollNovelty } from '@/types/payroll';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { CollapsibleFilters } from '@/components/shared/CollapsibleFilters';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function Novedades() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingNovelty, setEditingNovelty] = useState<PayrollNovelty | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: novelties = [], isLoading } = usePayrollNovelties({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const { data: config } = usePayrollConfig();
  const deleteNovelty = useDeletePayrollNovelty();
  const isMobile = useIsMobile();

  const filtered = novelties.filter(n => {
    const matchesType = typeFilter === 'all' || n.novelty_type === typeFilter;
    const empName = n.employees_v2
      ? `${n.employees_v2.first_name} ${n.employees_v2.last_name} ${n.employees_v2.document_number}`.toLowerCase()
      : '';
    const matchesSearch = !searchTerm || empName.includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalHours = filtered.reduce((s, n) => s + (n.hours || 0), 0);
  const typeDistribution = filtered.reduce((acc, n) => {
    acc[n.novelty_type] = (acc[n.novelty_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topType = Object.entries(typeDistribution).sort((a, b) => b[1] - a[1])[0];

  const handleDelete = async (id: string) => {
    try {
      await deleteNovelty.mutateAsync(id);
      toast({ title: 'Novedad eliminada' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleEdit = (n: PayrollNovelty) => {
    setEditingNovelty(n);
    setShowNewDialog(true);
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast({ title: 'No hay datos para exportar', variant: 'destructive' });
      return;
    }
    const rows = filtered.map(n => ({
      Empleado: n.employees_v2 ? `${n.employees_v2.first_name} ${n.employees_v2.last_name}` : n.employee_id,
      Documento: n.employees_v2?.document_number || '',
      Fecha: n.novelty_date,
      Tipo: NOVELTY_TYPE_LABELS[n.novelty_type] || n.novelty_type,
      'Hora Inicio': (n as any).start_time ? (n as any).start_time.slice(0, 5) : '',
      Horas: n.hours,
      'Hora Final': (n as any).end_time ? (n as any).end_time.slice(0, 5) : '',
      Motivo: (n as any).novelty_reasons ? `${(n as any).novelty_reasons.item_number}. ${(n as any).novelty_reasons.name}` : '',
      Fuente: n.source === 'manual' ? 'Manual' : 'Automático',
      Observaciones: n.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Novedades');
    XLSX.writeFile(wb, `novedades_nomina.xlsx`);
    toast({ title: 'Exportación completada' });
  };

  const surcharges = config ? [
    { label: 'HEDO', pct: config.surcharge_hedo },
    { label: 'HENO', pct: config.surcharge_heno },
    { label: 'R.N.', pct: config.surcharge_rn },
    { label: 'HEDF', pct: config.surcharge_hedf },
    { label: 'HENF', pct: config.surcharge_henf },
    { label: 'RNF', pct: config.surcharge_rnf },
    { label: 'Dominical', pct: config.surcharge_dominical },
  ] : [];

  const noveltyTypeOptions = Object.entries(NOVELTY_TYPE_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <div className="space-y-4 sm:space-y-6 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">Novedades de Nómina</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Registro y gestión de novedades laborales</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleExport}>
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Exportar</span>
            <span className="sm:hidden">Excel</span>
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => { setEditingNovelty(null); setShowNewDialog(true); }}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nueva Novedad</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>
      </div>

      {!isMobile && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Registros</p>
                  <p className="text-2xl font-bold">{filtered.length}</p>
                </div>
                <FileText className="h-8 w-8 text-primary shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Horas</p>
                  <p className="text-2xl font-bold truncate">{totalHours.toFixed(1)}h</p>
                </div>
                <Clock className="h-8 w-8 text-primary shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Tipos</p>
                  <p className="text-2xl font-bold">{Object.keys(typeDistribution).length}</p>
                </div>
                <ListFilter className="h-8 w-8 text-primary shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Más frecuente</p>
                  <p className="text-2xl font-bold truncate">
                    {topType ? NOVELTY_TYPE_LABELS[topType[0] as NoveltyType] || topType[0] : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {surcharges.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-6 sm:pb-3">
            <CardTitle className="text-sm font-medium">Recargos Configurados</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:gap-3 sm:overflow-visible">
              {surcharges.map(s => (
                <Badge key={s.label} variant="outline" className="text-xs shrink-0">
                  {s.label}: {s.pct}%
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empleado..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <CollapsibleFilters activeCount={(typeFilter !== 'all' ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0)}>
          <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-row">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[220px] h-10">
                <SelectValue placeholder="Tipo de novedad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {noveltyTypeOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full sm:w-[160px] h-10" placeholder="Desde" />
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full sm:w-[160px] h-10" placeholder="Hasta" />
          </div>
        </CollapsibleFilters>
      </div>

      <Card className="overflow-hidden">
        <CardContent className={cn('p-0', !isMobile && 'overflow-x-auto')}>
          {isMobile ? (
            <div className="p-3">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : (
                <PullToRefresh onRefresh={async () => { await new Promise(r => setTimeout(r, 800)); }}>
                  <MobileCardList
                    items={filtered.map(n => ({
                      id: n.id,
                      title: n.employees_v2 ? `${n.employees_v2.first_name} ${n.employees_v2.last_name}` : 'N/A',
                      subtitle: format(new Date(n.novelty_date), 'dd MMM yyyy', { locale: es }),
                      badge: (
                        <Badge variant="outline" className="text-xs max-w-[150px] truncate">
                          {NOVELTY_TYPE_LABELS[n.novelty_type] || n.novelty_type}
                        </Badge>
                      ),
                      fields: [
                        { label: 'Inicio', value: (n as any).start_time ? (n as any).start_time.slice(0, 5) : '—' },
                        { label: 'Horas', value: `${n.hours}h` },
                        { label: 'Final', value: (n as any).end_time ? (n as any).end_time.slice(0, 5) : '—' },
                        { label: 'Fuente', value: n.source === 'manual' ? 'Manual' : 'Auto' },
                        ...((n as any).novelty_reasons ? [{ label: 'Motivo', value: `${(n as any).novelty_reasons.item_number}. ${(n as any).novelty_reasons.name}`, className: 'col-span-2' }] : []),
                        ...(n.notes ? [{ label: 'Observaciones', value: n.notes, className: 'col-span-2' }] : []),
                      ],
                      actions: (
                        <>
                          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={(e) => { e.stopPropagation(); handleEdit(n); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      ),
                    }))}
                    emptyMessage="No se encontraron novedades"
                  />
                </PullToRefresh>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden sm:table-cell">Hora inicio</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead className="hidden sm:table-cell">Hora final</TableHead>
                  <TableHead className="hidden md:table-cell">Motivo</TableHead>
                  <TableHead className="hidden lg:table-cell">Fuente</TableHead>
                  <TableHead className="hidden lg:table-cell">Observaciones</TableHead>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">Cargando novedades...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No se encontraron novedades</TableCell>
                  </TableRow>
                ) : (
                  filtered.map(n => (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium">{n.employees_v2 ? `${n.employees_v2.first_name} ${n.employees_v2.last_name}` : 'N/A'}</TableCell>
                      <TableCell>{format(new Date(n.novelty_date), 'dd MMM yyyy', { locale: es })}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{NOVELTY_TYPE_LABELS[n.novelty_type] || n.novelty_type}</Badge></TableCell>
                      <TableCell className="font-semibold hidden sm:table-cell">{(n as any).start_time ? (n as any).start_time.slice(0, 5) : '—'}</TableCell>
                      <TableCell className="font-semibold">{n.hours}h</TableCell>
                      <TableCell className="font-semibold hidden sm:table-cell">{(n as any).end_time ? (n as any).end_time.slice(0, 5) : '—'}</TableCell>
                      <TableCell className="text-sm hidden md:table-cell">{(n as any).novelty_reasons ? `${(n as any).novelty_reasons.item_number}. ${(n as any).novelty_reasons.name}` : '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell"><Badge variant={n.source === 'manual' ? 'secondary' : 'default'} className="text-xs">{n.source === 'manual' ? 'Manual' : 'Auto'}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate hidden lg:table-cell">{n.notes || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(n)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(n.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NoveltyFormDialog open={showNewDialog} onOpenChange={setShowNewDialog} novelty={editingNovelty} />
    </div>
  );
}
