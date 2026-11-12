import { useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatDateOnly } from '@/lib/dateOnly';
import { getIncapacityOriginShortLabel, recoveryStatusColors, recoveryStatusLabels, type IncapacityWithEmployee } from '@/types/incapacity';

interface IncapacityIndicatorDialogProps {
  title: string;
  description: string;
  records: IncapacityWithEmployee[];
  amount?: { label: string; format: (record: IncapacityWithEmployee) => string };
  onView: (id: string) => void;
}

export function IncapacityIndicatorDialog({ title, description, records, amount, onView }: IncapacityIndicatorDialogProps) {
  const [search, setSearch] = useState('');
  const openingDetail = useRef(false);
  const query = search.trim().toLowerCase();
  const filtered = records.filter(({ employee }) => !query || (
    employee && (
      `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(query)
      || employee.document_number?.toLowerCase().includes(query)
    )
  ));

  return (
    <DialogContent
      className="max-w-4xl gap-4 overflow-y-hidden"
      onCloseAutoFocus={(event) => {
        if (openingDetail.current) event.preventDefault();
      }}
    >
      <DialogHeader className="shrink-0 pr-6 text-left">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {records.length > 0 && (
        <div className="shrink-0 space-y-2">
          <Input
            aria-label="Buscar en el indicador"
            placeholder="Buscar por nombre o documento"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {filtered.length} de {records.length} registros
          </p>
        </div>
      )}
      {filtered.length > 0 ? (
        <ul aria-label="Registros del indicador" className="min-h-0 divide-y overflow-y-auto overscroll-contain rounded-lg border">
          {filtered.map((record) => {
            const name = record.employee ? `${record.employee.first_name} ${record.employee.last_name}` : 'Empleado sin datos';
            const period = `${formatDateOnly(record.start_date, 'dd/MM/yyyy')} – ${formatDateOnly(record.end_date, 'dd/MM/yyyy')}`;

            return (
              <li key={record.id} className="grid min-w-0 gap-2 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                <div className="min-w-0 break-words">
                  <p className="font-semibold">{name}</p>
                  <p className="text-xs text-muted-foreground">{record.employee?.document_number}</p>
                </div>
                <div>
                  <p>{period} · {record.total_days} días</p>
                  <p className="text-xs text-muted-foreground">
                    {record.is_extension ? `Prórroga #${record.extension_number}` : 'Incapacidad inicial'} · {getIncapacityOriginShortLabel(record.origin)}
                  </p>
                </div>
                <div className="space-y-1">
                  <Badge className={recoveryStatusColors[record.recovery_status]}>{recoveryStatusLabels[record.recovery_status]}</Badge>
                  {amount && <p className="text-xs">{amount.label} <span className="font-semibold tabular-nums">{amount.format(record)}</span></p>}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-self-start"
                  aria-label={`Ver detalle de ${name}`}
                  onClick={() => {
                    openingDetail.current = true;
                    onView(record.id);
                  }}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" /> Ver detalle
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {records.length ? 'No hay coincidencias para esta búsqueda.' : 'No hay registros para este indicador.'}
        </p>
      )}
    </DialogContent>
  );
}
