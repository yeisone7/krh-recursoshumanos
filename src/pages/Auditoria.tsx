import { todayDateOnlyString } from '@/lib/dateOnly';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  FileSpreadsheet,
  Filter,
  History,
  Lock,
  RefreshCw,
  Settings2,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLogs } from '@/hooks/useAuditLog';
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';
import { logExport } from '@/lib/auditService';
import { cn } from '@/lib/utils';

export default function Auditoria() {
  const { currentCompanyId } = useAuth();

  const { data: allData, isLoading: loadingAll } = useAuditLogs(0, 1, {});
  const { data: todayData, isLoading: loadingToday } = useAuditLogs(0, 1, {
    startDate: (() => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      return date;
    })(),
  });
  const { data: criticalData, isLoading: loadingCritical } = useAuditLogs(0, 1, {
    severity: 'critical',
  });
  const { data: deletesData, isLoading: loadingDeletes } = useAuditLogs(0, 1, {
    action: 'delete',
  });

  const handleExport = async () => {
    if (!currentCompanyId) return;
    const { data } = await import('@/integrations/supabase/client').then((module) =>
      module.supabase
        .from('audit_logs')
        .select('created_at, user_email, action, module, entity_type, entity_name, description, severity, ip_address')
        .eq('company_id', currentCompanyId)
        .order('created_at', { ascending: false })
        .limit(1000),
    );
    if (!data) return;

    const XLSX = await import('xlsx');
    const rows = data.map((row: Record<string, unknown>) => ({
      Fecha: new Date(row.created_at as string).toLocaleString('es-CO'),
      Usuario: row.user_email ?? 'Sistema',
      Accion: row.action,
      Modulo: row.module ?? row.entity_type,
      Entidad: row.entity_type,
      'Nombre Entidad': row.entity_name ?? '',
      Descripcion: row.description ?? '',
      Severidad: row.severity ?? 'info',
      IP: row.ip_address ?? '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoria');
    XLSX.writeFile(workbook, `auditoria_${todayDateOnlyString()}.xlsx`);
    logExport(currentCompanyId, 'auditoria', 'excel', 'Exportacion del registro de auditoria');
  };

  const kpis = [
    { title: 'Registro Total', value: allData?.total, icon: Activity, loading: loadingAll, color: 'text-slate-900', bg: 'bg-slate-50' },
    { title: 'Eventos Hoy', value: todayData?.total, icon: TrendingUp, loading: loadingToday, color: 'text-primary', bg: 'bg-primary/5' },
    { title: 'Nivel Critico', value: criticalData?.total, icon: AlertTriangle, loading: loadingCritical, color: 'text-red-500', bg: 'bg-red-50' },
    { title: 'Eliminaciones', value: deletesData?.total, icon: Trash2, loading: loadingDeletes, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 pb-10 sm:space-y-8 sm:px-4 lg:px-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5 md:flex-row md:items-center md:justify-between md:gap-6"
      >
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm sm:h-16 sm:w-16">
            <Lock className="h-6 w-6 stroke-[2.5] sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">Auditoria</h1>
              <Badge className="rounded-lg border-none bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                Trazabilidad
              </Badge>
            </div>
            <p className="max-w-[34rem] text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 sm:tracking-[0.2em]">
              Registro inmutable de eventos del sistema
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-[3.25rem_1fr] gap-3 sm:flex sm:w-auto sm:items-center">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="h-12 w-full rounded-2xl border-slate-100 bg-white transition-all hover:bg-slate-50 sm:h-14 sm:w-14"
            aria-label="Actualizar auditoria"
          >
            <RefreshCw className="h-5 w-5 text-slate-400" />
          </Button>
          <Button
            onClick={handleExport}
            className="group h-12 min-w-0 rounded-2xl bg-primary px-4 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-primary/90 active:scale-95 sm:h-14 sm:px-8 md:flex-none"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 shrink-0 stroke-[3] transition-transform group-hover:scale-110 sm:mr-3" />
            <span className="truncate">Exportar Bitacora</span>
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="flex min-w-0 flex-col items-center space-y-2 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm sm:rounded-3xl sm:p-6"
          >
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl sm:h-12 sm:w-12', kpi.bg, kpi.color)}>
              <kpi.icon className="h-5 w-5 stroke-[2.5] sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black tracking-tighter text-foreground sm:text-2xl">
                {kpi.loading ? '...' : (kpi.value ?? 0).toLocaleString('es-CO')}
              </p>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 sm:text-[9px]">{kpi.title}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="mb-5 flex flex-col gap-4 px-1 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-2">
          <div className="min-w-0 space-y-1">
            <h3 className="flex items-center gap-3 text-lg font-black uppercase tracking-tight text-foreground sm:text-xl">
              <History className="h-5 w-5 shrink-0 text-primary" />
              Flujo de Eventos
            </h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Cronologia detallada de operaciones transaccionales
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 sm:h-10 sm:w-10">
              <Filter className="h-4 w-4" />
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 sm:h-10 sm:w-10">
              <Settings2 className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="min-h-[420px]">
          <AuditLogViewer />
        </div>
      </div>
    </div>
  );
}
