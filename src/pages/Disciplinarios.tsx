import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  Search,
  AlertTriangle,
  Scale,
  Users,
  Clock,
  CheckCircle2,
  FileDown,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  disciplinaryStatusLabels,
  faultTypeLabels,
  getStatusColor,
  getFaultColor,
  DisciplinaryStatus,
  FaultType,
  DisciplinaryProcessWithEmployee,
} from '@/types/disciplinary';
import { generateDisciplinaryPdf } from '@/lib/disciplinaryPdfGenerator';

export default function Disciplinarios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [faultFilter, setFaultFilter] = useState<string>('all');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DisciplinaryProcessWithEmployee | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const { data: processes, isLoading } = useDisciplinaryProcesses();
  const { data: stats } = useDisciplinaryStats();
  const { data: companies } = useCompanies();
  const deleteProcess = useDeleteDisciplinaryProcess();
  const { log } = useAuditLogger();

  // Handle deep linking from dashboard
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

  // Filter processes
  const filteredProcesses = processes?.filter((process) => {
    const matchesSearch =
      !searchTerm ||
      process.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.employee?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.employee?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.facts_description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || process.status === statusFilter;
    const matchesFault = faultFilter === 'all' || process.fault_type === faultFilter;

    return matchesSearch && matchesStatus && matchesFault;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Procesos Disciplinarios</h1>
          <p className="text-muted-foreground">
            Gestión de procesos disciplinarios según normativa colombiana
          </p>
        </div>
        <Button onClick={() => setShowFormDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proceso
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Procesos</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Curso</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.active || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cerrados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.closed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faltas Graves</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {(stats?.byFault?.grave || 0) + (stats?.byFault?.gravisima || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por caso, empleado o descripción..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {(Object.keys(disciplinaryStatusLabels) as DisciplinaryStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {disciplinaryStatusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={faultFilter} onValueChange={setFaultFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo de falta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las faltas</SelectItem>
            {(Object.keys(faultTypeLabels) as FaultType[]).map((fault) => (
              <SelectItem key={fault} value={fault}>
                {faultTypeLabels[fault]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caso</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Centro de Operación</TableHead>
                <TableHead>Tipo de Falta</TableHead>
                <TableHead>Fecha Hechos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Apertura</TableHead>
                <TableHead className="w-[60px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredProcesses && filteredProcesses.length > 0 ? (
                filteredProcesses.map((process) => (
                  <TableRow
                    key={process.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleOpenDetail(process.id)}
                  >
                    <TableCell className="font-medium">{process.case_number}</TableCell>
                    <TableCell>
                      {process.employee
                        ? `${process.employee.first_name} ${process.employee.last_name}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {process.operation_center_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getFaultColor(process.fault_type)}>
                        {faultTypeLabels[process.fault_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(process.fault_date), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(process.status)}>
                        {disciplinaryStatusLabels[process.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(process.opening_date), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => handleExportPdf(e, process)}
                            disabled={exportingId === process.id}
                          >
                            <FileDown className="h-4 w-4 mr-2" />
                            {exportingId === process.id ? 'Generando...' : 'Exportar PDF'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(process);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Scale className="h-8 w-8 opacity-50" />
                      <p>No hay procesos disciplinarios</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFormDialog(true)}
                      >
                        Crear primer proceso
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DisciplinaryFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
      />

      <DisciplinaryDetailDialog
        processId={selectedProcessId}
        open={!!selectedProcessId}
        onOpenChange={(open) => !open && setSelectedProcessId(null)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proceso disciplinario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el proceso <strong>{deleteTarget?.case_number}</strong> y toda su información asociada (evidencias, descargos, línea de tiempo).
              Esta acción quedará registrada en la auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
