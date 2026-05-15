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

  // Stats globales (queries independientes para cada métrica)
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

    // Obtener todos los registros para exportar (max 1000)
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

    // Registrar la exportación en auditoría
    logExport(currentCompanyId, 'auditoria', 'excel', 'Exportación del registro de auditoría');
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 sm:text-2xl">
            <Shield className="w-6 h-6 text-primary" />
            Auditoría y Trazabilidad
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro inmutable de todas las acciones del sistema
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 self-start"
          onClick={handleExport}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Exportar Excel
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          title="Total Eventos"
          value={allData?.total}
          icon={Activity}
          loading={loadingAll}
          badge="histórico"
        />
        <KpiCard
          title="Hoy"
          value={todayData?.total}
          icon={TrendingUp}
          loading={loadingToday}
          colorClass="text-success"
        />
        <KpiCard
          title="Críticos"
          value={criticalData?.total}
          icon={AlertTriangle}
          loading={loadingCritical}
          colorClass="text-destructive"
        />
        <KpiCard
          title="Eliminaciones"
          value={deletesData?.total}
          icon={Trash2}
          loading={loadingDeletes}
          colorClass="text-warning"
        />
      </div>

      {/* Tabs de vistas */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="all" className="gap-1.5">
            <History className="w-3.5 h-3.5" />
            Todo el Registro
          </TabsTrigger>
          <TabsTrigger value="critical" className="gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Eventos Críticos
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users2 className="w-3.5 h-3.5" />
            Por Usuario
          </TabsTrigger>
          <TabsTrigger value="exports" className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Exportaciones
          </TabsTrigger>
        </TabsList>

        {/* Todo el registro */}
        <TabsContent value="all" className="mt-4">
          <AuditLogViewer />
        </TabsContent>

        {/* Solo eventos críticos */}
        <TabsContent value="critical" className="mt-4">
          <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive font-medium">
                Eventos marcados como críticos que requieren atención inmediata.
              </p>
            </div>
            <AuditLogViewer />
          </div>
        </TabsContent>

        {/* Por usuario */}
        <TabsContent value="users" className="mt-4">
          <AuditLogViewer />
        </TabsContent>

        {/* Exportaciones */}
        <TabsContent value="exports" className="mt-4">
          <AuditLogViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
