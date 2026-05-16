/**
 * Auditoria.tsx  (Página principal refactorizada)
 * ---------------------------------------------------------------
 * Panel empresarial de Auditoría y Trazabilidad:
 *   - KPI cards (total, hoy, críticos, eliminaciones)
 *   - Tabs: Registro principal / Actividad crítica / Por módulo
 *   - AuditLogViewer integrado con todos los filtros
 *   - Exportación de logs a Excel
 * ---------------------------------------------------------------
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  History, Shield, AlertTriangle, Trash2,
  Activity, Download, TrendingUp, Users2,
  FileSpreadsheet, Search, RefreshCw, Filter, Settings2, Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

import { useAuth } from '@/contexts/AuthContext';
import { useAuditLogs } from '@/hooks/useAuditLog';
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';
import { logExport } from '@/lib/auditService';
import { cn } from '@/lib/utils';

// ─── Página principal ─────────────────────────────────────────

export default function Auditoria() {
  const { currentCompanyId } = useAuth();
  const [activeTab, setActiveTab] = useState('all');

  // Stats globales
  const { data: allData, isLoading: loadingAll } = useAuditLogs(0, 1, {});
  const { data: todayData, isLoading: loadingToday } = useAuditLogs(0, 1, {
    startDate: (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })(),
  });
  const { data: criticalData, isLoading: loadingCritical } = useAuditLogs(0, 1, {
    severity: 'critical',
  });
  const { data: deletesData, isLoading: loadingDeletes } = useAuditLogs(0, 1, {
    action: 'delete',
  });

  const handleExport = async () => {
    if (!currentCompanyId) return;
    const { data } = await import('@/integrations/supabase/client').then(m =>
      m.supabase.from('audit_logs')
        .select('created_at, user_email, action, module, entity_type, entity_name, description, severity, ip_address')
        .eq('company_id', currentCompanyId)
        .order('created_at', { ascending: false })
        .limit(1000)
    );
    if (!data) return;
    const XLSX = await import('xlsx');
    const rows = data.map((r: Record<string, unknown>) => ({
      'Fecha': new Date(r.created_at as string).toLocaleString('es-CO'),
      'Usuario': r.user_email ?? 'Sistema',
      'Acción': r.action,
      'Módulo': r.module ?? r.entity_type,
      'Entidad': r.entity_type,
      'Nombre Entidad': r.entity_name ?? '',
      'Descripción': r.description ?? '',
      'Severidad': r.severity ?? 'info',
      'IP': r.ip_address ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoría');
    XLSX.writeFile(wb, `auditoria_${new Date().toISOString().slice(0,10)}.xlsx`);
    logExport(currentCompanyId, 'auditoria', 'excel', 'Exportación del registro de auditoría');
  };

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto px-2">

      {/* Header Premium Flat */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
           <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
             <Lock className="w-8 h-8 stroke-[2.5]" />
           </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
               <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">Auditoría</h1>
              <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">TRAZABILIDAD</Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Registro inmutable de eventos del sistema</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="h-14 w-14 rounded-2xl border-slate-100 bg-white hover:bg-slate-50 transition-all shrink-0"
          >
            <RefreshCw className="w-5 h-5 text-slate-400" />
          </Button>
          <Button
            onClick={handleExport}
            className="h-14 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] shadow-sm transition-all active:scale-95 group flex-1 md:flex-none"
          >
            <FileSpreadsheet className="w-4 h-4 mr-3 stroke-[3] group-hover:scale-110 transition-transform" />
            EXPORTAR BITÁCORA
          </Button>
        </div>
      </motion.div>

      {/* KPI Grid Flat Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-1">
        {[
          { title: 'Registro Total', value: allData?.total, icon: Activity, loading: loadingAll, color: 'text-slate-900', bg: 'bg-slate-50' },
          { title: 'Eventos Hoy', value: todayData?.total, icon: TrendingUp, loading: loadingToday, color: 'text-primary', bg: 'bg-primary/5' },
          { title: 'Nivel Crítico', value: criticalData?.total, icon: AlertTriangle, loading: loadingCritical, color: 'text-red-500', bg: 'bg-red-50' },
          { title: 'Eliminaciones', value: deletesData?.total, icon: Trash2, loading: loadingDeletes, color: 'text-amber-500', bg: 'bg-amber-50' },
        ].map((kpi, idx) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="p-6 rounded-3xl bg-white border border-slate-100 flex flex-col items-center text-center space-y-2 shadow-sm"
          >
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", kpi.bg, kpi.color)}>
              <kpi.icon className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground tracking-tighter">
                {kpi.loading ? '...' : (kpi.value ?? 0).toLocaleString('es-CO')}
              </p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.title}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="px-1">
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden p-2 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 px-2">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                <History className="w-5 h-5 text-primary" />
                Flujo de Eventos
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cronología detallada de operaciones transaccionales</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Filter className="w-4 h-4" />
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Settings2 className="w-4 h-4" />
              </div>
            </div>
          </div>
          
          <div className="min-h-[500px]">
            <AuditLogViewer />
          </div>
        </div>
      </div>
    </div>
  );
}
