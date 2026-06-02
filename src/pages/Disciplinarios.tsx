import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  AlertTriangle,
  Scale,
  Clock,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import {
  useDisciplinaryProcesses,
  useDisciplinaryStats,
  useDeleteDisciplinaryProcess,
} from '@/hooks/useDisciplinaryProcesses';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuditLogger } from '@/hooks/useAuditLog';
import {
  DisciplinaryFormDialog,
  DisciplinaryDetailDialog,
} from '@/components/disciplinary';
import { DisciplinaryTreeView } from '@/components/disciplinary/DisciplinaryTreeView';
import {
  disciplinaryStatusLabels,
  faultTypeLabels,
  DisciplinaryStatus,
  FaultType,
  DisciplinaryProcessWithEmployee,
} from '@/types/disciplinary';
import { generateDisciplinaryPdf } from '@/lib/disciplinaryPdfGenerator';
import { useAuth } from '@/contexts/AuthContext';

export default function Disciplinarios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [faultFilter, setFaultFilter] = useState<string>('all');
  const [centerFilter, setCenterFilter] = useState<string>('all');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DisciplinaryProcessWithEmployee | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const { data: processes, isLoading } = useDisciplinaryProcesses();
  const { data: stats } = useDisciplinaryStats();
  const { data: companies } = useCompanies();
  const deleteProcess = useDeleteDisciplinaryProcess();
  const { log } = useAuditLogger();
  const { isAdmin, isRRHH, isSuperAdmin, canCreate, canDelete } = useAuth();
  const canCreateDisciplinary = isAdmin || isRRHH || isSuperAdmin || canCreate('disciplinarios');
  const canDeleteDisciplinary = isAdmin || isRRHH || isSuperAdmin || canDelete('disciplinarios');

  useEffect(() => {
    const processId = searchParams.get('proceso');
    if (processId) {
      setSelectedProcessId(processId);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleOpenDetail = (id: string) => {
    setSelectedProcessId(id);
  };

  const handleExportPdf = async (e: React.MouseEvent, process: DisciplinaryProcessWithEmployee) => {
    e.stopPropagation();
    setExportingId(process.id);
    try {
      const companyName = companies?.[0]?.name;
      await generateDisciplinaryPdf({ process, companyName });
      toast({ title: 'PDF generado', description: 'El informe ha sido descargado exitosamente.' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo generar el PDF.', variant: 'destructive' });
    } finally {
      setExportingId(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    log({
      action: 'delete',
      entityType: 'disciplinary_process',
      entityId: target.id,
      entityName: target.case_number,
      oldValues: {
        case_number: target.case_number,
        employee: target.employee
          ? `${target.employee.first_name} ${target.employee.last_name}`
          : '-',
        status: target.status,
        fault_type: target.fault_type,
        fault_date: target.fault_date,
      },
    });
    deleteProcess.mutate(target.id);
    setDeleteTarget(null);
  };

  const operationCenters = useMemo(() => {
    return [...new Set(
      (processes || []).map((p) => p.operation_center_name).filter(Boolean)
    )].sort() as string[];
  }, [processes]);

  const filteredProcesses = processes?.filter((process) => {
    const matchesSearch =
      !searchTerm ||
      process.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.employee?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.employee?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.facts_description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || process.status === statusFilter;
    const matchesFault = faultFilter === 'all' || process.fault_type === faultFilter;
    const matchesCenter = centerFilter === 'all' || (process.operation_center_name || 'Sin Centro Asignado') === centerFilter;

    return matchesSearch && matchesStatus && matchesFault && matchesCenter;
  });

  const selectedProcess = useMemo(
    () => processes?.find((process) => process.id === selectedProcessId) || null,
    [processes, selectedProcessId]
  );

  const kpis = useMemo(() => ([
    { label: 'TOTAL CASOS', value: stats?.total || 0, desc: 'Histórico acumulado', icon: Scale, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'EN CURSO', value: stats?.active || 0, desc: 'Procesos vigentes', icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'CERRADOS', value: stats?.closed || 0, desc: 'Resoluciones finales', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'FALTAS CRÍTICAS', value: (stats?.byFault?.grave || 0) + (stats?.byFault?.gravisima || 0), desc: 'Graves / Gravísimas', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  ]), [stats]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Premium Header */}
      <div className="relative shrink-0 overflow-hidden px-6 py-8 sm:px-10 sm:py-10 border-b border-border ">
        
        
        
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary shadow-xl shadow-primary/20 text-primary-foreground transform -rotate-3 transition-transform hover:rotate-0 duration-300">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="text-primary border-border font-bold uppercase tracking-[0.2em] text-[9px] px-2 py-0">
                  Jurídico / Disciplinario
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter mt-1">Gestión Disciplinaria</h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-xl leading-relaxed">
              Administración integral de procesos disciplinarios y descargos laborales bajo el marco normativo legal vigente.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:min-w-[550px]">
            {kpis.map((stat, i) => (
              <div key={i} className="group relative overflow-hidden p-4 rounded-[1.5rem] bg-background border border-border shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500">
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
      <div className="sticky top-0 z-30 px-6 py-4 sm:px-10 bg-background border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por caso, empleado o descripción..."
              className="pl-11 h-12 rounded-2xl bg-background border-border focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold placeholder:font-normal"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 w-full sm:w-[160px] rounded-2xl bg-background border-border font-bold text-xs uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <SelectValue placeholder="Estado" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border shadow-2xl">
                <SelectItem value="all" className="font-bold text-xs uppercase p-3">Todos los estados</SelectItem>
                {(Object.keys(disciplinaryStatusLabels) as DisciplinaryStatus[]).map((status) => (
                  <SelectItem key={status} value={status} className="font-bold text-xs uppercase p-3">
                    {disciplinaryStatusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={faultFilter} onValueChange={setFaultFilter}>
              <SelectTrigger className="h-12 w-full sm:w-[160px] rounded-2xl bg-background border-border font-bold text-xs uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-primary" />
                  <SelectValue placeholder="Falta" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border shadow-2xl">
                <SelectItem value="all" className="font-bold text-xs uppercase p-3">Todas las faltas</SelectItem>
                {(Object.keys(faultTypeLabels) as FaultType[]).map((fault) => (
                  <SelectItem key={fault} value={fault} className="font-bold text-xs uppercase p-3">
                    {faultTypeLabels[fault]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={centerFilter} onValueChange={setCenterFilter}>
              <SelectTrigger className="h-12 w-full sm:w-[180px] rounded-2xl bg-background border-border font-bold text-xs uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <SelectValue placeholder="Centro" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border shadow-2xl">
                <SelectItem value="all" className="font-bold text-xs uppercase p-3">Todos los centros</SelectItem>
                {operationCenters.map((center) => (
                  <SelectItem key={center} value={center} className="font-bold text-xs uppercase p-3">
                    {center}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {canCreateDisciplinary && (
          <Button className="h-12 w-full xl:w-auto px-8 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20" onClick={() => setShowFormDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proceso
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-6 sm:p-10">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredProcesses && filteredProcesses.length > 0 ? (
            <DisciplinaryTreeView
              processes={filteredProcesses}
              onOpenDetail={handleOpenDetail}
              onExportPdf={handleExportPdf}
              onDelete={canDeleteDisciplinary ? setDeleteTarget : undefined}
              exportingId={exportingId}
            />
          ) : (
            <div className="text-center py-32 bg-background rounded-[2.5rem] border-2 border-dashed border-border ">
               <Scale className="w-20 h-20 mx-auto mb-6 text-muted-foreground/20" />
               <p className="text-xl font-black uppercase tracking-[0.2em] text-muted-foreground/40">Sin procesos activos</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <DisciplinaryFormDialog open={showFormDialog} onOpenChange={setShowFormDialog} />
      <DisciplinaryDetailDialog
        processId={selectedProcessId}
        initialProcess={selectedProcess}
        open={!!selectedProcessId}
        onOpenChange={(open) => !open && setSelectedProcessId(null)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-border bg-background ">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">¿Eliminar proceso?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium">
              Se eliminará el proceso <strong className="text-foreground">{deleteTarget?.case_number}</strong> y toda su información asociada. Esta acción es irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-2xl font-bold uppercase tracking-widest text-[10px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="rounded-2xl bg-destructive text-destructive-foreground font-bold uppercase tracking-widest text-[10px] hover:bg-destructive/90">
              Eliminar Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

