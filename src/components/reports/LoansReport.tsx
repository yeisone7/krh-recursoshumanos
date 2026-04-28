import { useState } from 'react';
import { Landmark } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { exportToExcel, exportToPDF, ReportData } from '@/lib/reportExporter';
import { ReportCard } from './ReportCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  solicitado: 'Solicitado', aprobado: 'Aprobado', activo: 'Activo',
  pagado: 'Pagado', rechazado: 'Rechazado', cancelado: 'Cancelado',
};

const TYPE_LABELS: Record<string, string> = {
  personal: 'Personal', vivienda: 'Vivienda', educacion: 'Educación',
  calamidad: 'Calamidad', libranza: 'Libranza', anticipo: 'Anticipo', otro: 'Otro',
};

export function LoansReport() {
  const { currentCompanyId } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const { data: records, isLoading } = useQuery({
    queryKey: ['report-loans', currentCompanyId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('employee_loans')
        .select('*, employees_v2!inner(first_name, last_name, document_number)')
        .eq('company_id', currentCompanyId!)
        .order('created_at', { ascending: false });
      if (statusFilter !== 'todos') query = query.eq('status', statusFilter as any);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((l: any) => ({
        empleado: `${l.employees_v2.first_name} ${l.employees_v2.last_name}`,
        documento: l.employees_v2.document_number,
        tipo: TYPE_LABELS[l.loan_type] || l.loan_type,
        monto_total: Number(l.total_amount),
        tasa_interes: `${l.interest_rate}%`,
        total_con_interes: Number(l.total_with_interest),
        cuotas: l.installments,
        cuotas_pagadas: l.paid_installments,
        valor_cuota: Number(l.installment_amount),
        saldo: Number(l.remaining_balance),
        estado: STATUS_LABELS[l.status] || l.status,
        fecha_inicio: l.start_date,
      }));
    },
    enabled: !!currentCompanyId,
  });

  const generateReport = (): ReportData => ({
    title: 'Reporte de Préstamos',
    subtitle: statusFilter !== 'todos' ? `Estado: ${STATUS_LABELS[statusFilter]}` : 'Todos los estados',
    generatedAt: new Date(),
    columns: [
      { header: 'Empleado', key: 'empleado', width: 22 },
      { header: 'Documento', key: 'documento', width: 12 },
      { header: 'Tipo', key: 'tipo', width: 12 },
      { header: 'Monto', key: 'monto_total', width: 12 },
      { header: 'Interés', key: 'tasa_interes', width: 8 },
      { header: 'Total c/Int', key: 'total_con_interes', width: 12 },
      { header: 'Cuotas', key: 'cuotas', width: 8 },
      { header: 'Pagadas', key: 'cuotas_pagadas', width: 8 },
      { header: 'Vlr Cuota', key: 'valor_cuota', width: 10 },
      { header: 'Saldo', key: 'saldo', width: 12 },
      { header: 'Estado', key: 'estado', width: 10 },
    ],
    data: records || [],
  });

  const handleExportExcel = () => {
    try { exportToExcel(generateReport(), 'prestamos'); toast.success('Reporte exportado a Excel'); }
    catch { toast.error('Error al exportar'); }
  };
  const handleExportPDF = () => {
    try { exportToPDF(generateReport(), 'prestamos'); toast.success('Reporte exportado a PDF'); }
    catch { toast.error('Error al exportar'); }
  };

  const totalSaldo = records?.reduce((s, r) => s + r.saldo, 0) || 0;
  const activos = records?.filter(r => r.estado === 'Activo').length || 0;

  return (
    <ReportCard
      title="Préstamos"
      description="Control de préstamos, cuotas y saldos"
      icon={<Landmark className="w-5 h-5" />}
      recordCount={records?.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    >
      <div className="space-y-2">
        <Label>Estado</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="solicitado">Solicitado</SelectItem>
            <SelectItem value="pagado">Pagado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 sm:gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Activos</p>
          <p className="text-sm font-semibold">{activos}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Saldo Total</p>
          <p className="text-sm font-semibold">${totalSaldo.toLocaleString('es-CO')}</p>
        </div>
      </div>
    </ReportCard>
  );
}
