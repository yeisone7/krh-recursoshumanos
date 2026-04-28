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
import { Plus, Edit2, Landmark, Percent, ArrowRightLeft, AlertTriangle, CheckCircle, Clock, Upload } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cesantías</h1>
          <p className="text-muted-foreground">
            Gestión y cumplimiento legal de cesantías e intereses
          </p>
        </div>
        <SearchableSelect
          options={yearOptions}
          value={selectedYear.toString()}
          onValueChange={(v) => setSelectedYear(parseInt(v))}
          placeholder="Año"
          searchPlaceholder="Buscar año..."
          triggerClassName="w-full sm:w-32"
        />
      </div>

      {/* Compliance Summary Cards */}
      <div className="hidden gap-4 md:grid md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Landmark className="w-4 h-4" />
              Depósitos al Fondo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deposits.length}</div>
            <div className="flex gap-2 mt-1 text-xs">
              <span className="text-success flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />{compliance?.deposits.onTime || 0} a tiempo
              </span>
              {(compliance?.deposits.late || 0) > 0 && (
                <span className="text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />{compliance?.deposits.late} tardíos
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Pago de Intereses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interests.length}</div>
            <div className="flex gap-2 mt-1 text-xs">
              <span className="text-success flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />{compliance?.interest.onTime || 0} pagados
              </span>
              {(compliance?.interest.pending || 0) > 0 && (
                <span className="text-warning flex items-center gap-1">
                  <Clock className="w-3 h-3" />{compliance?.interest.pending} pendientes
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Retiros Parciales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withdrawals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              solicitudes procesadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardDescription>Fechas Límite {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="font-medium">Intereses:</span> 31 Ene {selectedYear + 1}</p>
            <p><span className="font-medium">Depósito:</span> 14 Feb {selectedYear + 1}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="deposits" className="space-y-4 min-w-0">
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto overscroll-x-contain p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:inline-flex sm:w-auto">
          <TabsTrigger value="deposits" className="shrink-0 whitespace-nowrap text-xs sm:text-sm">Depósitos al Fondo</TabsTrigger>
          <TabsTrigger value="interests" className="shrink-0 whitespace-nowrap text-xs sm:text-sm">Intereses</TabsTrigger>
          <TabsTrigger value="withdrawals" className="shrink-0 whitespace-nowrap text-xs sm:text-sm">Retiros Parciales</TabsTrigger>
        </TabsList>

        {/* Deposits Tab */}
        <TabsContent value="deposits">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Depósitos de Cesantías {selectedYear}</CardTitle>
                <CardDescription>
                  Consignación al fondo antes del 14 de febrero del año siguiente
                </CardDescription>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                <Button variant="outline" onClick={() => setShowImportDeposits(true)} className="w-full sm:w-auto">
                  <Upload className="w-4 h-4 mr-2" />Importar
                </Button>
                <Button onClick={() => { setSelectedDeposit(null); setShowDepositForm(true); }} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />Nuevo Depósito
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDeposits ? (
                <Skeleton className="h-48 w-full" />
              ) : deposits.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay depósitos registrados para {selectedYear}
                </p>
              ) : (
                <>
                <div className="hidden overflow-x-auto sm:block">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Salario Base</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead>Valor Cesantías</TableHead>
                      <TableHead>Fondo</TableHead>
                      <TableHead>Fecha Límite</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposits.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell className="font-medium">
                          {deposit.employee?.first_name} {deposit.employee?.last_name}
                        </TableCell>
                        <TableCell>{formatCurrency(deposit.base_salary)}</TableCell>
                        <TableCell>{deposit.days_worked}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(deposit.cesantias_amount)}
                        </TableCell>
                        <TableCell>{deposit.fund_name}</TableCell>
                        <TableCell>
                          {format(new Date(deposit.due_date), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell>{getStatusBadge(deposit.status, deposit.is_late)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelectedDeposit(deposit); setShowDepositForm(true); }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                <MobileCardList
                  className="sm:hidden"
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
                      <Button size="sm" variant="outline" onClick={() => { setSelectedDeposit(deposit); setShowDepositForm(true); }}>
                        <Edit2 className="w-4 h-4 mr-2" />Editar
                      </Button>
                    ),
                  }))}
                  emptyMessage={`No hay depósitos registrados para ${selectedYear}`}
                />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interests Tab */}
        <TabsContent value="interests">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Intereses sobre Cesantías {selectedYear}</CardTitle>
                <CardDescription>
                  Pago del 12% anual directamente al empleado antes del 31 de enero
                </CardDescription>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                <Button variant="outline" onClick={() => setShowImportInterests(true)} className="w-full sm:w-auto">
                  <Upload className="w-4 h-4 mr-2" />Importar
                </Button>
                <Button onClick={() => { setSelectedInterest(null); setShowInterestForm(true); }} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />Nuevo Pago
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingInterests ? (
                <Skeleton className="h-48 w-full" />
              ) : interests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay pagos de intereses registrados para {selectedYear}
                </p>
              ) : (
                <>
                <div className="hidden overflow-x-auto sm:block">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Saldo Cesantías</TableHead>
                      <TableHead>Tasa</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead>Valor Intereses</TableHead>
                      <TableHead>Fecha Límite</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interests.map((interest) => (
                      <TableRow key={interest.id}>
                        <TableCell className="font-medium">
                          {interest.employee?.first_name} {interest.employee?.last_name}
                        </TableCell>
                        <TableCell>{formatCurrency(interest.cesantias_balance)}</TableCell>
                        <TableCell>{interest.interest_rate}%</TableCell>
                        <TableCell>{interest.days_accrued}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(interest.interest_amount)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(interest.due_date), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell>
                          {interest.is_paid ? (
                            getStatusBadge('depositado', interest.is_late)
                          ) : (
                            getStatusBadge('pendiente')
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelectedInterest(interest); setShowInterestForm(true); }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                <MobileCardList
                  className="sm:hidden"
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
                      <Button size="sm" variant="outline" onClick={() => { setSelectedInterest(interest); setShowInterestForm(true); }}>
                        <Edit2 className="w-4 h-4 mr-2" />Editar
                      </Button>
                    ),
                  }))}
                  emptyMessage={`No hay pagos de intereses registrados para ${selectedYear}`}
                />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Retiros Parciales de Cesantías</CardTitle>
                <CardDescription>
                  Solicitudes para vivienda, educación o terminación de contrato
                </CardDescription>
              </div>
              <Button onClick={() => { setSelectedWithdrawal(null); setShowWithdrawalForm(true); }} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />Nueva Solicitud
              </Button>
            </CardHeader>
            <CardContent>
              {loadingWithdrawals ? (
                <Skeleton className="h-48 w-full" />
              ) : withdrawals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay solicitudes de retiro registradas
                </p>
              ) : (
                <>
                <div className="hidden overflow-x-auto sm:block">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Fecha Solicitud</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Monto Solicitado</TableHead>
                      <TableHead>Monto Aprobado</TableHead>
                      <TableHead>Fondo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell className="font-medium">
                          {withdrawal.employee?.first_name} {withdrawal.employee?.last_name}
                        </TableCell>
                        <TableCell>
                          {format(new Date(withdrawal.request_date), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {withdrawalReasonLabels[withdrawal.withdrawal_reason]}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(withdrawal.amount_requested)}</TableCell>
                        <TableCell>
                          {withdrawal.amount_approved 
                            ? formatCurrency(withdrawal.amount_approved) 
                            : '-'}
                        </TableCell>
                        <TableCell>{withdrawal.fund_name}</TableCell>
                        <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelectedWithdrawal(withdrawal); setShowWithdrawalForm(true); }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                <MobileCardList
                  className="sm:hidden"
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
                      <Button size="sm" variant="outline" onClick={() => { setSelectedWithdrawal(withdrawal); setShowWithdrawalForm(true); }}>
                        <Edit2 className="w-4 h-4 mr-2" />Editar
                      </Button>
                    ),
                  }))}
                  emptyMessage="No hay solicitudes de retiro registradas"
                />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
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
