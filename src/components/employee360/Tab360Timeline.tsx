import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle,
  CalendarDays,
  FileText,
  GraduationCap,
  HeartPulse,
  Search,
  ScrollText,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { Employee360TimelineEvent } from '@/hooks/useEmployee360';
import { cn } from '@/lib/utils';

interface Tab360TimelineProps {
  events: Employee360TimelineEvent[];
  isLoading: boolean;
}

const eventConfig = {
  contract: { icon: FileText, label: 'Contrato', className: 'bg-primary/10 text-primary border-primary/20' },
  termination: { icon: UserX, label: 'Retiro', className: 'bg-warning/10 text-warning border-warning/20' },
  vacation: { icon: CalendarDays, label: 'Vacaciones', className: 'bg-success-light text-success border-success/20' },
  leave: { icon: CalendarDays, label: 'Permiso', className: 'bg-accent-light text-accent border-accent/20' },
  incapacity: { icon: HeartPulse, label: 'Incapacidad', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  disciplinary: { icon: ShieldAlert, label: 'Disciplinario', className: 'bg-warning/10 text-warning border-warning/20' },
  document: { icon: ScrollText, label: 'Documento', className: 'bg-secondary text-secondary-foreground border-border' },
  training: { icon: GraduationCap, label: 'Capacitacion', className: 'bg-success-light text-success border-success/20' },
};

function formatEventDate(value: string): string {
  return format(new Date(value), "d 'de' MMMM yyyy", { locale: es });
}

export function Tab360Timeline({ events, isLoading }: Tab360TimelineProps) {
  const [eventType, setEventType] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

    return events.filter((event) => {
      const eventTime = new Date(event.date).getTime();
      const matchesType = eventType === 'all' || event.type === eventType;
      const matchesFrom = fromTime === null || eventTime >= fromTime;
      const matchesTo = toTime === null || eventTime <= toTime;
      const searchable = [
        event.title,
        event.description,
        event.status,
        event.meta,
        eventConfig[event.type].label,
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);

      return matchesType && matchesFrom && matchesTo && matchesQuery;
    });
  }, [events, eventType, query, fromDate, toDate]);

  const hasFilters = eventType !== 'all' || query.trim() || fromDate || toDate;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item}>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Sin eventos en la linea de tiempo</h3>
          <p className="text-muted-foreground">
            Aun no hay contratos, documentos, novedades o procesos historicos para mostrar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-sm">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar en la linea de tiempo..."
              className="pl-9"
            />
          </div>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los eventos</SelectItem>
              {Object.entries(eventConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEventType('all');
              setQuery('');
              setFromDate('');
              setToDate('');
            }}
            disabled={!hasFilters}
          >
            Limpiar
          </Button>
          <p className="text-xs text-muted-foreground lg:col-span-5">
            Mostrando {filteredEvents.length} de {events.length} eventos.
          </p>
        </CardContent>
      </Card>

      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 font-semibold">Sin resultados para los filtros aplicados</h3>
            <p className="text-sm text-muted-foreground">Ajusta la busqueda, el tipo de evento o el rango de fechas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative space-y-3">
          <div className="absolute bottom-0 left-5 top-0 hidden w-px bg-border sm:block" />
          {filteredEvents.map((event) => {
        const config = eventConfig[event.type];
        const Icon = config.icon;

        return (
          <div key={event.id} className="relative flex gap-3">
            <div className="z-10 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-card shadow-sm sm:flex">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <Card className="flex-1 border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn('text-[10px] font-bold uppercase tracking-widest', config.className)}>
                        {config.label}
                      </Badge>
                      {event.status && (
                        <Badge variant="outline" className="text-[10px]">
                          {event.status}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground">{event.title}</h3>
                    {event.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                    )}
                    {event.meta && (
                      <p className="mt-2 text-xs font-medium text-primary">{event.meta}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-medium text-muted-foreground">
                    {formatEventDate(event.date)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
          })}
        </div>
      )}
    </div>
  );
}
