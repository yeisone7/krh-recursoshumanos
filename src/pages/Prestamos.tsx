import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus, Search, DollarSign, Trash2, Eye, CreditCard,
  TrendingUp, AlertTriangle, CheckCircle, Clock, Ban,
  Banknote, Receipt, BarChart3
} from 'lucide-react';
import { LoanPortfolioDashboard } from '@/components/loans/LoanPortfolioDashboard';
import { LoanCollectionCalendar } from '@/components/loans/LoanCollectionCalendar';
import { LoanRiskScoring } from '@/components/loans/LoanRiskScoring';
import { LoanRefinanceDialog } from '@/components/loans/LoanRefinanceDialog';
import { useLoans, useLoanPayments, useCreateLoan, useUpdateLoan, useDeleteLoan, useRegisterPayment, useRefinancingHistory, type EmployeeLoan } from '@/hooks/useLoans';
import { useEmployees } from '@/hooks/useEmployees';
import { LoanFormDialog } from '@/components/loans/LoanFormDialog';

const LOAN_TYPE_LABELS: Record<string, string> = {
  personal: 'Personal',
  vivienda: 'Vivienda',
  educacion: 'Educación',
  calamidad: 'Calamidad',
  libranza: 'Libranza',
  anticipo: 'Anticipo de Salario',
  otro: 'Otro',
};

const STATUS_LABELS: Record<string, string> = {
  solicitado: 'Solicitado',
  aprobado: 'Aprobado',
  activo: 'Activo',
  pagado: 'Pagado',
  cancelado: 'Cancelado',
  rechazado: 'Rechazado',
};

