/**
 * AuditDetailDrawer.tsx
 * ---------------------------------------------------------------
 * Drawer de detalle completo para un evento de auditoría.
 * Muestra: timeline, diff visual, metadata, IP, dispositivo.
 * ---------------------------------------------------------------
 */
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User, Clock, Globe, Monitor, Hash, Database,
  Activity, Shield, Info, AlertTriangle, XCircle,
} from 'lucide-react';
import { VisualDiff } from './VisualDiff';
import {
  actionLabels, entityTypeLabels,
  actionConfig, severityConfig, resolveModuleLabel,
  type AuditLogEntry,
} from '@/hooks/useAuditLog';

interface AuditDetailDrawerProps {
  log: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SeverityIcon = ({ severity }: { severity: string | null }) => {
  if (severity === 'critical') return <XCircle className="w-4 h-4 text-rose-500" />;
  if (severity === 'warning')  return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  return <Info className="w-4 h-4 text-blue-500" />;
};

function MetaRow({ icon: Icon, label, value }: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-all">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export function AuditDetailDrawer({ log, open, onOpenChange }: AuditDetailDrawerProps) {
  if (!log) return null;

  const actionCfg = actionConfig[log.action] ?? { class: 'bg-muted text-muted-foreground' };
  const severityCfg = log.severity ? severityConfig[log.severity] : severityConfig.info;

  const browserInfo = (() => {
    const ua = log.user_agent ?? '';
    if (ua.includes('Chrome'))  return 'Google Chrome';
    if (ua.includes('Firefox')) return 'Mozilla Firefox';
    if (ua.includes('Safari'))  return 'Apple Safari';
    if (ua.includes('Edge'))    return 'Microsoft Edge';
    return ua.slice(0, 40) || '—';
  })();

  const osInfo = (() => {
    const ua = log.user_agent ?? '';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS'))  return 'macOS';
    if (ua.includes('Linux'))   return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS'))     return 'iOS';
    return '—';
  })();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base">Detalle del Evento</SheetTitle>
              <SheetDescription className="text-xs">
                {format(new Date(log.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm:ss", { locale: es })}
              </SheetDescription>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className={actionCfg.class}>
              {actionLabels[log.action] ?? log.action}
            </Badge>
            <Badge variant="outline" className={severityCfg.class}>
              <SeverityIcon severity={log.severity} />
              <span className="ml-1">{severityCfg.label}</span>
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-6">

            {/* Descripción */}
            {log.description && (
              <div className="rounded-lg bg-muted/50 border px-4 py-3">
                <p className="text-sm text-foreground">{log.description}</p>
              </div>
            )}

            {/* Info del evento */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Información del Evento
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <MetaRow icon={User}     label="Usuario"   value={log.user_email ?? 'Sistema'} />
                <MetaRow icon={Clock}    label="Fecha/Hora" value={
                  format(new Date(log.created_at), "dd MMM yyyy, HH:mm:ss", { locale: es })
                } />
                <MetaRow icon={Database} label="Módulo"
                  value={resolveModuleLabel(log.module)} />
                <MetaRow icon={Hash}     label="Entidad"
                  value={`${entityTypeLabels[log.entity_type] ?? log.entity_type}${log.entity_name ? ` · ${log.entity_name}` : ''}`} />
                {log.entity_id && (
                  <MetaRow icon={Hash} label="ID de Entidad"
                    value={<span className="font-mono text-xs">{log.entity_id}</span>} />
                )}
              </div>
            </section>

            <Separator />

            {/* Info del dispositivo */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5" /> Dispositivo y Conexión
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <MetaRow icon={Globe}   label="Dirección IP" value={log.ip_address ?? 'No capturada'} />
                <MetaRow icon={Monitor} label="Navegador"    value={browserInfo} />
                <MetaRow icon={Monitor} label="Sistema Operativo" value={osInfo} />
                {(log.metadata as Record<string, unknown>)?.url && (
                  <MetaRow icon={Globe} label="URL"
                    value={String((log.metadata as Record<string, unknown>).url)} />
                )}
              </div>
            </section>

            {/* Diff Visual */}
            {(log.old_values || log.new_values) && (
              <>
                <Separator />
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" /> Cambios en los Datos
                  </h3>
                  <VisualDiff
                    oldValues={log.old_values as Record<string, unknown>}
                    newValues={log.new_values as Record<string, unknown>}
                  />
                </section>
              </>
            )}

            {/* Metadata adicional */}
            {log.metadata && Object.keys(log.metadata).length > 1 && (
              <>
                <Separator />
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" /> Metadatos Adicionales
                  </h3>
                  <pre className="text-xs bg-muted/50 border rounded-lg p-3 overflow-auto max-h-40 font-mono">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </section>
              </>
            )}

            {/* ID del log */}
            <div className="pt-2">
              <p className="text-[10px] text-muted-foreground/60 font-mono break-all">
                ID: {log.id}
              </p>
            </div>

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
