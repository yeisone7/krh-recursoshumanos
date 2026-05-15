import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit2, Landmark, Percent, ArrowRightLeft, AlertTriangle, CheckCircle, Clock, Upload, Calculator, Download, LayoutDashboard, PiggyBank, TrendingUp, History } from 'lucide-react';
import { 
  useCesantiasDeposits, 
  useCesantiasInterestPayments, 
  useCesantiasWithdrawals,
  useCesantiasComplianceSummary 
} from '@/hooks/useCesantias';
import { DepositFormDialog, InterestFormDialog, WithdrawalFormDialog, ImportCesantiasDialog } from '@/components/cesantias';
import { cesantiasStatusLabels, withdrawalReasonLabels, withdrawalStatusLabels } from '@/types/cesantias';
import type { CesantiasDeposit, CesantiasInterestPayment, CesantiasWithdrawal } from '@/types/cesantias';
import { MobileCardList } from '@/components/shared/MobileCardList';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function Cesantias() {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<CesantiasDeposit | null>(null);
  const [selectedInterest, setSelectedInterest] = useState<CesantiasInterestPayment | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<CesantiasWithdrawal | null>(null);
  const [showImportDeposits, setShowImportDeposits] = useState(false);
  const [showImportInterests, setShowImportInterests] = useState(false);

  const { data: deposits = [], isLoading: loadingDeposits } = useCesantiasDeposits(selectedYear);
  const { data: interests = [], isLoading: loadingInterests } = useCesantiasInterestPayments(selectedYear);
  const { data: withdrawals = [], isLoading: loadingWithdrawals } = useCesantiasWithdrawals();
  const { data: compliance } = useCesantiasComplianceSummary(selectedYear);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string, isLate?: boolean) => {
    if (isLate) {
      return <Badge variant="destructive">Extemporáneo</Badge>;
    }
    switch (status) {
      case 'depositado':
      case 'desembolsado':
        return <Badge className="bg-success/20 text-success">Completado</Badge>;
      case 'pendiente':
      case 'solicitado':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'calculado':
      case 'en_tramite':
      case 'aprobado':
        return <Badge className="bg-warning/20 text-warning">En Proceso</Badge>;
      case 'rechazado':
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const yearOptions = years.map((year) => ({
    value: year.toString(),
    label: year.toString(),
  }));

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Header Premium */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 p-8 rounded-[2.5rem] border border-border shadow-sm">
        
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <Landmark className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter sm:text-4xl text-foreground">Cesantías</h1>
              <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-2">
                Gestión y cumplimiento legal de cesantías e intereses
                <Badge variant="outline" className="rounded-lg px-2 border-primary/20 text-primary font-bold text-[10px] uppercase tracking-widest">Año {selectedYear}</Badge>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-background p-2 rounded-2xl border border-border/50 ">
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Seleccionar Periodo</span>
             <SearchableSelect
              options={yearOptions}
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
              placeholder="Año"
              searchPlaceholder="Buscar año..."
              triggerClassName="w-32 h-10 rounded-xl border-0 bg-background shadow-sm font-bold"
            />
          </div>
        </div>
      </div>

      {/* Compliance Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { 
            icon: Landmark, 
            label: 'Depósitos al Fondo', 
            value: deposits.length, 
            color: 'primary',
            footer: (
              <div className="flex gap-3 mt-4">
                <span className="text-[10px] font-bold text-success flex items-center gap-1 bg-success/10 px-2 py-0.5 rounded-lg">
                  <CheckCircle className="w-3 h-3" />{compliance?.deposits.onTime || 0} A tiempo
                </span>
                {(compliance?.deposits.late || 0) > 0 && (
                  <span className="text-[10px] font-bold text-destructive flex items-center gap-1 bg-destructive/10 px-2 py-0.5 rounded-lg">
                    <AlertTriangle className="w-3 h-3" />{compliance?.deposits.late} Tardíos
                  </span>
                )}
              </div>
            )
          },
          { 
            icon: Percent, 
            label: 'Pago de Intereses', 
            value: interests.length, 
            color: 'violet',
            footer: (
              <div className="flex gap-3 mt-4">
                <span className="text-[10px] font-bold text-success flex items-center gap-1 bg-success/10 px-2 py-0.5 rounded-lg">
                  <CheckCircle className="w-3 h-3" />{compliance?.interest.onTime || 0} Pagados
                </span>
                {(compliance?.interest.pending || 0) > 0 && (
                  <span className="text-[10px] font-bold text-violet flex items-center gap-1 bg-violet/10 px-2 py-0.5 rounded-lg">
                    <Clock className="w-3 h-3" />{compliance?.interest.pending} Pendientes
                  </span>
                )}
              </div>
            )
          },
          { 
            icon: ArrowRightLeft, 
            label: 'Retiros Parciales', 
            value: withdrawals.length, 
            color: 'info',
            footer: <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-4">Solicitudes procesadas</p>
          },
          { 
            icon: Clock, 
            label: 'Fechas Límite', 
            value: selectedYear, 
            color: 'success',
            isSpecial: true,
            footer: (
              <div className="space-y-2 mt-4 pt-4 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Intereses</span>
                  <span className="text-[10px] font-black text-foreground bg-background px-2 py-1 rounded-lg border shadow-sm">31 ENE {selectedYear + 1}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Depósito</span>
                  <span className="text-[10px] font-black text-foreground bg-background px-2 py-1 rounded-lg border shadow-sm">14 FEB {selectedYear + 1}</span>
                </div>
              </div>
            )
          }
        ].map((card, i) => (
          <div key={i} className={`group relative overflow-hidden p-6 rounded-[2rem] bg-background border border-border shadow-sm hover:shadow-md transition-all duration-500 ${card.isSpecial ? 'bg-primary/[0.02] border-primary/20' : ''}`}>
             <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-${card.color}-light text-${card.color} group-hover:scale-110 transition-transform duration-500`}>
                  <card.icon className="w-6 h-6" />
                </div>
                {!card.isSpecial && <div className="text-3xl font-black tracking-tighter text-foreground">{card.value}</div>}
             </div>
             <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">{card.label}</p>
                {card.isSpecial && <div className="text-xl font-black tracking-tighter text-foreground">Calendario Legal</div>}
             </div>
             {card.footer}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="deposits" className="space-y-6">
        <div className="bg-background p-2 rounded-[2rem] border border-border shadow-sm inline-flex items-center">
          <TabsList className="bg-transparent gap-2 h-auto p-0">
            {[
              { value: 'deposits', label: 'Depósitos al Fondo', icon: Landmark },
              { value: 'interests', label: 'Intereses', icon: Percent },
              { value: 'withdrawals', label: 'Retiros Parciales', icon: ArrowRightLeft },
            ].map((tab) => (
              <TabsTrigger 
                key={tab.value}
                value={tab.value} 
                className="rounded-2xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20"
              >
                <tab.icon className="w-3.5 h-3.5 mr-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Deposits Tab */}
        <TabsContent value="deposits" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-hidden rounded-[2.5rem] border border-border shadow-sm bg-background ">
            <div className="px-8 py-8 border-b border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-transparent flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-black tracking-tighter flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Landmark className="w-5 h-5" />
                  </div>
                  Depósitos de Cesantías {selectedYear}
                </h3>
                <p className="text-sm font-medium text-muted-foreground mt-1 ml-11">Consignación al fondo antes del 14 de febrero del año siguiente</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowImportDeposits(true)} className="h-11 px-6 rounded-2xl gap-2 font-black uppercase tracking-widest text-[10px] bg-background border-border/50 hover:bg-background transition-all">
                  <Upload className="w-4 h-4" /> Importar
                </Button>
                <Button onClick={() => { setSelectedDeposit(null); setShowDepositForm(true); }} className="h-11 px-6 rounded-2xl gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
                  <Plus className="w-4 h-4" /> Nuevo Depósito
                </Button>
              </div>
            </div>
            
            <div className="p-2">
              {loadingDeposits ? (
                <div className="space-y-4 p-8">
                  <Skeleton className="h-12 w-full rounded-2xl" />
                  <Skeleton className="h-12 w-full rounded-2xl" />
                  <Skeleton className="h-12 w-full rounded-2xl" />
                </div>
              ) : deposits.length === 0 ? (
                <div className="text-center py-32">
                   <Landmark className="w-20 h-20 mx-auto mb-6 text-muted-foreground/20" />
                   <p className="text-lg font-black tracking-tighter text-muted-foreground">No hay depósitos registrados para {selectedYear}</p>
                   <Button variant="ghost" className="mt-4 font-bold text-xs uppercase tracking-widest text-primary" onClick={() => setShowDepositForm(true)}>Registrar el primer depósito</Button>
                </div>
              ) : (
                <>
                <div className="hidden overflow-x-auto sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-0">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Empleado</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Salario Base</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12 text-center">Días</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Valor Cesantías</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Fondo</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Fecha Límite</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Estado</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12 text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposits.map((deposit) => (
                        <TableRow key={deposit.id} className="group hover:bg-primary/[0.02] transition-colors border-b border-border/50 last:border-0">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                {deposit.employee?.first_name[0]}{deposit.employee?.last_name[0]}
                              </div>
                              <span className="font-bold text-sm text-foreground">
                                {deposit.employee?.first_name} {deposit.employee?.last_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="text-sm font-medium text-muted-foreground">{formatCurrency(deposit.base_salary)}</span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center">
                            <Badge variant="outline" className="rounded-lg font-bold bg-background border-border/50">{deposit.days_worked}</Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="text-sm font-black text-foreground">{formatCurrency(deposit.cesantias_amount)}</span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-foreground">{deposit.fund_name}</span>
                              {deposit.fund_account && <span className="text-[10px] font-medium text-muted-foreground">Cta: {deposit.fund_account}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                             <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                               <Calendar className="w-3.5 h-3.5" />
                               {format(new Date(deposit.due_date), 'dd MMM yyyy', { locale: es })}
                             </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">{getStatusBadge(deposit.status, deposit.is_late)}</TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 rounded-xl hover:bg-background hover:shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                              onClick={() => { setSelectedDeposit(deposit); setShowDepositForm(true); }}
                            >
                              <Edit2 className="w-4 h-4 text-primary" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <MobileCardList
                  className="sm:hidden p-4"
                  items={deposits.map((deposit) => ({
                    id: deposit.id,
                    title: `${deposit.employee?.first_name || ''} ${deposit.employee?.last_name || ''}`.trim() || 'Empleado',
                    subtitle: deposit.fund_name,
                    badge: getStatusBadge(deposit.status, deposit.is_late),
                    fields: [
                      { label: 'Valor cesantías', value: formatCurrency(deposit.cesantias_amount), className: 'col-span-2' },
                      { label: 'Salario base', value: formatCurrency(deposit.base_salary) },
                      { label: 'Días', value: deposit.days_worked },
                      { label: 'Fecha límite', value: format(new Date(deposit.due_date), 'dd MMM yyyy', { locale: es }) },
                    ],
                    actions: (
                      <Button size="sm" variant="outline" className="w-full rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => { setSelectedDeposit(deposit); setShowDepositForm(true); }}>
                        <Edit2 className="w-4 h-4 mr-2" /> Editar Registro
                      </Button>
                    ),
                  }))}
                  emptyMessage={`No hay depósitos registrados para ${selectedYear}`}
                />
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Interests Tab */}
        <TabsContent value="interests" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="overflow-hidden rounded-[2.5rem] border border-border shadow-sm bg-background ">
            <div className="px-8 py-8 border-b border-border/50 bg-gradient-to-br from-violet/5 via-transparent to-transparent flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-black tracking-tighter flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet/10 text-violet">
                    <Percent className="w-5 h-5" />
                  </div>
                  Intereses sobre Cesantías {selectedYear}
                </h3>
                <p className="text-sm font-medium text-muted-foreground mt-1 ml-11">Pago del 12% anual directamente al empleado antes del 31 de enero</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowImportInterests(true)} className="h-11 px-6 rounded-2xl gap-2 font-black uppercase tracking-widest text-[10px] bg-background border-border/50 hover:bg-background transition-all">
                  <Upload className="w-4 h-4" /> Importar
                </Button>
                <Button onClick={() => { setSelectedInterest(null); setShowInterestForm(true); }} className="h-11 px-6 rounded-2xl gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-violet/20 hover:shadow-xl transition-all">
                  <Plus className="w-4 h-4" /> Nuevo Pago
                </Button>
              </div>
            </div>
            
            <div className="p-2">
              {loadingInterests ? (
                <div className="space-y-4 p-8">
                  <Skeleton className="h-12 w-full rounded-2xl" />
                  <Skeleton className="h-12 w-full rounded-2xl" />
                </div>
              ) : interests.length === 0 ? (
                <div className="text-center py-32">
                   <Percent className="w-20 h-20 mx-auto mb-6 text-muted-foreground/20" />
                   <p className="text-lg font-black tracking-tighter text-muted-foreground">No hay pagos de intereses registrados para {selectedYear}</p>
                </div>
              ) : (
                <>
                <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-0">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Empleado</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Saldo Cesantías</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12 text-center">Tasa</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12 text-center">Días</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Valor Intereses</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Fecha Límite</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Estado</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interests.map((interest) => (
                      <TableRow key={interest.id} className="group hover:bg-primary/[0.02] transition-colors border-b border-border/50 last:border-0">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-warning/10 flex items-center justify-center text-warning font-black text-xs">
                              {interest.employee?.first_name[0]}{interest.employee?.last_name[0]}
                            </div>
                            <span className="font-bold text-sm text-foreground">
                              {interest.employee?.first_name} {interest.employee?.last_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm font-medium text-muted-foreground">{formatCurrency(interest.cesantias_balance)}</TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <Badge variant="secondary" className="rounded-lg font-bold">{interest.interest_rate}%</Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <span className="text-xs font-bold text-muted-foreground">{interest.days_accrued}</span>
                        </TableCell>
                        <TableCell className="px-6 py-4 font-black text-foreground">
                          {formatCurrency(interest.interest_amount)}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                             <Calendar className="w-3.5 h-3.5" />
                             {format(new Date(interest.due_date), 'dd MMM yyyy', { locale: es })}
                           </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {interest.is_paid ? (
                            getStatusBadge('depositado', interest.is_late)
                          ) : (
                            getStatusBadge('pendiente')
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-xl hover:bg-background hover:shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => { setSelectedInterest(interest); setShowInterestForm(true); }}
                          >
                            <Edit2 className="w-4 h-4 text-primary" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                <MobileCardList
                  className="sm:hidden p-4"
                  items={interests.map((interest) => ({
                    id: interest.id,
                    title: `${interest.employee?.first_name || ''} ${interest.employee?.last_name || ''}`.trim() || 'Empleado',
                    subtitle: `${interest.interest_rate}% · ${interest.days_accrued} días`,
                    badge: interest.is_paid ? getStatusBadge('depositado', interest.is_late) : getStatusBadge('pendiente'),
                    fields: [
                      { label: 'Valor intereses', value: formatCurrency(interest.interest_amount), className: 'col-span-2' },
                      { label: 'Saldo cesantías', value: formatCurrency(interest.cesantias_balance) },
                      { label: 'Fecha límite', value: format(new Date(interest.due_date), 'dd MMM yyyy', { locale: es }) },
                    ],
                    actions: (
                      <Button size="sm" variant="outline" className="w-full rounded-xl font-bold uppercase tracking-widest text-[10px] text-violet" onClick={() => { setSelectedInterest(interest); setShowInterestForm(true); }}>
                        <Edit2 className="w-4 h-4 mr-2" /> Editar Registro
                      </Button>
                    ),
                  }))}
                  emptyMessage={`No hay pagos de intereses registrados para ${selectedYear}`}
                />
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-hidden rounded-[2.5rem] border border-border shadow-sm bg-background ">
            <div className="px-8 py-8 border-b border-border/50 bg-gradient-to-br from-info/5 via-transparent to-transparent flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-black tracking-tighter flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-info/10 text-info">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  Retiros Parciales de Cesantías
                </h3>
                <p className="text-sm font-medium text-muted-foreground mt-1 ml-11">Solicitudes para vivienda, educación o terminación de contrato</p>
              </div>
              <Button onClick={() => { setSelectedWithdrawal(null); setShowWithdrawalForm(true); }} className="h-11 px-6 rounded-2xl gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-info/20 hover:shadow-xl transition-all">
                <Plus className="w-4 h-4" /> Nueva Solicitud
              </Button>
            </div>
            
            <div className="p-2">
              {loadingWithdrawals ? (
                <div className="space-y-4 p-8">
                  <Skeleton className="h-12 w-full rounded-2xl" />
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-32">
                   <ArrowRightLeft className="w-20 h-20 mx-auto mb-6 text-muted-foreground/20" />
                   <p className="text-lg font-black tracking-tighter text-muted-foreground">No hay solicitudes de retiro registradas</p>
                </div>
              ) : (
                <>
                <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-0">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Empleado</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Fecha Solicitud</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Motivo</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Monto Solicitado</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Monto Aprobado</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Fondo</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12">Estado</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6 h-12 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id} className="group hover:bg-primary/[0.02] transition-colors border-b border-border/50 last:border-0">
                        <TableCell className="px-6 py-4">
                           <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-info/10 flex items-center justify-center text-info font-black text-xs">
                              {withdrawal.employee?.first_name[0]}{withdrawal.employee?.last_name[0]}
                            </div>
                            <span className="font-bold text-sm text-foreground">
                              {withdrawal.employee?.first_name} {withdrawal.employee?.last_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                           <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                             <Calendar className="w-3.5 h-3.5" />
                             {format(new Date(withdrawal.request_date), 'dd MMM yyyy', { locale: es })}
                           </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge variant="outline" className="rounded-lg font-bold bg-background border-border/50 text-[10px] uppercase tracking-wider">
                            {withdrawalReasonLabels[withdrawal.withdrawal_reason]}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm font-medium text-muted-foreground">{formatCurrency(withdrawal.amount_requested)}</TableCell>
                        <TableCell className="px-6 py-4">
                          <span className="text-sm font-black text-foreground">
                            {withdrawal.amount_approved ? formatCurrency(withdrawal.amount_approved) : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm font-bold text-foreground">{withdrawal.fund_name}</TableCell>
                        <TableCell className="px-6 py-4">{getStatusBadge(withdrawal.status)}</TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-xl hover:bg-background hover:shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => { setSelectedWithdrawal(withdrawal); setShowWithdrawalForm(true); }}
                          >
                            <Edit2 className="w-4 h-4 text-primary" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                <MobileCardList
                  className="sm:hidden p-4"
                  items={withdrawals.map((withdrawal) => ({
                    id: withdrawal.id,
                    title: `${withdrawal.employee?.first_name || ''} ${withdrawal.employee?.last_name || ''}`.trim() || 'Empleado',
                    subtitle: withdrawal.fund_name,
                    badge: getStatusBadge(withdrawal.status),
                    fields: [
                      { label: 'Solicitado', value: formatCurrency(withdrawal.amount_requested), className: 'col-span-2' },
                      { label: 'Aprobado', value: withdrawal.amount_approved ? formatCurrency(withdrawal.amount_approved) : '-' },
                      { label: 'Solicitud', value: format(new Date(withdrawal.request_date), 'dd MMM yyyy', { locale: es }) },
                      { label: 'Motivo', value: withdrawalReasonLabels[withdrawal.withdrawal_reason], className: 'col-span-2' },
                    ],
                    actions: (
                      <Button size="sm" variant="outline" className="w-full rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => { setSelectedWithdrawal(withdrawal); setShowWithdrawalForm(true); }}>
                        <Edit2 className="w-4 h-4 mr-2" /> Editar Registro
                      </Button>
                    ),
                  }))}
                  emptyMessage="No hay solicitudes de retiro registradas"
                />
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs con estética premium ya integrada o por integrar */}
      <DepositFormDialog
        open={showDepositForm}
        onOpenChange={setShowDepositForm}
        deposit={selectedDeposit}
      />
      <InterestFormDialog
        open={showInterestForm}
        onOpenChange={setShowInterestForm}
        interest={selectedInterest}
      />
      <WithdrawalFormDialog
        open={showWithdrawalForm}
        onOpenChange={setShowWithdrawalForm}
        withdrawal={selectedWithdrawal}
      />
      <ImportCesantiasDialog
        open={showImportDeposits}
        onOpenChange={setShowImportDeposits}
        type="deposits"
      />
      <ImportCesantiasDialog
        open={showImportInterests}
        onOpenChange={setShowImportInterests}
        type="interests"
      />
    </div>
  );
}
