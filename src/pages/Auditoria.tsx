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
import {
  History, Shield, AlertTriangle, Trash2,
  Activity, Download, TrendingUp, Users2,
  FileSpreadsheet,
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

// ─── KPI Card ─────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  loading?: boolean;
  colorClass?: string;
  badge?: string;
}

function KpiCard({ title, value, icon: Icon, loading, colorClass = 'text-primary', badge }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </CardTitle>
          <div className={`p-2 rounded-lg bg-current/10 ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold tabular-nums">
              {(value ?? 0).toLocaleString('es-CO')}
            </span>
            {badge && (
              <Badge variant="secondary" className="mb-0.5 text-[10px]">{badge}</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
    <div className="space-y-8 pb-12 max-w-7xl mx-auto px-4 sm:px-6">

      {/* Header Premium */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative p-8 rounded-[2.5rem] bg-background border border-border/40 overflow-hidden"
      >
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative shrink-0 group">
              <div className="relative h-20 w-20 flex items-center justify-center rounded-[1.75rem] bg-primary transition-all duration-300">
                <Shield className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground uppercase sm:text-4xl">
                Auditoría
              </h1>
              <p className="text-muted-foreground font-medium mt-1 tracking-wide">
                Registro inmutable de todas las acciones y eventos del sistema
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleExport}
            className="h-12 px-8 rounded-2xl gap-2 font-black uppercase tracking-widest text-[10px] transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> EXPORTAR EXCEL
          </Button>
        </div>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { title: 'Total Eventos', value: allData?.total, icon: Activity, loading: loadingAll, color: 'primary' },
          { title: 'Eventos Hoy', value: todayData?.total, icon: TrendingUp, loading: loadingToday, color: 'success' },
          { title: 'Críticos', value: criticalData?.total, icon: AlertTriangle, loading: loadingCritical, color: 'destructive' },
          { title: 'Eliminaciones', value: deletesData?.total, icon: Trash2, loading: loadingDeletes, color: 'warning' },
        ].map((kpi, idx) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group relative overflow-hidden p-6 rounded-[2rem] bg-background border border-border/40 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-${kpi.color}/10 text-${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              {kpi.loading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-black tabular-nums text-foreground">
                  {kpi.value?.toLocaleString('es-CO')}
                </div>
              )}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{kpi.title}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="flex justify-center">
          <TabsList className="h-14 bg-background border border-border/50 p-1.5 rounded-[1.25rem]">
            {[
              { value: 'all', label: 'Todo el Registro', icon: History },
              { value: 'critical', label: 'Eventos Críticos', icon: AlertTriangle },
              { value: 'users', label: 'Por Usuario', icon: Users2 },
              { value: 'exports', label: 'Exportaciones', icon: Download },
            ].map((tab) => (
              <TabsTrigger 
                key={tab.value}
                value={tab.value} 
                className="rounded-[1rem] px-6 py-2 font-black text-[10px] uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <tab.icon className="w-3.5 h-3.5 mr-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-hidden rounded-[2.5rem] border border-border/40 bg-background p-2">
            <AuditLogViewer />
          </div>
        </TabsContent>

        <TabsContent value="critical" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-6 rounded-[2rem] bg-destructive/5 border border-destructive/10">
              <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-black text-destructive uppercase tracking-tight">Atención Requerida</p>
                <p className="text-xs font-medium text-destructive/70">Visualizando únicamente eventos marcados como críticos por el sistema.</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-[2.5rem] border border-border/40 bg-background p-2">
              <AuditLogViewer filter={{ severity: 'critical' }} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-hidden rounded-[2.5rem] border border-border/40 bg-background p-2">
            <AuditLogViewer />
          </div>
        </TabsContent>

        <TabsContent value="exports" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-hidden rounded-[2.5rem] border border-border/40 bg-background p-2">
            <AuditLogViewer filter={{ action: 'export' }} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
