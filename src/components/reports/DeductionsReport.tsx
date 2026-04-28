import { useState } from 'react';
import { Scale } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { exportToExcel, exportToPDF, ReportData } from '@/lib/reportExporter';
import { ReportCard } from './ReportCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  activo: 'Activo', pausado: 'Pausado', finalizado: 'Finalizado', cancelado: 'Cancelado',
};

const TYPE_LABELS: Record<string, string> = {
  judicial: 'Judicial', responsabilidad: 'Responsabilidad',
  cooperativa: 'Cooperativa', sindicato: 'Sindicato', otro: 'Otro',
};

export function DeductionsReport() {
  const { currentCompanyId } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string>('todos');

  const { data: records, isLoading } = useQuery({
    queryKey: ['report-deductions', currentCompanyId, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('employee_deductions')
        .select('*, employees_v2!inner(first_name, last_name, document_number)')
        .eq('company_id', currentCompanyId!)
        .order('created_at', { ascending: false });
      if (typeFilter !== 'todos') query = query.eq('deduction_type', typeFilter as any);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((d: any) => ({
        empleado: `${d.employees_v2.first_name} ${d.employees_v2.last_name}`,
        documento: d.employees_v2.document_number,
        tipo: TYPE_LABELS[d.deduction_type] || d.deduction_type,
        descripcion: d.description,
        monto: d.is_percentage ? `${d.percentage_value}%` : Number(d.amount),
        entidad: d.entity_name || '-',
        referencia: d.reference_number || '-',
        recurrente: d.is_recurring ? 'Sí' : 'No',
        estado: STATUS_LABELS[d.status] || d.status,
        fecha_inicio: d.start_date,
      }));
    },
    enabled: !!currentCompanyId,
  });

  const generateReport = (): ReportData => ({
    title: 'Reporte de Descuentos',
    subtitle: typeFilter !== 'todos' ? `Tipo: ${TYPE_LABELS[typeFilter]}` : 'Todos los tipos',
    generatedAt: new Date(),
    columns: [
      { header: 'Empleado', key: 'empleado', width: 22 },
      { header: 'Documento', key: 'documento', width: 12 },
      { header: 'Tipo', key: 'tipo', width: 12 },
      { header: 'Descripción', key: 'descripcion', width: 18 },
      { header: 'Monto', key: 'monto', width: 10 },
      { header: 'Entidad', key: 'entidad', width: 14 },
      { header: 'Referencia', key: 'referencia', width: 12 },
      { header: 'Recurrente', key: 'recurrente', width: 8 },
      { header: 'Estado', key: 'estado', width: 10 },
    ],
    data: records || [],
  });

  const handleExportExcel = () => {
    try { exportToExcel(generateReport(), 'descuentos'); toast.success('Reporte exportado a Excel'); }
    catch { toast.error('Error al exportar'); }
  };
  const handleExportPDF = () => {
    try { exportToPDF(generateReport(), 'descuentos'); toast.success('Reporte exportado a PDF'); }
    catch { toast.error('Error al exportar'); }
  };

  const activos = records?.filter(r => r.estado === 'Activo').length || 0;

  return (
    <ReportCard
      title="Descuentos"
      description="Control de descuentos judiciales y por responsabilidad"
      icon={<Scale className="w-5 h-5" />}
      recordCount={records?.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    >
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="judicial">Judicial</SelectItem>
            <SelectItem value="responsabilidad">Responsabilidad</SelectItem>
            <SelectItem value="cooperativa">Cooperativa</SelectItem>
            <SelectItem value="sindicato">Sindicato</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 sm:gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Activos</p>
          <p className="text-sm font-semibold">{activos}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total Registros</p>
          <p className="text-sm font-semibold">{records?.length || 0}</p>
        </div>
      </div>
    </ReportCard>
  );
}
