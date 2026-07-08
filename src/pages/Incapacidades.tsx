import { useState, useEffect, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { CollapsibleFilters } from '@/components/shared/CollapsibleFilters';
import { formatDateOnly, parseDateOnly } from '@/lib/dateOnly';
import {
  Plus,
  Search,
  Stethoscope,
  Calendar,
  TrendingUp,
  Users,
  AlertTriangle,
  Download,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { useIncapacities, useIncapacityStats } from '@/hooks/useIncapacities';
import { 
  IncapacityFormDialog, 
  IncapacityDetailDialog,
  IncapacityAlertsPanel,
  IncapacityExportDialog,
} from '@/components/incapacities';
import {
  getIncapacityOriginShortLabel,
  incapacityOriginOptions,
  isWorkRelatedIncapacityOrigin,
  recoveryStatusLabels,
  recoveryStatusColors,
  getTotalChainDays,
} from '@/types/incapacity';
import { MobileCardList } from '@/components/shared/MobileCardList';

export default function Incapacidades() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedIncapacityId, setSelectedIncapacityId] = useState<string | null>(null);
  
  const { data: incapacities, isLoading } = useIncapacities();
  const { data: stats } = useIncapacityStats();
  const isMobile = useIsMobile();

  const originKpiStyles = [
    { bg: 'from-emerald-500/5', iconBg: 'bg-emerald-500/10', text: 'text-emerald-600' },
    { bg: 'from-red-500/5', iconBg: 'bg-red-500/10', text: 'text-red-600' },
    { bg: 'from-amber-500/5', iconBg: 'bg-amber-500/10', text: 'text-amber-600' },
    { bg: 'from-fuchsia-500/5', iconBg: 'bg-fuchsia-500/10', text: 'text-fuchsia-600' },
    { bg: 'from-cyan-500/5', iconBg: 'bg-cyan-500/10', text: 'text-cyan-600' },
  ];

  const monthOptions = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  const yearOptions = useMemo(() => {
    const years = new Set<number>();

    for (const inc of incapacities || []) {
      const startDate = parseDateOnly(inc.start_date);
      if (startDate) years.add(startDate.getFullYear());
    }

    return Array.from(years)
      .sort((a, b) => b - a)
      .map((year) => year.toString());
  }, [incapacities]);
  
  // Handle deep linking from dashboard
  useEffect(() => {
    const incapacityId = searchParams.get('incapacidad');
    if (incapacityId) {
      setSelectedIncapacityId(incapacityId);
      // Clear the param after opening
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);
  
  const handleOpenDetail = (id: string) => {
    setSelectedIncapacityId(id);
  };
  
  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP', 
      maximumFractionDigits: 0 
    }).format(amount);
  };
  
  // Filter incapacities
  const filteredIncapacities = incapacities?.filter((inc) => {
    const startDate = parseDateOnly(inc.start_date);
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearchTerm ||
      inc.employee?.first_name?.toLowerCase().includes(normalizedSearchTerm) ||
      inc.employee?.last_name?.toLowerCase().includes(normalizedSearchTerm) ||
      inc.employee?.document_number?.toLowerCase().includes(normalizedSearchTerm) ||
      inc.diagnosis.toLowerCase().includes(normalizedSearchTerm) ||
      inc.certificate_number?.toLowerCase().includes(normalizedSearchTerm);
    
    const matchesOrigin = originFilter === 'all' || inc.origin === originFilter;
    const matchesStatus = statusFilter === 'all' || inc.recovery_status === statusFilter;
    const matchesMonth = monthFilter === 'all' || (startDate && startDate.getMonth() + 1 === Number(monthFilter));
    const matchesYear = yearFilter === 'all' || (startDate && startDate.getFullYear().toString() === yearFilter);
    
    return matchesSearch && matchesOrigin && matchesStatus && matchesMonth && matchesYear;
  });

  const activeFilterCount =
    (originFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (monthFilter !== 'all' ? 1 : 0) +
    (yearFilter !== 'all' ? 1 : 0);
  
  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 rounded-[2rem] border border-border p-8 sm:p-10 shadow-sm">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-[1.25rem] bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
              <Stethoscope className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  SALUD
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground mb-1">
                Incapacidades
              </h1>
              <p className="text-sm font-medium text-muted-foreground max-w-xl">
                Gestión de incapacidades médicas y recobros
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
            <Button variant="outline" onClick={() => setShowExportDialog(true)} className="h-14 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs border-primary/20 hover:w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button 
              onClick={() => setShowFormDialog(true)}
              size="lg"
              className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all shrink-0 w-full sm:w-auto"
            >
              <Plus className="w-5 h-5 mr-2" />
              <span className="sm:hidden">Nueva</span>
              <span className="hidden sm:inline">Nueva Incapacidad</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* KPIs Premium */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        <Card className="rounded-[1.5rem] border-none shadow-sm bg-background relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-5 relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Activas</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black tracking-tight">{stats?.totalActive || 0}</h3>
                <p className="text-xs text-muted-foreground font-medium">En curso</p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-[1rem] bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-none shadow-sm bg-background relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-5 relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Este Mes</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black tracking-tight text-blue-600">{stats?.totalThisMonth || 0}</h3>
                <p className="text-xs text-muted-foreground font-medium">{stats?.totalDaysThisMonth || 0} días</p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-[1rem] bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-none shadow-sm bg-background relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-5 relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Recobros Pendientes</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black tracking-tight text-warning">{stats?.pendingRecovery || 0}</h3>
                <p className="text-xs text-muted-foreground font-medium truncate max-w-[80px]">
                  {formatCurrency(stats?.pendingRecoveryAmount || 0)}
                </p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-[1rem] bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-none shadow-sm bg-background relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-5 relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Duración Promedio</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black tracking-tight text-emerald-600">{stats?.avgDuration || 0}</h3>
                <p className="text-xs text-muted-foreground font-medium">días</p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-[1rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {incapacityOriginOptions.map((option, index) => {
          const style = originKpiStyles[index % originKpiStyles.length];

          return (
            <Card key={option.value} className="rounded-[1.5rem] border-none shadow-sm bg-background relative overflow-hidden group">
              <div className={`absolute inset-0 bg-gradient-to-br ${style.bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              <CardContent className="p-5 relative z-10 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{option.kpiLabel}</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className={`text-3xl font-black tracking-tight ${style.text}`}>{stats?.byOrigin?.[option.value] || 0}</h3>
                    <p className="text-xs text-muted-foreground font-medium">casos</p>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-[1rem] ${style.iconBg} ${style.text} flex items-center justify-center shrink-0`}>
                  <Stethoscope className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Main Content */}
      <div className="grid gap-6 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,3fr)]">
        {/* Alerts Panel */}
        <div className="min-w-0">
          <IncapacityAlertsPanel 
            onIncapacityClick={handleOpenDetail}
            maxItems={8}
          />
        </div>
        
        {/* Table */}
        <div className="min-w-0">
          <Card className="rounded-[2rem] border-none shadow-sm bg-background">
            <CardHeader className="p-6 border-b border-border/50">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-xl font-bold">Listado de Incapacidades</CardTitle>
                  <CardDescription className="font-medium">
                    {filteredIncapacities?.length || 0} registro(s) encontrados
                  </CardDescription>
                </div>
                <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto xl:items-center">
                  <div className="relative w-full sm:flex-1 xl:w-64 xl:flex-none">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, documento, diagnóstico o certificado..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-full"
                    />
                  </div>
                  <CollapsibleFilters
                    activeCount={activeFilterCount}
                  >
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <Select value={originFilter} onValueChange={setOriginFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Origen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {incapacityOriginOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.shortLabel}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={monthFilter} onValueChange={setMonthFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Mes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los meses</SelectItem>
                          {monthOptions.map((month) => (
                            <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={yearFilter} onValueChange={setYearFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los años</SelectItem>
                          {yearOptions.map((year) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Estado Recobro" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {Object.entries(recoveryStatusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CollapsibleFilters>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredIncapacities && filteredIncapacities.length > 0 ? (
                isMobile ? (
                <PullToRefresh onRefresh={async () => { await new Promise(r => setTimeout(r, 800)); }}>
                  <MobileCardList
                    items={filteredIncapacities.map((inc) => ({
                      id: inc.id,
                      title: `${inc.employee?.first_name} ${inc.employee?.last_name}`,
                      subtitle: inc.employee?.document_number,
                      badge: (
                        <Badge className={recoveryStatusColors[inc.recovery_status]}>
                          {recoveryStatusLabels[inc.recovery_status]}
                        </Badge>
                      ),
                      fields: [
                        { label: 'Días', value: `${inc.total_days} días` },
                        { label: 'Origen', value: getIncapacityOriginShortLabel(inc.origin) },
                        { label: 'Período', value: `${formatDateOnly(inc.start_date, 'dd/MM')} - ${formatDateOnly(inc.end_date, 'dd/MM')}` },
                        { label: 'Valor', value: formatCurrency(inc.total_amount) },
                      ],
                      onClick: () => handleOpenDetail(inc.id),
                    }))}
                    emptyMessage="No se encontraron incapacidades"
                  />
                </PullToRefresh>
                ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead className="hidden sm:table-cell">Período</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead className="hidden md:table-cell">Diagnóstico</TableHead>
                      <TableHead className="hidden lg:table-cell">Valor</TableHead>
                      <TableHead>Recobro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncapacities.map((inc) => (
                      <TableRow
                        key={inc.id}
                        className="cursor-pointer hover:bg-background"
                        onClick={() => handleOpenDetail(inc.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {inc.employee?.first_name} {inc.employee?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {inc.employee?.document_number}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <p className="text-sm">
                            {formatDateOnly(inc.start_date, 'dd/MM/yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            al {formatDateOnly(inc.end_date, 'dd/MM/yyyy')}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{inc.total_days}</span>
                            {inc.extensions && inc.extensions.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                ({getTotalChainDays(inc)} total)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isWorkRelatedIncapacityOrigin(inc.origin) ? 'destructive' : 'secondary'}>
                            {getIncapacityOriginShortLabel(inc.origin)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <p className="text-sm line-clamp-1 max-w-[200px]">
                            {inc.diagnosis}
                          </p>
                          {inc.cie10_code && (
                            <p className="text-xs text-muted-foreground">{inc.cie10_code}</p>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <p className="font-medium">{formatCurrency(inc.total_amount)}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={recoveryStatusColors[inc.recovery_status]}>
                            {recoveryStatusLabels[inc.recovery_status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                )
              ) : (
                <div className="text-center py-12">
                  <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No hay incapacidades</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || activeFilterCount > 0
                      ? 'No se encontraron resultados con los filtros aplicados'
                      : 'Comienza registrando la primera incapacidad'}
                  </p>
                  <Button onClick={() => setShowFormDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Incapacidad
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Dialogs */}
      <IncapacityFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
      />
      
      <IncapacityDetailDialog
        open={!!selectedIncapacityId}
        onOpenChange={(open) => !open && setSelectedIncapacityId(null)}
        incapacityId={selectedIncapacityId}
      />

      <IncapacityExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
    </div>
  );
}
