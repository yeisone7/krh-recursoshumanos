import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Stethoscope, Plus, Search, Eye, Calendar, Loader2,
  ClipboardList, ShieldCheck, Trash2, CheckCircle, AlertTriangle, XCircle, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { ExamCatalogTab } from '@/components/examenes/ExamCatalogTab';
import { ExamProfesiogramaTab } from '@/components/examenes/ExamProfesiogramaTab';
import { ExamTransactionFormDialog } from '@/components/examenes/ExamTransactionFormDialog';
import { ExamTransactionDetailDialog } from '@/components/examenes/ExamTransactionDetailDialog';
import { ExamAlertsCard } from '@/components/examenes/ExamAlertsCard';
import type { ExamAlert } from '@/components/examenes/ExamAlertsCard';
import { useExamTransactions, useDeleteExamTransaction } from '@/hooks/useExamTransactions';
import type { ExamTransaction } from '@/hooks/useExamTransactions';
import { useOperationCenters } from '@/hooks/useCompanies';
import { usePositions } from '@/hooks/useSystemConfig';
import { useAuth } from '@/contexts/AuthContext';
import { examTypeLabels } from '@/types/medicalExam';
import type { ExamType } from '@/types/medicalExam';

const resultLabels: Record<string, string> = {
  apto: 'Apto', apto_restricciones: 'Apto c/ Restricciones', no_apto: 'No Apto', pendiente: 'Pendiente',
};

const examTypeBadgeStyles: Record<string, { bg: string; text: string; border: string }> = {
  ingreso: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  periodico: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/20' },
  egreso: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
  reintegro: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  post_incapacidad: { bg: 'bg-warning/10', text: 'text-warning-foreground', border: 'border-warning/20' },
  cambio_cargo: { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary/20' },
  seguimiento: { bg: 'bg-tertiary/10', text: 'text-tertiary', border: 'border-tertiary/20' },
};

export default function Examenes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('aplicaciones');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { currentCompanyId } = useAuth();
  const { data: transactions, isLoading } = useExamTransactions();
  const deleteMutation = useDeleteExamTransaction();
  const { data: operationCenters = [] } = useOperationCenters();
  const { data: positionsData = [] } = usePositions();

  // Deep link
  useEffect(() => {
    const detailId = searchParams.get('detail');
    if (detailId && transactions) {
      const tx = transactions.find(t => t.id === detailId);
      if (tx) {
        setSelectedTxId(tx.id);
        setIsDetailOpen(true);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, transactions, setSearchParams]);

  // Stats
  const stats = useMemo(() => {
    if (!transactions) return { total: 0, totalExams: 0 };
    let totalExams = 0;
    for (const tx of transactions) totalExams += tx.items.length;
    return { total: transactions.length, totalExams };
  }, [transactions]);

  // Filter
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(tx => {
      const empName = `${tx.employees?.first_name} ${tx.employees?.last_name}`.toLowerCase();
      const examNames = tx.items.map(i => i.exam_name.toLowerCase()).join(' ');
      const matchesSearch = empName.includes(searchQuery.toLowerCase()) || examNames.includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || tx.exam_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, typeFilter]);

  const handleView = (txId: string) => { setSelectedTxId(txId); setIsDetailOpen(true); };
  const selectedTransaction = transactions?.find(t => t.id === selectedTxId) || null;

  if (!currentCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Stethoscope className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin empresa asignada</h2>
        <p className="text-muted-foreground">Contacta al administrador para que te asigne a una empresa.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Exámenes Médicos</h1>
          <p className="text-muted-foreground mt-1">Gestión de exámenes médicos ocupacionales, catálogo y profesiogramas</p>
        </div>
        {activeTab === 'aplicaciones' && (
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nueva Aplicación
          </Button>
        )}
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="aplicaciones" className="gap-2">
            <Stethoscope className="w-4 h-4" /> Aplicaciones
          </TabsTrigger>
          <TabsTrigger value="catalogo" className="gap-2">
            <ClipboardList className="w-4 h-4" /> Catálogo
          </TabsTrigger>
          <TabsTrigger value="profesiograma" className="gap-2">
            <ShieldCheck className="w-4 h-4" /> Profesiograma
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aplicaciones" className="mt-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Aplicaciones ({stats.totalExams} exámenes)</p>
              </div>
            </motion.div>
          </div>

          {/* Filters + Table */}
          <div className="card-elevated">
            <div className="p-4 border-b border-border">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por empleado o examen..."
                    className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[160px] h-10 text-sm">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {(Object.keys(examTypeLabels) as ExamType[]).map((type) => (
                      <SelectItem key={type} value={type}>{examTypeLabels[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{searchQuery || typeFilter !== 'all' ? 'No se encontraron aplicaciones con los filtros seleccionados' : 'No hay aplicaciones de exámenes registradas'}</p>
                {!searchQuery && typeFilter === 'all' && (
                  <Button onClick={() => setIsFormOpen(true)} className="mt-4"><Plus className="w-4 h-4 mr-2" /> Nueva Aplicación</Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Exámenes</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => {
                    const itemsSummary = tx.items.length <= 2
                      ? tx.items.map(i => i.exam_name).join(', ')
                      : `${tx.items[0].exam_name}, ${tx.items[1].exam_name} +${tx.items.length - 2} más`;

                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tx.employees?.first_name} {tx.employees?.last_name}</p>
                            <p className="text-sm text-muted-foreground">{tx.employees?.operation_centers?.name || 'Sin centro'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{itemsSummary}</p>
                            <p className="text-xs text-muted-foreground">{tx.items.length} examen(es)</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {examTypeLabels[tx.exam_type as ExamType] || tx.exam_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {format(new Date(tx.exam_date), 'dd/MM/yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleView(tx.id)}>
                              <Eye className="w-4 h-4 mr-1" /> Ver
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteConfirmId(tx.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="catalogo" className="mt-6">
          <ExamCatalogTab />
        </TabsContent>

        <TabsContent value="profesiograma" className="mt-6">
          <ExamProfesiogramaTab
            centers={operationCenters.map(c => ({ id: c.id, name: c.name }))}
            positions={(positionsData as any[]).map((p: any) => ({ id: p.id, name: p.name }))}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ExamTransactionFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />
      <ExamTransactionDetailDialog open={isDetailOpen} onOpenChange={setIsDetailOpen} transaction={selectedTransaction} />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar aplicación de exámenes</AlertDialogTitle>
            <AlertDialogDescription>¿Estás seguro? Se eliminarán todos los exámenes de esta aplicación. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteMutation.mutate(deleteConfirmId, {
                    onSuccess: () => toast.success('Aplicación eliminada'),
                    onError: () => toast.error('Error al eliminar'),
                  });
                  setDeleteConfirmId(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