const STATUS_COLORS: Record<string, string> = {
  solicitado: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  aprobado: 'bg-blue-100 text-blue-800 border-blue-200',
  activo: 'bg-green-100 text-green-800 border-green-200',
  pagado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelado: 'bg-background text-muted-foreground border-border',
  rechazado: 'bg-red-100 text-red-800 border-red-200',
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

export default function Prestamos() {
  const { data: loans = [], isLoading } = useLoans();
  const { data: employees = [] } = useEmployees();
  const createLoan = useCreateLoan();
  const updateLoan = useUpdateLoan();
  const deleteLoan = useDeleteLoan();
  const registerPayment = useRegisterPayment();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmployeeLoan | null>(null);
  const [detailLoan, setDetailLoan] = useState<EmployeeLoan | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [refinanceLoan, setRefinanceLoan] = useState<EmployeeLoan | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    loan_type: 'personal',
    description: '',
    total_amount: '',
    interest_rate: '0',
    installments: '1',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payroll_period: '',
    notes: '',
  });

  const { data: payments = [] } = useLoanPayments(detailLoan?.id || null);
  const { data: refinancingHistory = [] } = useRefinancingHistory(detailLoan?.id || null);

  const filtered = useMemo(() => {
    return loans.filter(l => {
      const name = `${l.employees_v2?.first_name} ${l.employees_v2?.last_name} ${l.employees_v2?.document_number}`.toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase()) || (l.description || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [loans, search, statusFilter]);

  // KPIs
  const totalActive = loans.filter(l => l.status === 'activo').reduce((s, l) => s + Number(l.remaining_balance), 0);
  const totalLoans = loans.filter(l => ['activo', 'aprobado'].includes(l.status)).length;
  const pendingApproval = loans.filter(l => l.status === 'solicitado').length;
  const fullyPaid = loans.filter(l => l.status === 'pagado').length;

  const resetForm = () => {
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (loan: EmployeeLoan) => {
    setEditing(loan);
    setShowForm(true);
  };

  const handleApprove = (loan: EmployeeLoan) => {
    updateLoan.mutate({ id: loan.id, status: 'activo', approved_at: new Date().toISOString() });
  };

  const handleReject = (loan: EmployeeLoan) => {
    updateLoan.mutate({ id: loan.id, status: 'rechazado' });
  };

  const handleRegisterPayment = () => {
    if (!detailLoan) return;
    const amount = Number(paymentData.amount);
    const newBalance = Number(detailLoan.remaining_balance) - amount;

    registerPayment.mutate({
      loan_id: detailLoan.id,
      payment_number: detailLoan.paid_installments + 1,
      payment_date: paymentData.payment_date,
      amount,
      balance_after: Math.max(0, newBalance),
      payroll_period: paymentData.payroll_period || null,
      notes: paymentData.notes || null,
    }, {
      onSuccess: () => {
        setShowPaymentForm(false);
        setPaymentData({ amount: '', payment_date: format(new Date(), 'yyyy-MM-dd'), payroll_period: '', notes: '' });
        // Refresh detail
        setDetailLoan(prev => prev ? {
          ...prev,
          paid_installments: prev.paid_installments + 1,
          paid_amount: Number(prev.paid_amount) + amount,
          remaining_balance: Math.max(0, newBalance),
          status: (prev.paid_installments + 1) >= prev.installments ? 'pagado' : 'activo',
        } : null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Préstamos</h1>
        <p className="text-muted-foreground">Gestión de préstamos a empleados con diferimiento por cuotas</p>
      </div>

      <Tabs defaultValue="listado" className="space-y-4">
        <TabsList className="h-12 w-full gap-1 overflow-x-auto overflow-y-hidden rounded-xl border border-border bg-slate-100 p-1 scrollbar-hide sm:w-auto">
          <TabsTrigger value="listado" className="h-10 min-w-[118px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
            <Receipt className="h-4 w-4 shrink-0" />
            Listado
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="h-10 min-w-[128px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
            <BarChart3 className="h-4 w-4 shrink-0" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="calendario" className="h-10 min-w-[130px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
            <CreditCard className="h-4 w-4 shrink-0" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="riesgo" className="h-10 min-w-[118px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Scoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <LoanPortfolioDashboard loans={loans} />
        </TabsContent>

        <TabsContent value="calendario">
          <LoanCollectionCalendar loans={loans} />
        </TabsContent>

        <TabsContent value="riesgo">
          <LoanRiskScoring loans={loans} />
        </TabsContent>

        <TabsContent value="listado" className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Saldo por Cobrar</p>
                <p className="text-lg font-bold">{formatCurrency(totalActive)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Préstamos Activos</p>
                <p className="text-lg font-bold">{totalLoans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pendientes Aprobación</p>
                <p className="text-lg font-bold">{pendingApproval}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pagados Completamente</p>
                <p className="text-lg font-bold">{fullyPaid}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <div className="relative min-w-0 lg:flex-1 lg:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por empleado..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="solicitado">Solicitado</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openCreate} className="sm:col-span-2 lg:col-span-1 lg:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Préstamo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto Total</TableHead>
                <TableHead className="text-center">Cuotas</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-center">Progreso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No se encontraron préstamos</TableCell></TableRow>
              ) : filtered.map(loan => {
                const progress = loan.installments > 0 ? (loan.paid_installments / loan.installments) * 100 : 0;
                return (
                  <TableRow key={loan.id} className="cursor-pointer hover:bg-background" onClick={() => setDetailLoan(loan)}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{loan.employees_v2?.first_name} {loan.employees_v2?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{loan.employees_v2?.document_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{LOAN_TYPE_LABELS[loan.loan_type] || loan.loan_type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(loan.total_with_interest))}</TableCell>
                    <TableCell className="text-center text-sm">{loan.paid_installments}/{loan.installments}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(loan.remaining_balance))}</TableCell>
                    <TableCell>
                      <div className="w-20 mx-auto">
                        <Progress value={progress} className="h-2" />
                        <p className="text-[10px] text-center text-muted-foreground mt-0.5">{progress.toFixed(0)}%</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs border ${STATUS_COLORS[loan.status] || ''}`} variant="outline">
                        {STATUS_LABELS[loan.status] || loan.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                        {loan.status === 'solicitado' && (
                          <>
                            <Button size="sm" variant="ghost" className="text-green-600 h-8" onClick={() => handleApprove(loan)}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600 h-8" onClick={() => handleReject(loan)}>
                              <Ban className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {['solicitado', 'aprobado'].includes(loan.status) && (
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => openEdit(loan)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {loan.status === 'activo' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 text-warning" onClick={() => setRefinanceLoan(loan)}>
                                <TrendingUp className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Refinanciar</TooltipContent>
                          </Tooltip>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive h-8"><Trash2 className="w-4 h-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar préstamo?</AlertDialogTitle>
                              <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteLoan.mutate(loan.id)}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </TooltipProvider>
        </CardContent>
      </Card>

      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Cargando...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No se encontraron préstamos</CardContent></Card>
        ) : filtered.map(loan => {
          const progress = loan.installments > 0 ? (loan.paid_installments / loan.installments) * 100 : 0;
          return (
            <Card key={loan.id} className="overflow-hidden">
              <CardContent className="space-y-4 p-4" onClick={() => setDetailLoan(loan)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{loan.employees_v2?.first_name} {loan.employees_v2?.last_name}</p>
                    <p className="text-xs text-muted-foreground">{loan.employees_v2?.document_number}</p>
                  </div>
                  <Badge className={`shrink-0 text-xs border ${STATUS_COLORS[loan.status] || ''}`} variant="outline">
                    {STATUS_LABELS[loan.status] || loan.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-background p-2">
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="font-medium">{LOAN_TYPE_LABELS[loan.loan_type] || loan.loan_type}</p>
                  </div>
                  <div className="rounded-md bg-background p-2">
                    <p className="text-xs text-muted-foreground">Cuotas</p>
                    <p className="font-medium">{loan.paid_installments}/{loan.installments}</p>
                  </div>
                  <div className="rounded-md bg-background p-2">
                    <p className="text-xs text-muted-foreground">Monto total</p>
                    <p className="font-medium">{formatCurrency(Number(loan.total_with_interest))}</p>
                  </div>
                  <div className="rounded-md bg-background p-2">
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className="font-medium">{formatCurrency(Number(loan.remaining_balance))}</p>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Progreso</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="flex flex-wrap justify-end gap-2" onClick={e => e.stopPropagation()}>
                  {loan.status === 'solicitado' && (
                    <>
                      <Button size="sm" variant="outline" className="text-primary" onClick={() => handleApprove(loan)}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Aprobar
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleReject(loan)}>
                        <Ban className="w-4 h-4 mr-1" /> Rechazar
                      </Button>
                    </>
                  )}
                  {['solicitado', 'aprobado'].includes(loan.status) && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(loan)}>
                      <Eye className="w-4 h-4 mr-1" /> Editar
                    </Button>
                  )}
                  {loan.status === 'activo' && (
                    <Button size="sm" variant="outline" className="text-warning" onClick={() => setRefinanceLoan(loan)}>
                      <TrendingUp className="w-4 h-4 mr-1" /> Refinanciar
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-destructive"><Trash2 className="w-4 h-4 mr-1" /> Eliminar</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar préstamo?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteLoan.mutate(loan.id)}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <LoanFormDialog 
        open={showForm} 
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            resetForm();
          } else {
            setShowForm(true);
          }
        }} 
        loan={editing} 
      />

      {/* Detail Dialog */}
      <Dialog open={!!detailLoan} onOpenChange={o => { if (!o) setDetailLoan(null); }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailLoan && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Banknote className="w-5 h-5" />
                  Detalle del Préstamo
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Loan summary */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Empleado</p>
                    <p className="font-medium text-sm">{detailLoan.employees_v2?.first_name} {detailLoan.employees_v2?.last_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="font-medium text-sm">{LOAN_TYPE_LABELS[detailLoan.loan_type]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <Badge className={`text-xs border ${STATUS_COLORS[detailLoan.status]}`} variant="outline">
                      {STATUS_LABELS[detailLoan.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monto Original</p>
                    <p className="font-medium text-sm">{formatCurrency(Number(detailLoan.total_amount))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total con Intereses</p>
                    <p className="font-medium text-sm">{formatCurrency(Number(detailLoan.total_with_interest))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tasa de Interés</p>
                    <p className="font-medium text-sm">{detailLoan.interest_rate}%</p>
                  </div>
                </div>

                {/* Progress */}
                <Card className="bg-background">
                  <CardContent className="pt-3 pb-2">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progreso de pago</span>
                      <span className="font-medium">{detailLoan.paid_installments} de {detailLoan.installments} cuotas</span>
                    </div>
                    <Progress value={(detailLoan.paid_installments / detailLoan.installments) * 100} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Pagado: {formatCurrency(Number(detailLoan.paid_amount))}</span>
                      <span>Saldo: {formatCurrency(Number(detailLoan.remaining_balance))}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment action */}
                {detailLoan.status === 'activo' && (
                  <Button onClick={() => {
                    setPaymentData({
                      amount: String(detailLoan.installment_amount),
                      payment_date: format(new Date(), 'yyyy-MM-dd'),
                      payroll_period: '',
                      notes: '',
                    });
                    setShowPaymentForm(true);
                  }}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Registrar Pago (Cuota #{detailLoan.paid_installments + 1})
                  </Button>
                )}

                <Separator />

                {/* Payment history */}
                <div>
                  <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    Historial de Pagos
                  </h3>
                  {payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Sin pagos registrados</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cuota #</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead className="text-right">Saldo Después</TableHead>
                          <TableHead>Período</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.payment_number}</TableCell>
                            <TableCell>{format(new Date(p.payment_date), 'dd MMM yyyy', { locale: es })}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(p.amount))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(p.balance_after))}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.payroll_period || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Refinancing history */}
                {refinancingHistory.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Historial de Refinanciamientos ({refinancingHistory.length})
                      </h3>
                      <div className="space-y-3">
                        {refinancingHistory.map(r => (
                          <div key={r.id} className="p-3 rounded-lg border bg-background space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {format(new Date(r.refinance_date), 'dd MMM yyyy HH:mm', { locale: es })}
                              </span>
                              {r.document_url && (
                                <a href={r.document_url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1">
                                  <Eye className="w-3 h-3" /> Ver PDF
                                </a>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              <div>
                                <span className="text-muted-foreground">Saldo anterior: </span>
                                <span className="font-mono">{formatCurrency(Number(r.previous_remaining_balance))}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Nuevo total: </span>
                                <span className="font-mono">{formatCurrency(Number(r.new_total_with_interest))}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Cuotas: </span>
                                <span>{r.previous_installments} → {r.new_installments}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Tasa: </span>
                                <span>{r.previous_interest_rate}% → {r.new_interest_rate}%</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Nueva cuota: </span>
                                <span className="font-mono">{formatCurrency(Number(r.new_installment_amount))}</span>
                              </div>
                            </div>
                            {r.reason && (
                              <p className="text-xs text-muted-foreground italic">"{r.reason}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment registration dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monto del Pago *</Label>
              <Input type="number" min="0" value={paymentData.amount} onChange={e => setPaymentData(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Fecha de Pago *</Label>
              <Input type="date" value={paymentData.payment_date} onChange={e => setPaymentData(p => ({ ...p, payment_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Período de Nómina</Label>
              <Input value={paymentData.payroll_period} onChange={e => setPaymentData(p => ({ ...p, payroll_period: e.target.value }))} placeholder="Ej: 2026-03-Q2" />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={paymentData.notes} onChange={e => setPaymentData(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentForm(false)}>Cancelar</Button>
            <Button onClick={handleRegisterPayment} disabled={!paymentData.amount || !paymentData.payment_date}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>
      </Tabs>

      {/* Refinance Dialog */}
      <LoanRefinanceDialog
        loan={refinanceLoan}
        open={!!refinanceLoan}
        onClose={() => setRefinanceLoan(null)}
      />
    </div>
  );
}
