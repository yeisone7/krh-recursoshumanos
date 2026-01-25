import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Download, Search, Clock, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  OvertimeFormDialog,
  OvertimeDetailDialog,
  OvertimeExportDialog,
} from '@/components/overtime';
import { 
  useOvertimeRecords, 
  useOvertimeSummary, 
  usePendingOvertimeCount 
} from '@/hooks/useOvertime';
import { 
  OvertimeRecord, 
  OVERTIME_TYPE_LABELS, 
  OVERTIME_STATUS_LABELS,
  OvertimeStatus 
} from '@/types/overtime';

export default function HorasExtra() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: records = [], isLoading } = useOvertimeRecords();
  const { data: summary } = useOvertimeSummary();
  const { data: pendingCount = 0 } = usePendingOvertimeCount();

  // Filter records
  const filteredRecords = records.filter(record => {
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const employeeName = record.employees_v2
      ? `${record.employees_v2.first_name} ${record.employees_v2.last_name}`.toLowerCase()
      : '';
    const matchesSearch = !searchTerm || 
      employeeName.includes(searchTerm.toLowerCase()) ||
      OVERTIME_TYPE_LABELS[record.overtime_type].toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleViewRecord = (record: OvertimeRecord) => {
    setSelectedRecord(record);
    setShowDetailDialog(true);
  };

  const getStatusBadgeVariant = (status: OvertimeStatus) => {
    switch (status) {
      case 'aprobado':
        return 'default';
      case 'rechazado':
        return 'destructive';
      case 'pagado':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Horas Extra</h1>
          <p className="text-muted-foreground">
            Registro y gestión de horas extra según ley colombiana
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Nómina
          </Button>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Hora Extra
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Registros</p>
                <p className="text-2xl font-bold">{summary?.totalRecords || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Horas</p>
                <p className="text-2xl font-bold">{summary?.totalHours?.toFixed(1) || 0}h</p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">
                  {summary?.totalValue ? formatCurrency(summary.totalValue) : '$0'}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Surcharges Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Recargos según Ley Colombiana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="text-xs">Extra Diurna: 25%</Badge>
            <Badge variant="outline" className="text-xs">Extra Nocturna: 75%</Badge>
            <Badge variant="outline" className="text-xs">Recargo Nocturno: 35%</Badge>
            <Badge variant="outline" className="text-xs">Dominical Diurna: 75%</Badge>
            <Badge variant="outline" className="text-xs">Dominical Nocturna: 110%</Badge>
            <Badge variant="outline" className="text-xs">Festivo: 75%-110%</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empleado o tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="aprobado">Aprobado</SelectItem>
            <SelectItem value="rechazado">Rechazado</SelectItem>
            <SelectItem value="pagado">Pagado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Records Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Recargo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Cargando registros...
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No se encontraron registros de horas extra
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow 
                    key={record.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewRecord(record)}
                  >
                    <TableCell className="font-medium">
                      {record.employees_v2
                        ? `${record.employees_v2.first_name} ${record.employees_v2.last_name}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.work_date), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.start_time.slice(0, 5)} - {record.end_time.slice(0, 5)}
                    </TableCell>
                    <TableCell className="font-semibold">{record.total_hours}h</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {OVERTIME_TYPE_LABELS[record.overtime_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-primary font-semibold">
                      {record.surcharge_percentage}%
                    </TableCell>
                    <TableCell>
                      {record.total_value ? formatCurrency(record.total_value) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(record.status)}>
                        {OVERTIME_STATUS_LABELS[record.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <OvertimeFormDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
      />

      <OvertimeDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        record={selectedRecord}
      />

      <OvertimeExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
    </div>
  );
}
