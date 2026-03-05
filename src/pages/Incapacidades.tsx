import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  Search,
  Filter,
  Stethoscope,
  Calendar,
  DollarSign,
  Clock,
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
  incapacityOriginLabels,
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
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedIncapacityId, setSelectedIncapacityId] = useState<string | null>(null);
  
  const { data: incapacities, isLoading } = useIncapacities();
  const { data: stats } = useIncapacityStats();
  const isMobile = useIsMobile();
  
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
    const matchesSearch =
      !searchTerm ||
      inc.employee?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.employee?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.certificate_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOrigin = originFilter === 'all' || inc.origin === originFilter;
    const matchesStatus = statusFilter === 'all' || inc.recovery_status === statusFilter;
    
    return matchesSearch && matchesOrigin && matchesStatus;
  });
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Incapacidades</h1>
          <p className="text-muted-foreground">
            Gestión de incapacidades médicas y recobros
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setShowFormDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Incapacidad
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activas</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalActive || 0}</div>
              <p className="text-xs text-muted-foreground">En curso actualmente</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalThisMonth || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.totalDaysThisMonth || 0} días</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recobros Pendientes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats?.pendingRecovery || 0}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats?.pendingRecoveryAmount || 0)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Origen</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold">{stats?.byOrigin?.comun || 0}</span>
                <span className="text-xs text-muted-foreground">Común</span>
                <span className="text-lg font-bold ml-2">{stats?.byOrigin?.laboral || 0}</span>
                <span className="text-xs text-muted-foreground">Laboral</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duración Promedio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.avgDuration || 0}</div>
              <p className="text-xs text-muted-foreground">días</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Alerts Panel */}
        <div className="lg:col-span-1">
          <IncapacityAlertsPanel 
            onIncapacityClick={handleOpenDetail}
            maxItems={8}
          />
        </div>
        
        {/* Table */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Listado de Incapacidades</CardTitle>
                  <CardDescription>
                    {filteredIncapacities?.length || 0} registro(s)
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-[200px]"
                    />
                  </div>
                  <Select value={originFilter} onValueChange={setOriginFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Origen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="comun">Común</SelectItem>
                      <SelectItem value="laboral">Laboral</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
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
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredIncapacities && filteredIncapacities.length > 0 ? (
                isMobile ? (
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
                      { label: 'Origen', value: inc.origin === 'laboral' ? 'Laboral' : 'Común' },
                      { label: 'Período', value: `${format(new Date(inc.start_date), 'dd/MM')} - ${format(new Date(inc.end_date), 'dd/MM')}` },
                      { label: 'Valor', value: formatCurrency(inc.total_amount) },
                    ],
                    onClick: () => handleOpenDetail(inc.id),
                  }))}
                  emptyMessage="No se encontraron incapacidades"
                />
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
                        className="cursor-pointer hover:bg-muted/50"
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
                            {format(new Date(inc.start_date), 'dd/MM/yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            al {format(new Date(inc.end_date), 'dd/MM/yyyy')}
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
                          <Badge variant={inc.origin === 'laboral' ? 'destructive' : 'secondary'}>
                            {inc.origin === 'laboral' ? 'Laboral' : 'Común'}
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
                    {searchTerm || originFilter !== 'all' || statusFilter !== 'all'
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
