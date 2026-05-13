import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Stethoscope, Plus, Search, Eye, Calendar, Loader2,
  ClipboardList, ShieldCheck, Trash2, CheckCircle, AlertTriangle, XCircle, Clock,
  FileDown,
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
import { MobileCardList } from '@/components/shared/MobileCardList';
import { useExamTransactions, useDeleteExamTransaction } from '@/hooks/useExamTransactions';
import type { ExamTransaction } from '@/hooks/useExamTransactions';
import { useOperationCenters, useCompanies } from '@/hooks/useCompanies';
import { usePositions } from '@/hooks/useSystemConfig';
import { useAuth } from '@/contexts/AuthContext';
import { examTypeLabels } from '@/types/medicalExam';
import type { ExamType } from '@/types/medicalExam';
import { generateExamOrderPdf } from '@/lib/examPdfGenerator';

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
  const { data: companies = [] } = useCompanies();

  const currentCompany = companies.find(c => c.id === currentCompanyId);

  const handleExportPdf = async (tx: ExamTransaction) => {
    try {
      await generateExamOrderPdf({
        companyName: currentCompany?.name || '',
        companyNit: currentCompany?.nit || '',
        logoUrl: currentCompany?.horizontal_logo_url || currentCompany?.logo_url,
        transaction: tx,
      });
      toast.success('Orden de exámenes exportada');
    } catch {
      toast.error('Error al exportar la orden');
    }
  };

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

  // Alerts from expiration dates
  const examAlerts = useMemo<ExamAlert[]>(() => {
    if (!transactions) return [];
    const alerts: ExamAlert[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const tx of transactions) {
      for (const item of tx.items) {
        if (!item.expiration_date) continue;
        const expDate = new Date(item.expiration_date);
        expDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) continue;

        let level: 'info' | 'warning' | 'critical' = 'info';
        if (diffDays <= 0) level = 'critical';
        else if (diffDays <= 15) level = 'warning';

        alerts.push({
          id: `${tx.id}-${item.id}`,
          examId: item.id,
          employeeId: tx.employee_id,
          employeeName: `${tx.employees?.first_name || ''} ${tx.employees?.last_name || ''}`.trim(),
          examType: tx.exam_type,
          expirationDate: item.expiration_date,
          daysRemaining: diffDays,
          level,
        });
      }
    }

    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
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
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 p-8 rounded-[2.5rem] border border-primary/10 shadow-sm">
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <Stethoscope className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter sm:text-4xl text-foreground">Exámenes Médicos</h1>
              <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-2">
                Gestión de exámenes ocupacionales, catálogo y profesiogramas
                <Badge variant="outline" className="rounded-lg px-2 bg-primary/5 border-primary/20 text-primary font-bold text-[10px] uppercase tracking-widest">SST</Badge>
              </p>
            </div>
          </div>
          {activeTab === 'aplicaciones' && (
            <Button 
              onClick={() => setIsFormOpen(true)} 
              className="h-12 px-8 rounded-2xl gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
            >
              <Plus className="w-4 h-4" /> Nueva Aplicación
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="flex justify-center sm:justify-start">
          <TabsList className="h-14 bg-background/50 backdrop-blur-md border border-border/50 p-1.5 rounded-[1.25rem] shadow-sm">
            {[
              { value: 'aplicaciones', label: 'Aplicaciones', icon: Stethoscope },
              { value: 'catalogo', label: 'Catálogo', icon: ClipboardList },
              { value: 'profesiograma', label: 'Profesiograma', icon: ShieldCheck },
            ].map((tab) => (
              <TabsTrigger 
                key={tab.value}
                value={tab.value} 
                className="rounded-[1rem] px-6 py-2 font-black text-[10px] uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20"
              >
                <tab.icon className="w-3.5 h-3.5 mr-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="aplicaciones" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Stats + Alerts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="group relative overflow-hidden p-8 rounded-[2.5rem] bg-background/40 backdrop-blur-xl border border-primary/5 shadow-sm hover:shadow-md transition-all duration-500 h-full flex flex-col justify-center">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-all duration-500" />
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-500">
                    <Stethoscope className="w-8 h-8" />
                  </div>
                  <div className="text-4xl font-black tracking-tighter text-foreground">{stats.total}</div>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Aplicaciones</p>
                  <p className="text-xs font-bold text-primary flex items-center gap-1.5 bg-primary/5 px-2.5 py-1 rounded-lg w-fit">
                    {stats.totalExams} exámenes realizados
                  </p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3">
              <ExamAlertsCard
                alerts={examAlerts}
                onAlertClick={(alert) => {
                  const tx = transactions?.find(t => t.items.some(i => i.id === alert.examId));
                  if (tx) handleView(tx.id);
                }}
              />
            </div>
          </div>

          {/* Main Table Container */}
          <div className="overflow-hidden rounded-[2.5rem] border border-primary/5 shadow-sm bg-background/40 backdrop-blur-xl">
            <div className="px-8 py-8 border-b border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter flex items-center gap-3">
                    Historial de Aplicaciones
                  </h3>
                  <p className="text-sm font-medium text-muted-foreground mt-1">Registros de exámenes médicos por empleado</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar empleado o examen..."
                      className="w-full sm:w-64 h-11 pl-10 pr-4 rounded-xl bg-background/50 border-border/50 focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 text-sm font-medium transition-all"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-11 w-full sm:w-48 rounded-xl border-border/50 bg-background/50 font-bold text-[10px] uppercase tracking-widest">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50">
                      <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">Todos los tipos</SelectItem>
                      {(Object.keys(examTypeLabels) as ExamType[]).map((type) => (
                        <SelectItem key={type} value={type} className="text-[10px] font-black uppercase tracking-widest">{examTypeLabels[type]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="p-2">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-32">
                  <Stethoscope className="w-20 h-20 mx-auto mb-6 text-muted-foreground/20" />
                  <p className="text-lg font-black tracking-tighter text-muted-foreground">
                    {searchQuery || typeFilter !== 'all' ? 'No hay resultados para los filtros aplicados' : 'No hay aplicaciones registradas'}
                  </p>
                  {!searchQuery && typeFilter === 'all' && (
                    <Button variant="ghost" className="mt-4 font-bold text-xs uppercase tracking-widest text-primary" onClick={() => setIsFormOpen(true)}>Registrar la primera aplicación</Button>
                  )}
                </div>
              ) : (
                <>
                <div className="hidden overflow-x-auto sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest px-6 py-4">Empleado</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest px-6 py-4">Detalle Exámenes</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest px-6 py-4">Tipo Aplicación</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest px-6 py-4">Fecha</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest px-6 py-4 text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((tx) => {
                        const itemsSummary = tx.items.length <= 2
                          ? tx.items.map(i => i.exam_name).join(', ')
                          : `${tx.items[0].exam_name}, ${tx.items[1].exam_name} +${tx.items.length - 2} más`;
                        const badgeStyle = examTypeBadgeStyles[tx.exam_type] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };

                        return (
                          <TableRow key={tx.id} className="group border-border/40 hover:bg-primary/[0.02] transition-colors">
                            <TableCell className="px-6 py-4">
                              <div>
                                <p className="font-black tracking-tight text-foreground">{tx.employees?.first_name} {tx.employees?.last_name}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{tx.employees?.operation_centers?.name || 'Sin centro'}</p>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <div className="max-w-[250px]">
                                <p className="font-bold text-sm text-foreground truncate">{itemsSummary}</p>
                                <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">{tx.items.length} examen(es)</p>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <Badge variant="outline" className={cn('rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter border', badgeStyle.bg, badgeStyle.text, badgeStyle.border)}>
                                {examTypeLabels[tx.exam_type as ExamType] || tx.exam_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                <Calendar className="w-4 h-4 text-primary/40" />
                                {format(new Date(tx.exam_date), 'dd MMM yyyy', { locale: es })}
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleView(tx.id)}
                                  className="h-9 w-9 rounded-xl hover:bg-background hover:shadow-sm text-primary transition-all"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleExportPdf(tx)}
                                  className="h-9 w-9 rounded-xl hover:bg-background hover:shadow-sm text-primary transition-all"
                                >
                                  <FileDown className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost" 
                                  size="icon"
                                  className="h-9 w-9 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
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
                </div>
                
                <MobileCardList
                  className="sm:hidden p-4"
                  items={filteredTransactions.map((tx) => {
                    const itemsSummary = tx.items.length <= 2
                      ? tx.items.map(i => i.exam_name).join(', ')
                      : `${tx.items[0].exam_name}, ${tx.items[1].exam_name} +${tx.items.length - 2} más`;
                    const badgeStyle = examTypeBadgeStyles[tx.exam_type] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };

                    return {
                      id: tx.id,
                      title: `${tx.employees?.first_name || ''} ${tx.employees?.last_name || ''}`.trim() || 'Empleado',
                      subtitle: tx.employees?.operation_centers?.name || 'Sin centro',
                      badge: (
                        <Badge variant="outline" className={cn('rounded-lg px-2 text-[10px] font-black uppercase tracking-tighter border', badgeStyle.bg, badgeStyle.text, badgeStyle.border)}>
                          {examTypeLabels[tx.exam_type as ExamType] || tx.exam_type}
                        </Badge>
                      ),
                      fields: [
                        { label: 'Exámenes', value: itemsSummary, className: 'col-span-2' },
                        { label: 'Cantidad', value: `${tx.items.length} exámenes` },
                        { label: 'Fecha', value: format(new Date(tx.exam_date), 'dd/MM/yyyy') },
                      ],
                      actions: (
                        <div className="grid grid-cols-3 gap-2 w-full mt-2">
                          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleView(tx.id)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleExportPdf(tx)}>
                            <FileDown className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-xl text-destructive" onClick={() => setDeleteConfirmId(tx.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ),
                    };
                  })}
                />
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="catalogo" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-hidden rounded-[2.5rem] border border-primary/5 shadow-sm bg-background/40 backdrop-blur-xl">
            <ExamCatalogTab />
          </div>
        </TabsContent>

        <TabsContent value="profesiograma" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-hidden rounded-[2.5rem] border border-primary/5 shadow-sm bg-background/40 backdrop-blur-xl">
            <ExamProfesiogramaTab
              centers={operationCenters.map(c => ({ id: c.id, name: c.name }))}
              positions={(positionsData as any[]).map((p: any) => ({ id: p.id, name: p.name }))}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ExamTransactionFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />
      <ExamTransactionDetailDialog open={isDetailOpen} onOpenChange={setIsDetailOpen} transaction={selectedTransaction} />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-[2rem] border-0 shadow-2xl bg-background/95 backdrop-blur-xl overflow-hidden p-0">
          <div className="px-8 py-8 bg-gradient-to-br from-destructive/10 via-background to-destructive/5 border-b border-destructive/10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-destructive flex items-center justify-center shadow-lg shadow-destructive/20">
                <Trash2 className="w-6 h-6 text-destructive-foreground" />
              </div>
              <div>
                <AlertDialogTitle className="text-2xl font-black tracking-tighter">Eliminar Registro</AlertDialogTitle>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Esta acción es irreversible</p>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <AlertDialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
              ¿Estás seguro de que deseas eliminar esta aplicación de exámenes? Se eliminarán permanentemente todos los resultados y datos asociados a este registro.
            </AlertDialogDescription>
            
            <div className="flex items-center justify-end gap-3 mt-8">
              <AlertDialogCancel className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] border-0 bg-muted hover:bg-muted/80 transition-all">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 hover:bg-destructive/90 transition-all"
                onClick={() => {
                  if (deleteConfirmId) {
                    deleteMutation.mutate(deleteConfirmId, {
                      onSuccess: () => toast.success('Aplicación eliminada satisfactoriamente'),
                      onError: () => toast.error('Error al procesar la eliminación'),
                    });
                    setDeleteConfirmId(null);
                  }
                }}
              >
                Confirmar Eliminación
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
