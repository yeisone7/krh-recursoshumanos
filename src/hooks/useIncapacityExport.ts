import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  getCurrentLegalStage,
  getIncapacityOriginLabel,
  incapacityOriginOptions,
  incapacityOriginShortLabels,
  type IncapacityOrigin,
  recoveryStatusLabels,
} from '@/types/incapacity';

export interface ExportFilters {
  startDate: Date;
  endDate: Date;
  origin?: IncapacityOrigin | 'all';
  recoveryStatus?: string;
}

interface IncapacityExportRow {
  'Empleado': string;
  'Documento': string;
  'Origen': string;
  'Fecha Inicio': string;
  'Fecha Fin': string;
  'Etapa Legal': string;
  'Responsable Legal Estimado': string;
  'Días Totales': number;
  'Diagnóstico': string;
  'Código CIE-10': string;
  'Días Empleador': number;
  'Días EPS': number;
  'Días ARL': number;
  'Días AFP': number;
  'Monto Empleador': number;
  'Monto EPS': number;
  'Monto ARL': number;
  'Monto AFP': number;
  'Monto Total': number;
  'Estado Recobro': string;
  'Monto Recuperado': number;
  'Fecha Radicación': string;
  'Número Radicación': string;
  'EPS': string;
  'ARL': string;
  'AFP': string;
  'Es Prórroga': string;
  'Requiere Reintegro': string;
  'Observaciones': string;
}

interface SummaryRow {
  'Período': string;
  'Total Incapacidades': number;
  'Días Perdidos': number;
  'Monto Total': number;
  'Monto Recuperado': number;
  'Pendiente Recuperar': number;
  'Tasa Recuperación (%)': number;
  [key: string]: string | number;
}

