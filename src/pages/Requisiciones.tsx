import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FileText, Plus, Search, Eye, Clock, CheckCircle, XCircle,
  Building2, Users, Calendar, Send, ArrowRight, FileDown, Loader2,
  TrendingUp, Briefcase, Filter, ChevronRight, Trash2, AlertTriangle
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

import { useDeleteRequisition, useRequisitions, PersonnelRequisition } from '@/hooks/useRequisitions';
import { RequisitionFormDialog, RequisitionDetailDialog, RequisitionApprovalDialog } from '@/components/requisitions';
import { exportRequisitionToPDF } from '@/lib/requisitionPdfGenerator';
import {
  RequisitionStatus,
  requisitionStatusLabels,
  requisitionStatusConfig,
  requisitionReasonLabels,
  RequisitionReason,
} from '@/types/requisition';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function Requisiciones() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editRequisition, setEditRequisition] = useState<PersonnelRequisition | null>(null);
  const [approvalStep, setApprovalStep] = useState<'coordinadores' | 'operaciones' | 'rrhh' | 'juridico' | 'seleccion' | 'gerencia' | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PersonnelRequisition | null>(null);

  const { data: requisitions = [], isLoading } = useRequisitions();
  const deleteRequisition = useDeleteRequisition();
  const { companies, currentCompanyId, hasPermission } = useAuth();
  const currentCompany = companies.find(c => c.id === currentCompanyId);
  const { toast } = useToast();

  const handleExportPDF = async (req: PersonnelRequisition, e: React.MouseEvent) => {
    e.stopPropagation();
    setExportingId(req.id);
    try {
      await exportRequisitionToPDF(req, currentCompany?.name || 'Empresa');
      toast({
        title: 'PDF generado',
        description: 'La requisición se ha exportado correctamente.',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar el PDF.',
        variant: 'destructive',
      });
    } finally {
      setExportingId(null);
    }
  };

  const stats = useMemo(() => ({
    total: requisitions.length,
    borrador: requisitions.filter(r => r.estado_requisicion === 'borrador').length,
    enProceso: requisitions.filter(r => ['en_coordinadores', 'en_operaciones', 'en_rrhh', 'en_juridico', 'en_gerencia', 'en_seleccion'].includes(r.estado_requisicion)).length,
    aprobadas: requisitions.filter(r => r.estado_requisicion === 'aprobada').length,
  }), [requisitions]);

  const filtered = useMemo(() => {
    return requisitions.filter(r => {
      const matchesSearch = r.cargo_solicitado.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.solicitante_nombre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.estado_requisicion === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requisitions, searchQuery, statusFilter]);

  const openDetail = (id: string) => { setSelectedId(id); setShowDetail(true); };

  const canDeleteRequisitions = hasPermission('requisiciones', 'delete');

  const requestDelete = (req: PersonnelRequisition, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setDeleteTarget(req);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteRequisition.mutateAsync(deleteTarget.id);
    if (selectedId === deleteTarget.id) {
      setShowDetail(false);
      setSelectedId(null);
    }
    setDeleteTarget(null);
  };

  const getCurrentApprovalStep = (req: PersonnelRequisition) => {
    const status = req.estado_requisicion;
    
    if (status === 'en_coordinadores' && hasPermission('req_approve_coordinadores', 'approve')) return 'coordinadores';
    if (status === 'en_rrhh' && hasPermission('req_approve_rh', 'approve')) return 'rrhh';
    if (status === 'en_juridico' && hasPermission('req_approve_juridica', 'approve')) return 'juridico';
    if (status === 'en_operaciones' && hasPermission('req_approve_ger_op', 'approve')) return 'operaciones';
    if (status === 'en_gerencia' && hasPermission('req_approve_ger_adm', 'approve')) return 'gerencia';
    if (status === 'en_seleccion' && hasPermission('req_approve_seleccion', 'approve')) return 'seleccion';
    
    return null;
  };

  const getApprovalProgress = (req: PersonnelRequisition) => {
    const allSteps = [
      { key: 'coordinadores', label: 'CO', approved: req.coordinadores_aprobado },
      { key: 'rrhh', label: 'RH', approved: req.rrhh_aprobado },
      { key: 'juridico', label: 'JU', approved: req.juridico_aprobado },
      { key: 'operaciones', label: 'OP', approved: req.operaciones_aprobado },
      { key: 'gerencia', label: 'GE', approved: req.gerencia_aprobado },
      { key: 'seleccion', label: 'SE', approved: req.seleccion_aprobado },
    ];
    
    return allSteps.filter(s => {
      if (s.key === 'operaciones' && req.autoriza === 'gerencia_administrativa') return false;
      if (s.key === 'gerencia' && req.autoriza === 'gerencia_operaciones') return false;
      return true;
    });
  };

  const statusOptions = [
    { value: 'all', label: 'Todos los estados' },
    ...Object.entries(requisitionStatusLabels).map(([k, v]) => ({ value: k, label: v })),
  ];

  const kpis = useMemo(() => ([
    { label: 'TOTAL REQUISICIONES', value: stats.total, desc: 'Historial completo', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'EN BORRADOR', value: stats.borrador, desc: 'Pendientes de envío', icon: Clock, color: 'text-muted-foreground', bg: 'bg-background ' },
    { label: 'EN PROCESO', value: stats.enProceso, desc: 'Flujo de aprobación', icon: Send, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: 'APROBADAS', value: stats.aprobadas, desc: 'Listas para selección', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  ]), [stats]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Premium Header */}
      <div className="relative shrink-0 overflow-hidden px-6 py-8 sm:px-10 sm:py-10 border-b border-border ">
        
        
        
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary shadow-md shadow-primary/10 text-primary-foreground transform -rotate-3 transition-transform hover:rotate-0 duration-300">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="text-primary border-border font-bold uppercase tracking-[0.2em] text-[9px] px-2 py-0">
                  Módulo de Selección
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter mt-1">Requisiciones de Personal</h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-xl leading-relaxed">
              Gestiona y aprueba las solicitudes de nuevo talento humano para tu operación de manera eficiente.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:min-w-[550px]">
            {kpis.map((stat, i) => (
              <div key={i} className="group relative overflow-hidden p-4 rounded-[1.5rem] bg-background border border-border shadow-sm hover:shadow-md hover:border-border transition-all duration-500">
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

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-30 px-6 py-4 sm:px-10 bg-background border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Buscar por cargo, solicitante..."
              className="w-full pl-11 h-12 rounded-2xl bg-background border-border focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold placeholder:font-normal outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
             <SearchableSelect
              options={statusOptions}
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="Filtrar por estado"
              searchPlaceholder="Buscar estado..."
              triggerClassName="h-12 w-full sm:w-[220px] rounded-2xl bg-background border-border font-bold text-xs uppercase tracking-wider"
            />
            <div className="flex items-center px-4 h-12 bg-primary/10 rounded-2xl border border-border shrink-0">
              <span className="text-sm font-black text-primary">{filtered.length}</span>
            </div>
          </div>
        </div>

        <Button className="h-12 w-full lg:w-auto px-8 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-md shadow-primary/10" onClick={() => { setEditRequisition(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Requisición
        </Button>
      </div>

      <ScrollArea className="flex-1 p-6 sm:p-10">
        <div className="max-w-full mx-auto w-full">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-[2rem]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-32 bg-background rounded-[3rem] border-2 border-dashed border-border ">
               <FileText className="w-20 h-20 mx-auto mb-6 text-muted-foreground/20" />
               <p className="text-xl font-black uppercase tracking-[0.2em] text-muted-foreground/40">Sin requisiciones registradas</p>
            </div>
          ) : (
            <>
              {/* Card Grid View (Mobile and Tablet/Small PC) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:hidden">
                {filtered.map(req => {
                  const status = req.estado_requisicion as RequisitionStatus;
                  const cfg = requisitionStatusConfig[status];
                  const progress = getApprovalProgress(req);
                  return (
                    <Card key={req.id} className="group relative overflow-hidden rounded-[2rem] border border-border shadow-md bg-background " onClick={() => openDetail(req.id)}>
                      <div className={cn("absolute left-0 top-0 h-full w-1.5", cfg.bg)} />
                      <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-black uppercase text-base leading-none tracking-tight mb-1">{req.cargo_solicitado}</p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                              <Users className="w-3.5 h-3.5 text-primary/60" />
                              <span>{req.cantidad_vacantes_requeridas} vacantes</span>
                              <span>•</span>
                              <span className="truncate">{req.solicitante_nombre}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className={cn('shrink-0 text-[9px] font-black uppercase tracking-widest px-3 py-1 border-border shadow-sm rounded-full', cfg.bg, cfg.text, cfg.border)}>
                            {requisitionStatusLabels[status]}
                          </Badge>
                        </div>

                        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-background border border-border ">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-background shadow-sm">
                              <Building2 className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="text-xs font-bold text-foreground/80 truncate">{req.operation_centers?.name || '-'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-background shadow-sm">
                              <Calendar className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="text-xs font-bold text-foreground/80">{format(new Date(req.fecha_requisicion), 'dd MMM yyyy', { locale: es })}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 pt-2 border-t border-border ">
                          <div className="flex -space-x-2">
                            {progress.map((s, idx) => (
                              <div
                                key={s.key}
                                className={cn(
                                  'w-8 h-8 rounded-full flex items-center justify-center border-4 border-background text-[9px] font-black z-[1] shadow-sm',
                                  s.approved === true ? 'bg-emerald-500 text-white' : s.approved === false ? 'bg-red-500 text-white' : 'bg-background text-muted-foreground'
                                )}
                              >
                                {s.approved === true ? <CheckCircle className="w-4 h-4" /> : s.approved === false ? <XCircle className="w-4 h-4" /> : s.label}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-primary hover:bg-primary hover:text-white transition-all" onClick={(e) => handleExportPDF(req, e)}>
                              {exportingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                            </Button>
                            {canDeleteRequisitions && (
                              <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all" onClick={(e) => requestDelete(req, e)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl bg-background hover:bg-foreground hover:text-background transition-all" onClick={() => openDetail(req.id)}>
                              <ChevronRight className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="hidden xl:block rounded-[2.5rem] border border-border shadow-md bg-background ">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow className="bg-background border-b border-border hover:bg-background">
                      <TableHead className="px-4 h-16 font-black text-[10px] uppercase tracking-[0.2em] w-[25%]">Cargo / Solicitante</TableHead>
                      <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em] w-[18%]">Ubicación / Motivo</TableHead>
                      <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em] w-[10%]">Fecha</TableHead>
                      <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em] w-[22%]">Flujo de Aprobación</TableHead>
                      <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em] w-[12%]">Estado</TableHead>
                      <TableHead className="px-4 h-16 text-right font-black text-[10px] uppercase tracking-[0.2em] w-[13%]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(req => {
                      const status = req.estado_requisicion as RequisitionStatus;
                      const cfg = requisitionStatusConfig[status];
                      const step = getCurrentApprovalStep(req);
                      const progress = getApprovalProgress(req);
                      return (
                        <TableRow key={req.id} className="group border-b border-border hover:bg-primary/[0.02] transition-colors cursor-pointer" onClick={() => openDetail(req.id)}>
                          <TableCell className="px-4 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-black tracking-tight text-foreground text-sm leading-none mb-1 uppercase truncate">{req.cargo_solicitado}</p>
                                <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                  <Users className="w-3.5 h-3.5 text-primary/60" />
                                  <span>{req.cantidad_vacantes_requeridas} vacantes</span>
                                  <span>•</span>
                                  <span className="text-foreground/80">{req.solicitante_nombre}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-primary/60" />
                                <span className="text-[11px] font-black tracking-tight text-foreground/80 truncate">{req.operation_centers?.name || '-'}</span>
                              </div>
                              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-background border-border px-2 py-0">
                                {requisitionReasonLabels[req.motivo_solicitud as RequisitionReason]}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                               <span className="text-[11px] font-bold text-foreground/80">
                                  {format(new Date(req.fecha_requisicion), 'dd MMM yyyy', { locale: es })}
                               </span>
                               <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Fecha Solicitud</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <div className="flex items-center gap-1.5">
                                {progress.map((s, idx) => (
                                  <div key={s.key} className="flex items-center">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          className={cn(
                                            'w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black transition-all duration-300 border-2',
                                            s.approved === true && 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/10',
                                            s.approved === false && 'bg-red-500 text-white border-red-400 shadow-md shadow-red-500/10',
                                            s.approved === null && 'bg-background text-muted-foreground border-border hover:border-primary/30'
                                          )}
                                          onClick={e => e.stopPropagation()}
                                        >
                                          {s.approved === true ? <CheckCircle className="w-4 h-4" /> : s.approved === false ? <XCircle className="w-4 h-4" /> : s.label}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs bg-popover/90 border-primary/20 p-3 rounded-xl shadow-lg">
                                        <p className="font-black uppercase tracking-widest text-[10px] mb-1">{s.key === 'coordinadores' ? 'Coordinadores' : s.key === 'operaciones' ? 'Operaciones' : s.key === 'rrhh' ? 'RH' : s.key === 'juridico' ? 'Jurídico' : s.key === 'gerencia' ? 'Gerencia' : 'Selección'}</p>
                                        <p className={cn('font-bold', s.approved === true ? 'text-emerald-500' : s.approved === false ? 'text-red-500' : 'text-muted-foreground')}>
                                          {s.approved === true ? '✓ APROBADO' : s.approved === false ? '✗ RECHAZADO' : '○ PENDIENTE'}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                      {idx < progress.length - 1 && (
                                        <div className={cn('w-2 h-0.5 mx-0.5 rounded-full', s.approved === true ? 'bg-emerald-500' : 'bg-background ')} />
                                      )}
                                  </div>
                                ))}
                              </div>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('h-7 rounded-full text-[9px] font-black uppercase tracking-widest px-3 border-border shadow-sm', cfg.bg, cfg.text, cfg.border)}>
                              {requisitionStatusLabels[status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 text-right">
                            <div className="flex justify-end gap-2 transition-all duration-300" onClick={e => e.stopPropagation()}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-primary text-primary hover:text-white shadow-sm transition-all" onClick={(e) => handleExportPDF(req, e)} disabled={exportingId === req.id}>
                                      {exportingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="rounded-xl font-bold">Exportar PDF</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl bg-background hover:bg-foreground hover:text-background transition-all" onClick={() => openDetail(req.id)}>
                                      <Eye className="w-5 h-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="rounded-xl font-bold">Ver detalle</TooltipContent>
                                </Tooltip>
                                {canDeleteRequisitions && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all" onClick={(e) => requestDelete(req, e)}>
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-xl font-bold">Eliminar requisiciÃ³n</TooltipContent>
                                  </Tooltip>
                                )}
                                {step && (
                                  <Button size="sm" className="h-10 rounded-xl px-4 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-md shadow-primary/10 hover:scale-105 active:scale-95 transition-all" onClick={() => { setSelectedId(req.id); setApprovalStep(step); }}>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Gestionar
                                  </Button>
                                )}
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      <RequisitionFormDialog open={showForm} onOpenChange={setShowForm} requisition={editRequisition} />
      <RequisitionDetailDialog open={showDetail} onOpenChange={setShowDetail} requisitionId={selectedId} onRequestDelete={(req) => requestDelete(req as PersonnelRequisition)} onEdit={() => { setShowDetail(false); const r = requisitions.find(x => x.id === selectedId); if (r) { setEditRequisition(r); setShowForm(true); }}} />
      {approvalStep && selectedId && <RequisitionApprovalDialog open={!!approvalStep} onOpenChange={() => setApprovalStep(null)} requisition={requisitions.find(r => r.id === selectedId) || null} step={approvalStep} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="z-[80] max-w-[calc(100vw-2rem)] rounded-[2rem] border border-destructive/20 sm:max-w-lg">
          <AlertDialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <AlertDialogTitle>Eliminar requisiciÃ³n</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                Esta acciÃ³n eliminarÃ¡ permanentemente la requisiciÃ³n
                {deleteTarget ? ` "${deleteTarget.cargo_solicitado}" solicitada por ${deleteTarget.solicitante_nombre}` : ''}.
              </span>
              <span className="block font-semibold text-destructive">
                No se puede deshacer. Si la requisiciÃ³n tiene vacantes u otros registros vinculados, la base de datos puede impedir la eliminaciÃ³n para proteger la trazabilidad.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-1 gap-2 sm:flex sm:justify-end">
            <AlertDialogCancel disabled={deleteRequisition.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteRequisition.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRequisition.isPending ? 'Eliminando...' : 'Eliminar definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
