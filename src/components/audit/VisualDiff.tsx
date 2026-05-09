/**
 * VisualDiff.tsx
 * ---------------------------------------------------------------
 * Componente de diff visual entre old_values y new_values.
 * Muestra qué campos cambiaron, cuál era el valor y cuál es el nuevo.
 * ---------------------------------------------------------------
 */
import { cn } from '@/lib/utils';
import { ArrowRight, Plus, Trash2, RefreshCw } from 'lucide-react';

interface VisualDiffProps {
  oldValues: Record<string, unknown> | null | undefined;
  newValues: Record<string, unknown> | null | undefined;
  className?: string;
}

// Campos que generalmente no son útiles para mostrar en diff
const SKIP_FIELDS = new Set(['updated_at', 'created_at', 'id', 'company_id']);

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function truncate(str: string, len = 60): string {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function VisualDiff({ oldValues, newValues, className }: VisualDiffProps) {
  if (!oldValues && !newValues) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No hay datos de cambio disponibles para este evento.
      </p>
    );
  }

  const allKeys = new Set([
    ...Object.keys(oldValues ?? {}),
    ...Object.keys(newValues ?? {}),
  ]);

  // Filtrar campos de sistema y calcular tipo de cambio por campo
  const changes: {
    key: string;
    type: 'added' | 'removed' | 'changed' | 'unchanged';
    oldVal: string;
    newVal: string;
  }[] = [];

  for (const key of allKeys) {
    if (SKIP_FIELDS.has(key)) continue;

    const oldVal = formatValue(oldValues?.[key]);
    const newVal = formatValue(newValues?.[key]);

    if (!oldValues || !(key in oldValues)) {
      changes.push({ key, type: 'added', oldVal: '—', newVal });
    } else if (!newValues || !(key in newValues)) {
      changes.push({ key, type: 'removed', oldVal, newVal: '—' });
    } else if (oldVal !== newVal) {
      changes.push({ key, type: 'changed', oldVal, newVal });
    }
    // 'unchanged' lo omitimos para mayor claridad
  }

  if (changes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No se detectaron cambios en los datos.
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {changes.map(({ key, type, oldVal, newVal }) => (
        <div
          key={key}
          className={cn(
            'rounded-lg border px-3 py-2 text-xs font-mono',
            type === 'added'   && 'border-emerald-500/30 bg-emerald-500/5',
            type === 'removed' && 'border-rose-500/30 bg-rose-500/5',
            type === 'changed' && 'border-blue-500/30 bg-blue-500/5',
          )}
        >
          {/* Cabecera del campo */}
          <div className="flex items-center gap-2 mb-1">
            {type === 'added'   && <Plus  className="w-3 h-3 text-emerald-500 shrink-0" />}
            {type === 'removed' && <Trash2 className="w-3 h-3 text-rose-500 shrink-0" />}
            {type === 'changed' && <RefreshCw className="w-3 h-3 text-blue-500 shrink-0" />}
            <span className={cn(
              'font-semibold text-[11px] uppercase tracking-wide',
              type === 'added'   && 'text-emerald-600',
              type === 'removed' && 'text-rose-600',
              type === 'changed' && 'text-blue-600',
            )}>
              {key.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Valores */}
          {type === 'changed' && (
            <div className="flex items-start gap-2 flex-wrap">
              <span className="line-through text-rose-500/80 bg-rose-500/10 rounded px-1">
                {truncate(oldVal)}
              </span>
              <ArrowRight className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-emerald-600 bg-emerald-500/10 rounded px-1">
                {truncate(newVal)}
              </span>
            </div>
          )}
          {type === 'added' && (
            <span className="text-emerald-600 bg-emerald-500/10 rounded px-1">
              {truncate(newVal)}
            </span>
          )}
          {type === 'removed' && (
            <span className="line-through text-rose-500/80 bg-rose-500/10 rounded px-1">
              {truncate(oldVal)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
