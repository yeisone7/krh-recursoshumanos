import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AbsenceConflict } from '@/hooks/useAbsenceConflicts';

interface Props {
  conflicts: AbsenceConflict[];
}

const typeColors: Record<string, string> = {
  vacation: 'text-blue-700',
  leave: 'text-purple-700',
  incapacity: 'text-red-700',
};

export function AbsenceConflictAlert({ conflicts }: Props) {
  if (!conflicts.length) return null;

  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
      <div className="text-sm space-y-1">
        <p className="font-medium text-destructive">
          Conflicto de fechas detectado ({conflicts.length})
        </p>
        <p className="text-destructive/80">
          No se puede crear esta solicitud porque las fechas se solapan con registros existentes:
        </p>
        <ul className="list-disc list-inside space-y-0.5">
          {conflicts.map((c, i) => (
            <li key={i} className={typeColors[c.type] || 'text-destructive'}>
              {c.label}: {format(new Date(c.startDate), 'dd/MM/yyyy', { locale: es })} – {format(new Date(c.endDate), 'dd/MM/yyyy', { locale: es })} ({c.status})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