export function useIncapacityExport() {
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (filters: ExportFilters) => {
      const { startDate, endDate, origin, recoveryStatus } = filters;

      // Build query
      let query = supabase
        .from('employee_incapacities')
        .select(`
          *,
          employee:employees_v2(first_name, last_name, document_number)
        `)
        .eq('company_id', currentCompanyId!)
        .gte('start_date', format(startDate, 'yyyy-MM-dd'))
        .lte('start_date', format(endDate, 'yyyy-MM-dd'))
        .order('start_date', { ascending: true });

      if (origin && origin !== 'all') {
        query = query.eq('origin', origin);
      }

      if (recoveryStatus && recoveryStatus !== 'all') {
        query = query.eq('recovery_status', recoveryStatus as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No se encontraron incapacidades en el período seleccionado');
      }

      // Transform data for Excel
      const excelData: IncapacityExportRow[] = data.map((inc: any) => {
        const statusKey = inc.recovery_status as keyof typeof recoveryStatusLabels;
        const legalStage = getCurrentLegalStage(inc.origin, inc.total_days || 0);
        
        return {
          'Empleado': `${inc.employee?.first_name || ''} ${inc.employee?.last_name || ''}`,
          'Documento': inc.employee?.document_number || '',
          'Origen': getIncapacityOriginLabel(inc.origin),
          'Fecha Inicio': formatDateOnly(inc.start_date, 'dd/MM/yyyy'),
          'Fecha Fin': formatDateOnly(inc.end_date, 'dd/MM/yyyy'),
          'Etapa Legal': legalStage.label,
          'Responsable Legal Estimado': legalStage.responsible,
          'Días Totales': inc.total_days || 0,
          'Diagnóstico': inc.diagnosis || '',
          'Código CIE-10': inc.cie10_code || '',
          'Días Empleador': inc.employer_days || 0,
          'Días EPS': inc.eps_days || 0,
          'Días ARL': inc.arl_days || 0,
          'Días AFP': inc.afp_days || 0,
          'Monto Empleador': inc.employer_amount || 0,
          'Monto EPS': inc.eps_amount || 0,
          'Monto ARL': inc.arl_amount || 0,
          'Monto AFP': inc.afp_amount || 0,
          'Monto Total': inc.total_amount || 0,
          'Estado Recobro': recoveryStatusLabels[statusKey] || inc.recovery_status,
          'Monto Recuperado': inc.recovered_amount || 0,
          'Fecha Radicación': inc.filing_date ? formatDateOnly(inc.filing_date, 'dd/MM/yyyy') : '',
          'Número Radicación': inc.filing_number || '',
          'EPS': inc.eps_name || '',
          'ARL': inc.arl_name || '',
          'AFP': inc.afp_name || '',
          'Es Prórroga': inc.is_extension ? 'Sí' : 'No',
          'Requiere Reintegro': inc.requires_reintegration_exam ? 'Sí' : 'No',
          'Observaciones': inc.observations || '',
        };
      });

      // Generate monthly summary
      const emptyOrigins = () => incapacityOriginOptions.reduce(
        (acc, option) => {
          acc[option.value] = 0;
          return acc;
        },
        {} as Record<IncapacityOrigin, number>
      );

      const monthlyData: Record<string, { 
        count: number; 
        days: number; 
        origins: Record<IncapacityOrigin, number>;
        total: number; 
        recovered: number 
      }> = {};

      data.forEach((inc: any) => {
        const monthKey = formatDateOnly(inc.start_date, 'yyyy-MM');
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { count: 0, days: 0, origins: emptyOrigins(), total: 0, recovered: 0 };
        }
        monthlyData[monthKey].count++;
        monthlyData[monthKey].days += inc.total_days || 0;
        if (inc.origin in monthlyData[monthKey].origins) {
          monthlyData[monthKey].origins[inc.origin as IncapacityOrigin]++;
        }
        monthlyData[monthKey].total += inc.total_amount || 0;
        monthlyData[monthKey].recovered += inc.recovered_amount || 0;
      });

      const summaryData: SummaryRow[] = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, stats]) => {
          const row: SummaryRow = {
            'Período': format(new Date(month + '-01'), 'MMMM yyyy', { locale: es }),
            'Total Incapacidades': stats.count,
            'Días Perdidos': stats.days,
            'Monto Total': stats.total,
            'Monto Recuperado': stats.recovered,
            'Pendiente Recuperar': stats.total - stats.recovered,
            'Tasa Recuperación (%)': stats.total > 0 ? Math.round((stats.recovered / stats.total) * 100) : 0,
          };

          for (const option of incapacityOriginOptions) {
            row[`Origen ${option.shortLabel}`] = stats.origins[option.value];
          }

          return row;
        });

      // Add totals row
      const totals = summaryData.reduce(
        (acc, row) => ({
          count: acc.count + row['Total Incapacidades'],
          days: acc.days + row['Días Perdidos'],
          origins: incapacityOriginOptions.reduce(
            (originAcc, option) => {
              originAcc[option.value] = acc.origins[option.value] + Number(row[`Origen ${option.shortLabel}`] || 0);
              return originAcc;
            },
            {} as Record<IncapacityOrigin, number>
          ),
          total: acc.total + row['Monto Total'],
          recovered: acc.recovered + row['Monto Recuperado'],
        }),
        { count: 0, days: 0, origins: emptyOrigins(), total: 0, recovered: 0 }
      );

      const totalRow: SummaryRow = {
        'Período': 'TOTAL',
        'Total Incapacidades': totals.count,
        'Días Perdidos': totals.days,
        'Monto Total': totals.total,
        'Monto Recuperado': totals.recovered,
        'Pendiente Recuperar': totals.total - totals.recovered,
        'Tasa Recuperación (%)': totals.total > 0 ? Math.round((totals.recovered / totals.total) * 100) : 0,
      };

      for (const option of incapacityOriginOptions) {
        totalRow[`Origen ${option.shortLabel}`] = totals.origins[option.value];
      }

      summaryData.push(totalRow);

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();
      
      // Detail sheet
      const wsDetail = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      wsDetail['!cols'] = [
        { wch: 25 }, // Empleado
        { wch: 15 }, // Documento
        { wch: 20 }, // Origen
        { wch: 12 }, // Fecha Inicio
        { wch: 12 }, // Fecha Fin
        { wch: 20 }, // Etapa Legal
        { wch: 24 }, // Responsable Legal Estimado
        { wch: 12 }, // Días Totales
        { wch: 40 }, // Diagnóstico
        { wch: 12 }, // CIE-10
        { wch: 12 }, // Días Empleador
        { wch: 10 }, // Días EPS
        { wch: 10 }, // Días ARL
        { wch: 10 }, // Días AFP
        { wch: 15 }, // Monto Empleador
        { wch: 15 }, // Monto EPS
        { wch: 15 }, // Monto ARL
        { wch: 15 }, // Monto AFP
        { wch: 15 }, // Monto Total
        { wch: 20 }, // Estado Recobro
        { wch: 15 }, // Monto Recuperado
        { wch: 15 }, // Fecha Radicación
        { wch: 18 }, // Número Radicación
        { wch: 20 }, // EPS
        { wch: 20 }, // ARL
        { wch: 20 }, // AFP
        { wch: 12 }, // Es Prórroga
        { wch: 15 }, // Requiere Reintegro
        { wch: 40 }, // Observaciones
      ];
      
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle Incapacidades');
      
      // Summary sheet
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary['!cols'] = [
        { wch: 20 }, // Período
        { wch: 18 }, // Total Incapacidades
        { wch: 15 }, // Días Perdidos
        ...incapacityOriginOptions.map((option) => ({ wch: Math.max(15, incapacityOriginShortLabels[option.value].length + 9) })),
        { wch: 15 }, // Monto Total
        { wch: 18 }, // Monto Recuperado
        { wch: 18 }, // Pendiente Recuperar
        { wch: 18 }, // Tasa Recuperación
      ];
      
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Mensual');

      // Generate file
      const dateRange = `${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}`;
      const fileName = `Incapacidades_${dateRange}.xlsx`;
      
      XLSX.writeFile(wb, fileName);
      
      return { success: true, fileName, recordCount: data.length };
    },
    onSuccess: (result) => {
      toast.success(`Reporte exportado exitosamente`, {
        description: `${result.recordCount} registros en ${result.fileName}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Error al exportar', {
        description: error.message,
      });
    },
  });
}
