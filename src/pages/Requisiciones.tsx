import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FileText, Plus, Search, Eye, Clock, CheckCircle, XCircle,
  Building2, Users, Calendar, Send, ArrowRight, FileDown, Loader2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

import { useRequisitions, PersonnelRequisition } from '@/hooks/useRequisitions';
import { RequisitionFormDialog, RequisitionDetailDialog, RequisitionApprovalDialog } from '@/components/requisitions';
import { exportRequisitionToPDF } from '@/lib/requisitionPdfGenerator';
import {
  RequisitionStatus,
  requisitionStatusLabels,
  requisitionStatusConfig,
  requisitionReasonLabels,
  RequisitionReason,
  autorizaLabels,
  AutorizaType,
} from '@/types/requisition';

export default function Requisiciones() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editRequisition, setEditRequisition] = useState<PersonnelRequisition | null>(null);
  const [approvalStep, setApprovalStep] = useState<'operaciones' | 'rrhh' | 'juridico' | 'seleccion' | 'gerencia' | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const { data: requisitions = [], isLoading } = useRequisitions();
  const { companies, currentCompanyId } = useAuth();
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
    enProceso: requisitions.filter(r => ['en_operaciones', 'en_rrhh', 'en_juridico', 'en_gerencia', 'en_seleccion'].includes(r.estado_requisicion)).length,
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

  const getCurrentApprovalStep = (req: PersonnelRequisition) => {
    const statusMap: Record<string, 'operaciones' | 'rrhh' | 'juridico' | 'seleccion' | 'gerencia'> = {
      en_operaciones: 'operaciones', en_rrhh: 'rrhh', en_juridico: 'juridico',
      en_gerencia: 'gerencia', en_seleccion: 'seleccion',
    };
    return statusMap[req.estado_requisicion] || null;
  };

  // Helper to get approval progress for timeline
  // Order: RRHH → Jurídico → Operaciones → Gerencia → Selección
  const getApprovalProgress = (req: PersonnelRequisition) => {
    const allSteps = [
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
    { value: 'all', label: 'Todos' },
    ...Object.entries(requisitionStatusLabels).map(([k, v]) => ({ value: k, label: v })),
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Requisiciones de Personal</h1>
          <p className="text-muted-foreground">Gestiona solicitudes de nuevo personal</p>
        </div>
        <Button onClick={() => { setEditRequisition(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />Nueva Requisición
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-secondary"><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary/10"><FileText className="w-5 h-5 text-secondary" /></div>
          <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><Clock className="w-5 h-5 text-muted-foreground" /></div>
          <div><p className="text-2xl font-bold">{stats.borrador}</p><p className="text-xs text-muted-foreground">Borrador</p></div>
        </CardContent></Card>
        <Card className="border-l-4 border-l-tertiary"><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-tertiary/10"><Send className="w-5 h-5 text-tertiary" /></div>
          <div><p className="text-2xl font-bold">{stats.enProceso}</p><p className="text-xs text-muted-foreground">En Proceso</p></div>
        </CardContent></Card>
        <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20 border-l-4 border-l-success"><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10"><CheckCircle className="w-5 h-5 text-success" /></div>
          <div><p className="text-2xl font-bold">{stats.aprobadas}</p><p className="text-xs text-muted-foreground">Aprobadas</p></div>
        </CardContent></Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <div className="p-4 border-b flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <SearchableSelect
            options={statusOptions}
            value={statusFilter}
            onValueChange={setStatusFilter}
            placeholder="Estado"
            searchPlaceholder="Buscar estado..."
            triggerClassName="w-[180px]"
          />
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No hay requisiciones</h3>
            <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Nueva Requisición</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cargo</TableHead>
                <TableHead>Centro</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(req => {
                const status = req.estado_requisicion as RequisitionStatus;
                const cfg = requisitionStatusConfig[status];
                const step = getCurrentApprovalStep(req);
                const progress = getApprovalProgress(req);
                return (
                  <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(req.id)}>
                    <TableCell>
                      <p className="font-medium uppercase">{req.cargo_solicitado}</p>
                      <p className="text-xs text-muted-foreground">{req.cantidad_vacantes_requeridas} vacantes • {req.solicitante_nombre}</p>
                    </TableCell>
                    <TableCell><div className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-muted-foreground" />{req.operation_centers?.name || '-'}</div></TableCell>
                    <TableCell><Badge variant="outline">{requisitionReasonLabels[req.motivo_solicitud as RequisitionReason]}</Badge></TableCell>
                    <TableCell><div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-muted-foreground" />{format(new Date(req.fecha_requisicion), 'dd MMM yyyy', { locale: es })}</div></TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div 
                          className="flex items-center gap-0.5"
                          role="progressbar"
                          aria-label={`Progreso de aprobación: ${progress.filter(s => s.approved === true).length} de ${progress.length} aprobados`}
                          aria-valuenow={progress.filter(s => s.approved === true).length}
                          aria-valuemax={progress.length}
                        >
                          {progress.map((s, idx) => (
                            <div key={s.key} className="flex items-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    data-testid={`approval-step-${s.key}-${req.id}`}
                                    aria-label={`${s.key}: ${s.approved === true ? 'Aprobado' : s.approved === false ? 'Rechazado' : 'Pendiente'}`}
                                    className={cn(
                                      'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-200 border-2',
                                      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                                      s.approved === true && 'bg-success text-success-foreground border-success shadow-sm',
                                      s.approved === false && 'bg-destructive text-destructive-foreground border-destructive shadow-sm',
                                      s.approved === null && 'bg-muted text-muted-foreground border-border'
                                    )}
                                  >
                                    {s.approved === true ? (
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    ) : s.approved === false ? (
                                      <XCircle className="w-3.5 h-3.5" />
                                    ) : (
                                      s.label
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  <p className="font-medium">
                                    {s.key === 'operaciones' && 'Operaciones'}
                                    {s.key === 'rrhh' && 'Recursos Humanos'}
                                    {s.key === 'juridico' && 'Jurídico'}
                                    {s.key === 'gerencia' && 'Gerencia'}
                                    {s.key === 'seleccion' && 'Selección'}
                                  </p>
                                  <p className={cn(
                                    s.approved === true && 'text-success',
                                    s.approved === false && 'text-destructive',
                                    s.approved === null && 'text-muted-foreground'
                                  )}>
                                    {s.approved === true ? '✓ Aprobado' : s.approved === false ? '✗ Rechazado' : '○ Pendiente'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                              {/* Connector line between steps */}
                              {idx < progress.length - 1 && (
                                <div 
                                  className={cn(
                                    'w-2 h-0.5 mx-0.5',
                                    s.approved === true ? 'bg-success' : 'bg-border'
                                  )}
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={cn(cfg.bg, cfg.text, cfg.border)}>{requisitionStatusLabels[status]}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={(e) => handleExportPDF(req, e)}
                              disabled={exportingId === req.id}
                              aria-label={`Exportar requisición ${req.cargo_solicitado} a PDF`}
                            >
                              {exportingId === req.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <FileDown className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Exportar PDF</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => openDetail(req.id)}
                              aria-label={`Ver detalle de requisición ${req.cargo_solicitado}`}
                              data-testid={`view-requisition-${req.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalle</TooltipContent>
                        </Tooltip>
                        {step && (
                          <Button 
                            size="sm" 
                            onClick={() => { setSelectedId(req.id); setApprovalStep(step); }}
                            aria-label={`Aprobar requisición ${req.cargo_solicitado} en etapa ${step}`}
                            data-testid={`approve-requisition-${req.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-1.5" />
                            Aprobar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <RequisitionFormDialog open={showForm} onOpenChange={setShowForm} requisition={editRequisition} />
      <RequisitionDetailDialog open={showDetail} onOpenChange={setShowDetail} requisitionId={selectedId} onEdit={() => { setShowDetail(false); const r = requisitions.find(x => x.id === selectedId); if (r) { setEditRequisition(r); setShowForm(true); }}} />
      {approvalStep && selectedId && <RequisitionApprovalDialog open={!!approvalStep} onOpenChange={() => setApprovalStep(null)} requisition={requisitions.find(r => r.id === selectedId) || null} step={approvalStep} />}
    </div>
  );
}
