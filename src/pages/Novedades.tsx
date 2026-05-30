import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import { Plus, Download, Search, Clock, FileText, Pencil, Trash2, ListFilter, TrendingUp, Zap, CalendarDays, Filter, FileDown, Printer, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { NoveltyFormDialog } from '@/components/payroll';
import { usePayrollNovelties, useDeletePayrollNovelty, useApprovePayrollNovelty } from '@/hooks/usePayrollNovelties';
import { usePayrollConfig } from '@/hooks/usePayrollConfig';
import { NOVELTY_TYPE_LABELS, type NoveltyType, type PayrollNovelty } from '@/types/payroll';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { exportNoveltyToPDF, printNoveltyTicket } from '@/utils/noveltyPdf';
import { useAuth } from '@/contexts/AuthContext';

export default function Novedades() {
  const { user, currentCompanyId, companies, profile } = useAuth();
  const currentCompany = companies.find(c => c.id === currentCompanyId);
  const companyLogo = currentCompany?.horizontal_logo_url;
  const meta = user?.user_metadata;
  const userName = profile?.full_name || 
                   meta?.full_name || 
                   meta?.name || 
                   meta?.displayName || 
                   (meta?.first_name ? `${meta.first_name} ${meta.last_name || ''}`.trim() : '') || 
                   user?.email || 
                   'Sistema';
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
  const approveNovelty = useApprovePayrollNovelty();
  const isMobile = useIsMobile();
  const { canApprove } = useAuth();
  const hasApprovePermission = canApprove('novedades');

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
  const manualCount = filtered.filter(n => n.source === 'manual').length;
  const autoCount = filtered.length - manualCount;

  const handleDelete = async (id: string) => {
    try {
      await deleteNovelty.mutateAsync(id);
      toast({ title: 'Novedad eliminada' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleStatusUpdate = async (id: string, status: 'aprobada' | 'rechazada') => {
    try {
      await approveNovelty.mutateAsync({ id, status });
      toast({ 
        title: status === 'aprobada' ? 'Novedad aprobada' : 'Novedad rechazada',
        className: status === 'aprobada' ? 'bg-emerald-500 text-white' : 'bg-destructive text-white'
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleEdit = (n: PayrollNovelty) => {
    setEditingNovelty(n);
    setShowNewDialog(true);
  };

  const handleDuplicate = (n: PayrollNovelty) => {
    // We omit 'id', 'created_at', 'updated_at', and 'employee_id' as per request
    // We also reset status to 'pendiente' for the new record
    const { id, created_at, updated_at, employee_id, employees_v2, status, ...rest } = n;
    setEditingNovelty({ ...rest, employee_id: '', status: 'pendiente' } as any);
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
      'Hora Inicio': n.start_time ? n.start_time.slice(0, 5) : '',
      Horas: n.hours,
      'Hora Final': n.end_time ? n.end_time.slice(0, 5) : '',
      Centro: (n.employees_v2 as any)?.employee_work_info?.[0]?.operation_centers?.name || '',
      Motivo: n.novelty_reasons ? `${n.novelty_reasons.item_number}. ${n.novelty_reasons.name}` : '',
      Fuente: n.source === 'manual' ? 'Manual' : 'Automático',
      Observaciones: n.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Novedades');
    XLSX.writeFile(wb, `novedades_nomina.xlsx`);
    toast({ title: 'Exportación completada' });
  };

  const stats = useMemo(() => ([
    { label: 'REGISTROS', value: filtered.length, desc: 'Novedades', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'HORAS', value: `${totalHours.toFixed(0)}h`, desc: `${manualCount} manuales`, icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'CATEGORÍAS', value: Object.keys(typeDistribution).length, desc: 'Tipos activos', icon: ListFilter, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: 'FRECUENTE', value: topType ? topType[1] : 0, desc: topType ? NOVELTY_TYPE_LABELS[topType[0] as NoveltyType].split(' ')[0] : 'N/A', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  ]), [filtered.length, totalHours, typeDistribution, topType, manualCount]);

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
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      {/* Premium Header */}
      <div className="relative shrink-0 overflow-hidden border-b border-border px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        
        
        
        <div className="relative flex min-w-0 flex-col justify-between gap-6 lg:flex-row lg:items-end lg:gap-8">
          <div className="space-y-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-2xl bg-primary p-2.5 text-primary-foreground transform -rotate-3 transition-transform hover:rotate-0 duration-300">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <Badge variant="outline" className="text-primary border-border font-bold uppercase tracking-[0.2em] text-[9px] px-2 py-0">
                  Nómina / Recargos
                </Badge>
                <h1 className="mt-1 text-2xl font-black tracking-tighter text-foreground sm:text-4xl">Novedades Laborales</h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-xl leading-relaxed">
              Gestión centralizada de horas extras, recargos nocturnos y ausentismos para el procesamiento de prenómina operativa.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:max-w-[560px]">
            {stats.map((stat, i) => (
              <div key={i} className="group relative min-w-0 overflow-hidden rounded-2xl border border-border bg-background p-4 transition-all duration-500 hover:border-primary/20 sm:rounded-[1.5rem]">
                <div className={`absolute top-2 right-2 p-1.5 rounded-lg ${stat.bg} ${stat.color} opacity-30 group-hover:opacity-100 transition-opacity`}>
                   <stat.icon className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{stat.label}</p>
                  <p className={`text-2xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                  <p className="text-[9px] font-bold text-muted-foreground/60 leading-none truncate">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Surcharges Ribbon */}
      <div className="flex shrink-0 flex-col gap-2 overflow-hidden border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-10">
         <div className="flex shrink-0 items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Recargos Activos</span>
         </div>
         <div className="flex min-w-0 gap-1.5 overflow-x-auto no-scrollbar">
            {surcharges.map(s => (
               <Badge key={s.label} variant="outline" className="shrink-0 text-[10px] font-bold bg-background border-border px-2 py-0.5 rounded-lg">
                  {s.label}: <span className="text-primary ml-1">{s.pct}%</span>
               </Badge>
            ))}
         </div>
      </div>

      {/* Grouped Filters & Actions */}
      <div className="sticky top-0 z-30 flex shrink-0 flex-col gap-4 border-b border-border bg-background px-4 py-4 sm:px-6 lg:px-10 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="group relative w-full lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por empleado o documento..."
              className="pl-11 h-12 rounded-2xl bg-background border-border focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold placeholder:font-normal"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex w-full min-w-0 flex-col gap-3 md:flex-row md:items-center lg:w-auto">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-12 w-full rounded-2xl bg-background border-border font-bold text-xs uppercase tracking-wider md:w-[200px]">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <SelectValue placeholder="Tipo Novedad" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border">
                <SelectItem value="all" className="font-bold text-xs uppercase p-3">Todos los tipos</SelectItem>
                {noveltyTypeOptions.map(o => (
                  <SelectItem key={o.value} value={o.value} className="font-bold text-xs uppercase p-3">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-1 rounded-2xl border border-border bg-background p-1 md:w-auto md:gap-2">
              <div className="relative group">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-10 w-full min-w-0 rounded-xl border-none bg-background pl-9 text-[11px] font-bold md:w-36" />
              </div>
              <span className="text-muted-foreground text-xs font-bold px-1">al</span>
              <div className="relative group">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-10 w-full min-w-0 rounded-xl border-none bg-background pl-9 text-[11px] font-bold md:w-36" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:items-center xl:w-auto">
          <Button variant="outline" className="h-12 min-w-0 rounded-2xl border-border bg-background px-4 font-black uppercase tracking-widest text-[11px] sm:flex-none sm:px-6" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2 text-emerald-600" />
            Excel
          </Button>
          <Button className="h-12 min-w-0 rounded-2xl bg-primary px-4 font-black uppercase tracking-widest text-[11px] text-primary-foreground sm:flex-none sm:px-8" onClick={() => { setEditingNovelty(null); setShowNewDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            <span className="truncate">Nueva Novedad</span>
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4 sm:p-6 lg:p-10">
        <div className="relative z-0 min-w-0 overflow-hidden rounded-3xl border border-border bg-background sm:rounded-[2.5rem]">
          {isMobile ? (
             <PullToRefresh onRefresh={async () => { await new Promise(r => setTimeout(r, 800)); }}>
                <div className="space-y-4 overflow-hidden rounded-3xl p-3 sm:p-4">
                  {isLoading ? (
                    <div className="grid grid-cols-1 gap-4">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                      <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">No hay registros</p>
                    </div>
                  ) : (
                    <MobileCardList
                      items={filtered.map(n => ({
                        id: n.id,
                        title: n.employees_v2 ? `${n.employees_v2.first_name} ${n.employees_v2.last_name}` : 'N/A',
                        subtitle: formatDateOnly(n.novelty_date, 'dd MMM yyyy', { locale: es }),
                        badge: (
                          <Badge variant="outline" className="border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                            {NOVELTY_TYPE_LABELS[n.novelty_type]?.split(' ')[0] || n.novelty_type}
                          </Badge>
                        ),
                        itemClassName: "relative overflow-hidden border-border bg-background rounded-[1.5rem]",
                        fields: [
                          { label: 'Inicio', value: n.start_time?.slice(0, 5) || '—' },
                          { label: 'Horas', value: `${n.hours}h`, className: "text-primary font-black" },
                          { label: 'Final', value: n.end_time?.slice(0, 5) || '—' },
                          { label: 'Fuente', value: n.source === 'manual' ? 'Manual' : 'Auto' },
                        ],
                        actions: (
                          <div className="flex w-full flex-wrap gap-2">
                             {hasApprovePermission && n.status === 'pendiente' && (
                               <Button 
                                 size="sm" 
                                 className="h-8 min-w-[110px] flex-1 rounded-full border-none bg-[#0ea5e9] px-3 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-[#0284c7] active:scale-95"
                                 onClick={() => handleStatusUpdate(n.id, 'aprobada')}
                               >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  APROBAR
                               </Button>
                             )}
                             <Button size="icon" variant="ghost" className="h-8 min-w-8 rounded-lg" onClick={() => printNoveltyTicket(n, userName, companyLogo)}>
                                <Printer className="w-3.5 h-3.5 text-blue-600" />
                             </Button>
                             <Button size="icon" variant="ghost" className="h-8 min-w-8 rounded-lg" onClick={() => handleDuplicate(n)}>
                                <Copy className="w-3.5 h-3.5 text-blue-500" />
                             </Button>
                             <Button size="icon" variant="ghost" className="h-8 min-w-8 rounded-lg" onClick={() => handleEdit(n)}>
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                             </Button>
                             <Button size="icon" variant="ghost" className="h-8 min-w-8 rounded-lg" onClick={() => handleDelete(n.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                             </Button>
                          </div>
                        ),
                      }))}
                    />
                  )}
                </div>
             </PullToRefresh>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow className="bg-background border-none">
                  <TableHead className="h-14 font-black text-[10px] uppercase tracking-[0.2em] px-8 text-muted-foreground">Empleado</TableHead>
                  <TableHead className="h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">Fecha</TableHead>
                  <TableHead className="h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Tipo</TableHead>
                  <TableHead className="h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">Horario</TableHead>
                  <TableHead className="h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">Horas</TableHead>
                  <TableHead className="h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Estado</TableHead>
                  <TableHead className="h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Fuente</TableHead>
                  <TableHead className="h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Motivo / Notas</TableHead>
                  <TableHead className="h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-right px-8">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="h-40 text-center text-muted-foreground font-bold text-xs uppercase animate-pulse">Cargando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-60 text-center"><div className="flex flex-col items-center gap-4 py-10 opacity-30"><FileText className="w-12 h-12" /><p className="font-black text-sm uppercase tracking-widest">Sin Novedades</p></div></TableCell></TableRow>
                ) : (
                  filtered.map(n => (
                    <TableRow key={n.id} className="group border-b border-border last:border-0 hover:bg-primary/[0.02] transition-colors">
                      <TableCell className="px-8">
                         <div className="flex flex-col">
                            <span className="font-black text-foreground tracking-tight text-sm">
                               {n.employees_v2 ? `${n.employees_v2.first_name} ${n.employees_v2.last_name}` : 'N/A'}
                            </span>
                            <div className="flex items-center gap-1.5">
                               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{n.employees_v2?.document_number}</span>
                               <span className="text-[10px] opacity-30">•</span>
                               <span className="text-[10px] font-bold text-primary/70 uppercase tracking-widest truncate max-w-[120px]">
                                  {(n.employees_v2 as any)?.employee_work_info?.[0]?.operation_centers?.name}
                               </span>
                            </div>
                         </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs text-muted-foreground">
                         {formatDateOnly(n.novelty_date, 'dd MMM, yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-primary border-border ">
                          {NOVELTY_TYPE_LABELS[n.novelty_type] || n.novelty_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-background/40 border border-border text-[11px] font-black tracking-tighter">
                            {n.start_time?.slice(0, 5) || '--:--'}
                            <span className="text-muted-foreground opacity-30">|</span>
                            {n.end_time?.slice(0, 5) || '--:--'}
                         </div>
                      </TableCell>
                      <TableCell className="text-center">
                         <span className="text-lg font-black text-primary tracking-tighter">
                           {n.hours}<span className="text-[10px] ml-0.5">h</span>
                         </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                            n.status === 'aprobada' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                            n.status === 'rechazada' ? "bg-destructive/10 text-destructive border-destructive/20" :
                            "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          )}
                        >
                          {n.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-[9px] font-black uppercase tracking-widest", n.source !== 'manual' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-background text-muted-foreground")}>
                          {n.source === 'manual' ? 'Manual' : 'Automático'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                         <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-bold text-foreground line-clamp-1">{n.novelty_reasons?.name || '-'}</span>
                            <span className="text-[10px] font-medium text-muted-foreground italic line-clamp-1">{n.notes}</span>
                         </div>
                      </TableCell>
                       <TableCell className="text-right px-8">
                         <div className="flex justify-end gap-1 whitespace-nowrap">
                           {hasApprovePermission && n.status === 'pendiente' && (
                             <Button 
                               size="sm" 
                               className="h-9 px-6 rounded-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm border-none transition-all active:scale-95 shrink-0" 
                               onClick={() => handleStatusUpdate(n.id, 'aprobada')}
                             >
                               <Check className="w-4 h-4 stroke-[3]" />
                               APROBAR
                             </Button>
                           )}
                           <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-blue-100 hover:text-blue-600 transition-all" title="Imprimir Ticket" onClick={() => printNoveltyTicket(n, userName, companyLogo)}>
                             <Printer className="w-4 h-4" />
                           </Button>
                           <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-emerald-100 hover:text-emerald-600 transition-all" title="Descargar PDF" onClick={() => exportNoveltyToPDF(n, userName, companyLogo)}>
                             <FileDown className="w-4 h-4" />
                           </Button>
                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-blue-100 hover:text-blue-500 transition-all" title="Duplicar" onClick={() => handleDuplicate(n)}>
                             <Copy className="w-4 h-4" />
                           </Button>
                           <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" onClick={() => handleEdit(n)}>
                             <Pencil className="w-4 h-4" />
                           </Button>
                           <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all" onClick={() => handleDelete(n.id)}>
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
        </div>
        </div>
      </ScrollArea>

      <NoveltyFormDialog open={showNewDialog} onOpenChange={setShowNewDialog} novelty={editingNovelty} />
    </div>
  );
}
