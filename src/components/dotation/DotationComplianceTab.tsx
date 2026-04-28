import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ChevronDown, ChevronRight, Users, CheckCircle, AlertTriangle, XCircle, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useDotationCompliance, type CenterCompliance, type EmployeeCompliance } from '@/hooks/useDotationCompliance';
import { exportComplianceToExcel, exportComplianceToPDF } from '@/lib/complianceReportExporter';

export function DotationComplianceTab() {
  const { data: compliance, isLoading } = useDotationCompliance();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!compliance || compliance.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground card-elevated">
        <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hay datos de cumplimiento disponibles</p>
        <p className="text-xs mt-1">Configura profesiogramas y registra entregas para ver el cumplimiento</p>
      </div>
    );
  }

  // Global stats
  const totalEmployees = compliance.reduce((s, c) => s + c.totalEmployees, 0);
  const totalCompliant = compliance.reduce((s, c) => s + c.fullyCompliant, 0);
  const totalPartial = compliance.reduce((s, c) => s + c.partiallyCompliant, 0);
  const totalNon = compliance.reduce((s, c) => s + c.nonCompliant, 0);
  const globalPercentage = totalEmployees > 0 ? Math.round((totalCompliant / totalEmployees) * 100) : 0;

  const handleExportExcel = () => {
    if (!compliance || compliance.length === 0) return;
    exportComplianceToExcel(compliance);
    toast.success('Reporte Excel exportado');
  };

  const handleExportPDF = async () => {
    if (!compliance || compliance.length === 0) return;
    try {
      await exportComplianceToPDF(compliance);
      toast.success('Reporte PDF exportado');
    } catch (e) {
      toast.error('Error al generar el PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Cumplimiento de Dotación</h2>
          <p className="text-sm text-muted-foreground">
            Porcentaje de empleados con artículos obligatorios entregados
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="w-4 h-4" /> Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportExcel} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Exportar a Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
              <FileText className="w-4 h-4" /> Exportar a PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Global KPIs */}
      <div className="hidden gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Users} label="Empleados evaluados" value={totalEmployees} color="primary" />
        <KpiCard icon={CheckCircle} label="100% cumplimiento" value={totalCompliant} color="success" />
        <KpiCard icon={AlertTriangle} label="Cumplimiento parcial" value={totalPartial} color="warning" />
        <KpiCard icon={XCircle} label="Sin dotación" value={totalNon} color="destructive" />
      </div>

      {/* Global progress */}
      <div className="card-elevated hidden p-4 sm:block">
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="text-sm font-medium">Cumplimiento global de dotación obligatoria</span>
          <span className="text-sm font-bold">{globalPercentage}%</span>
        </div>
        <Progress value={globalPercentage} className="h-3" />
      </div>

      {/* Per-center detail */}
      <div className="space-y-3">
        {compliance.map((center, idx) => (
          <CenterCard key={center.centerId} center={center} index={idx} />
        ))}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated p-4 flex items-center gap-3"
    >
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', `bg-${color}-light`)}>
        <Icon className={cn('w-5 h-5', `text-${color}`)} />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
}

function CenterCard({ center, index }: { center: CenterCompliance; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card-elevated"
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full p-4 flex flex-col items-stretch gap-3 hover:bg-muted/30 transition-colors rounded-t-xl sm:flex-row sm:items-center sm:gap-4">
          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}

          <div className="flex-1 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-foreground">{center.centerName}</h3>
              <Badge variant="outline" className="text-xs">{center.totalEmployees} empleados</Badge>
            </div>
            <div className="flex flex-col gap-1 mt-2 sm:flex-row sm:items-center sm:gap-2">
              <Progress value={center.percentage} className="h-2 flex-1 max-w-xs" />
              <span className="text-xs font-medium text-muted-foreground">
                {center.fullyCompliant}/{center.totalEmployees} al 100%
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {center.nonCompliant > 0 && (
              <Badge variant="destructive" className="text-xs">{center.nonCompliant} sin dotación</Badge>
            )}
            {center.partiallyCompliant > 0 && (
              <Badge className="text-xs bg-warning/10 text-warning-foreground border-warning/20">{center.partiallyCompliant} parcial</Badge>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border overflow-x-auto overscroll-x-contain">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Cumplimiento</TableHead>
                  <TableHead>Artículos faltantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {center.employees.map(emp => (
                  <EmployeeRow key={emp.employeeId} employee={emp} />
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

function EmployeeRow({ employee }: { employee: EmployeeCompliance }) {
  const missingItems = employee.items.filter(i => i.isMissing);
  const statusColor = employee.percentage === 100
    ? 'text-success'
    : employee.percentage > 0
      ? 'text-warning'
      : 'text-destructive';

  return (
    <TableRow>
      <TableCell className="font-medium">{employee.employeeName}</TableCell>
      <TableCell className="text-muted-foreground">{employee.positionName}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress value={employee.percentage} className="h-2 w-20" />
          <span className={cn('text-xs font-semibold', statusColor)}>
            {employee.percentage}%
          </span>
        </div>
      </TableCell>
      <TableCell>
        {missingItems.length === 0 ? (
          <Badge variant="outline" className="text-xs bg-success-light text-success">Completo</Badge>
        ) : (
          <div className="flex flex-wrap gap-1">
            {missingItems.map((item, i) => (
              <Badge key={i} variant="destructive" className="text-xs">
                {item.itemName}
              </Badge>
            ))}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
