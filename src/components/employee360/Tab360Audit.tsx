import { motion } from 'framer-motion';
import { History, User, FileEdit, Plus, Trash2, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { actionLabels, entityTypeLabels } from '@/hooks/useAuditLog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Tab360AuditProps {
  auditLogs: any[];
  isLoading: boolean;
}

function getActionIcon(action: string) {
  switch (action) {
    case 'create':
      return <Plus className="w-4 h-4 text-success" />;
    case 'update':
      return <FileEdit className="w-4 h-4 text-primary" />;
    case 'delete':
      return <Trash2 className="w-4 h-4 text-destructive" />;
    default:
      return <User className="w-4 h-4 text-muted-foreground" />;
  }
}

function getActionColor(action: string) {
  switch (action) {
    case 'create':
      return 'bg-success-light text-success';
    case 'update':
      return 'bg-primary-light text-primary';
    case 'delete':
      return 'bg-destructive/10 text-destructive';
    default:
      return 'bg-background text-muted-foreground';
  }
}

export function Tab360Audit({ auditLogs, isLoading }: Tab360AuditProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Sin historial</h3>
          <p className="text-muted-foreground">
            No hay registros de auditoría para este empleado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <History className="w-4 h-4" />
          Historial de Cambios
        </h3>
        <Badge variant="secondary">{auditLogs.length} registros</Badge>
      </div>

      <Card>
        <ScrollArea className="h-[600px]">
          <CardContent className="p-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              {/* Timeline events */}
              <div className="space-y-6">
                {auditLogs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="relative pl-10"
                  >
                    {/* Timeline dot */}
                    <div className={cn(
                      'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center',
                      getActionColor(log.action)
                    )}>
                      {getActionIcon(log.action)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {actionLabels[log.action] || log.action}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {entityTypeLabels[log.entity_type] || log.entity_type}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {log.user_email || 'Usuario desconocido'}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                      </p>

                      {/* Changes detail */}
                      {(log.old_values || log.new_values) && (
                        <div className="mt-2 p-3 rounded-lg bg-background text-sm">
                          {log.new_values && Object.keys(log.new_values).length > 0 && (
                            <div className="space-y-1">
                              {Object.entries(log.new_values).slice(0, 5).map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="text-muted-foreground capitalize">
                                    {key.replace(/_/g, ' ')}:
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {log.old_values?.[key] && (
                                      <span className="text-muted-foreground line-through mr-2">
                                        {String(log.old_values[key]).slice(0, 30)}
                                      </span>
                                    )}
                                    {String(value).slice(0, 50)}
                                    {String(value).length > 50 && '...'}
                                  </span>
                                </div>
                              ))}
                              {Object.keys(log.new_values).length > 5 && (
                                <p className="text-xs text-muted-foreground">
                                  +{Object.keys(log.new_values).length - 5} campos más
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </ScrollArea>
      </Card>
    </motion.div>
  );
}
