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
import {
  Plus, Search, DollarSign, Trash2, Eye, CreditCard,
  TrendingUp, AlertTriangle, CheckCircle, Clock, Ban,
  Banknote, Receipt, BarChart3
} from 'lucide-react';
import { LoanPortfolioDashboard } from '@/components/loans/LoanPortfolioDashboard';
import { useLoans, useLoanPayments, useCreateLoan, useUpdateLoan, useDeleteLoan, useRegisterPayment, type EmployeeLoan } from '@/hooks/useLoans';
import { useEmployees } from '@/hooks/useEmployees';

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
  cancelado: 'bg-muted text-muted-foreground border-border',
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
    setFormData({ employee_id: '', loan_type: 'personal', description: '', total_amount: '', interest_rate: '0', installments: '1', start_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (loan: EmployeeLoan) => {
    setEditing(loan);
    setFormData({
      employee_id: loan.employee_id,
      loan_type: loan.loan_type,
      description: loan.description || '',
      total_amount: String(loan.total_amount),
      interest_rate: String(loan.interest_rate),
      installments: String(loan.installments),
      start_date: loan.start_date,
      notes: loan.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = () => {
    const totalAmount = Number(formData.total_amount);
    const interestRate = Number(formData.interest_rate);
    const installments = Number(formData.installments);
    const totalWithInterest = totalAmount * (1 + interestRate / 100);
    const installmentAmount = totalWithInterest / installments;

    const payload: any = {
      employee_id: formData.employee_id,
      loan_type: formData.loan_type,
      description: formData.description || null,
      total_amount: totalAmount,
      interest_rate: interestRate,
      total_with_interest: Math.round(totalWithInterest * 100) / 100,
      installments,
      installment_amount: Math.round(installmentAmount * 100) / 100,
      remaining_balance: editing ? undefined : Math.round(totalWithInterest * 100) / 100,
      start_date: formData.start_date,
      notes: formData.notes || null,
    };

    if (editing) {
      // Recalculate remaining if editing amounts
      const newBalance = Math.round(totalWithInterest * 100) / 100 - Number(editing.paid_amount);
      payload.remaining_balance = Math.max(0, newBalance);
      updateLoan.mutate({ id: editing.id, ...payload }, { onSuccess: () => setShowForm(false) });
    } else {
      payload.status = 'solicitado';
      createLoan.mutate(payload, { onSuccess: () => setShowForm(false) });
    }
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
        <TabsList>
          <TabsTrigger value="listado">
            <Receipt className="w-4 h-4 mr-2" />
            Listado
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard Cartera
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <LoanPortfolioDashboard loans={loans} />
        </TabsContent>

        <TabsContent value="listado" className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por empleado..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
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
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Préstamo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
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
                  <TableRow key={loan.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailLoan(loan)}>
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
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Préstamo' : 'Nuevo Préstamo'}</DialogTitle>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de Préstamo</Label>
                <Select value={formData.loan_type} onValueChange={v => setFormData(p => ({ ...p, loan_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOAN_TYPE_LABELS).map(([k, v]) => (
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
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Monto Total *</Label>
                <Input type="number" min="0" value={formData.total_amount} onChange={e => setFormData(p => ({ ...p, total_amount: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Interés (%)</Label>
                <Input type="number" min="0" step="0.01" value={formData.interest_rate} onChange={e => setFormData(p => ({ ...p, interest_rate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>N° Cuotas *</Label>
                <Input type="number" min="1" value={formData.installments} onChange={e => setFormData(p => ({ ...p, installments: e.target.value }))} />
              </div>
            </div>

            {/* Preview */}
            {Number(formData.total_amount) > 0 && Number(formData.installments) > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="pt-3 pb-2 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total con intereses:</span><span className="font-medium">{formatCurrency(Number(formData.total_amount) * (1 + Number(formData.interest_rate) / 100))}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Valor por cuota:</span><span className="font-medium">{formatCurrency((Number(formData.total_amount) * (1 + Number(formData.interest_rate) / 100)) / Number(formData.installments))}</span></div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Descripción del préstamo" />
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formData.employee_id || !formData.total_amount || !formData.installments}>
              {editing ? 'Actualizar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <Card className="bg-muted/30">
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
    </div>
  );
}
