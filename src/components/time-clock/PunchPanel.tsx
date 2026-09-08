/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Coffee, Loader2, LogIn, LogOut, MapPin, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getCurrentPosition, useRegisterTimeClockEvent, useTimeClockEvents, useTimeClockPoint, useTimeClockPoints } from '@/hooks/useTimeClock';
import { getNextTimeClockActions, TIME_CLOCK_ACTION_LABELS, type TimeClockAction } from '@/types/timeClock';

const actionIcons: Record<TimeClockAction, typeof Clock3> = {
  clock_in: LogIn, break_start: Coffee, break_end: Coffee, clock_out: LogOut,
};

const errorMessages: Record<string, string> = {
  LOCATION_REQUIRED: 'Debes permitir la ubicación para marcar.',
  LOCATION_ACCURACY_LOW: 'No se obtuvo una ubicación suficientemente precisa. Acércate a una ventana e intenta de nuevo.',
  LOCATION_STALE: 'La ubicación obtenida está desactualizada. Intenta marcar nuevamente.',
  OUTSIDE_ALLOWED_AREA: 'Estás fuera del área permitida para este punto.',
  QR_EXPIRED_OR_INVALID: 'El código QR venció. Escanea el nuevo código de la pantalla.',
  INVALID_SEQUENCE: 'Esta acción ya no corresponde al estado actual. Actualiza e intenta de nuevo.',
  TOO_FREQUENT: 'Espera unos segundos antes de realizar otra marcación.',
  STALE_OPEN_DAY: 'Tu jornada anterior necesita revisión. Envía una solicitud de corrección.',
  EMPLOYEE_LINK_REQUIRED: 'Tu cuenta no está vinculada a un empleado activo.',
  EMPLOYMENT_CYCLE_REQUIRED: 'Tu relación laboral activa no está configurada. Contacta a Recursos Humanos.',
};

interface PunchPanelProps {
  employeeId: string;
  fixedPointId?: string | null;
  qrToken?: string | null;
  compact?: boolean;
}

export function PunchPanel({ employeeId, fixedPointId, qrToken, compact }: PunchPanelProps) {
  const { data: points = [] } = useTimeClockPoints();
  const { data: fixedPoint } = useTimeClockPoint(fixedPointId);
  const { data: events = [], refetch } = useTimeClockEvents(20, employeeId);
  const register = useRegisterTimeClockEvent();
  const [pointId, setPointId] = useState(fixedPointId || '');
  const lastAction = events[0]?.action;
  const actions = useMemo(() => getNextTimeClockActions(lastAction), [lastAction]);
  const activePointId = fixedPointId || pointId;
  const activePoint = fixedPoint || points.find(point => point.id === activePointId);
  const visibleActions = activePoint?.require_break_punches ? actions : actions.filter(action => !action.startsWith('break_'));

  async function punch(action: TimeClockAction) {
    if (!activePointId) return toast.error('Selecciona un punto de marcación');
    if (!navigator.geolocation) return toast.error('Este dispositivo no permite obtener la ubicación');
    try {
      const position = await getCurrentPosition();
      await register.mutateAsync({
        action,
        pointId: activePointId,
        source: qrToken ? 'qr' : 'web',
        qrToken,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        positionCapturedAt: new Date(position.timestamp).toISOString(),
      });
      await refetch();
      toast.success(`${TIME_CLOCK_ACTION_LABELS[action]} registrada`, { description: new Date().toLocaleTimeString('es-CO') });
    } catch (error: any) {
      const key = Object.keys(errorMessages).find(code => String(error?.message).includes(code));
      toast.error(key ? errorMessages[key] : (error?.message || 'No fue posible registrar la marcación'));
    }
  }

  return (
    <Card className="overflow-hidden border-primary/20 shadow-sm">
      <div className="h-1.5 bg-gradient-to-r from-primary via-emerald-500 to-cyan-500" />
      <CardHeader className={compact ? 'pb-3' : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl"><Clock3 className="h-5 w-5 text-primary" /> Mi asistencia</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">La hora y la ubicación se validan al confirmar.</p>
          </div>
          <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Seguro</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!fixedPointId && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Punto de marcación</label>
            <Select value={pointId} onValueChange={setPointId}>
              <SelectTrigger className="h-12"><MapPin className="mr-2 h-4 w-4 text-primary" /><SelectValue placeholder="Selecciona tu centro" /></SelectTrigger>
              <SelectContent>{points.filter(p => p.is_active).map(point => <SelectItem key={point.id} value={point.id}>{point.name} · {point.operation_centers?.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="rounded-2xl bg-muted/50 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Estado actual</p>
          <p className="mt-2 text-2xl font-bold">{lastAction ? TIME_CLOCK_ACTION_LABELS[lastAction] : 'Sin marcaciones hoy'}</p>
          {events[0] && <p className="mt-1 text-sm text-muted-foreground">{new Date(events[0].occurred_at).toLocaleString('es-CO')}</p>}
        </div>
        <div className={`grid gap-3 ${actions.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {visibleActions.map(action => {
            const Icon = actionIcons[action];
            return <Button key={action} size="lg" className="h-14 rounded-xl text-base" variant={action === 'clock_out' ? 'outline' : 'default'} disabled={register.isPending} onClick={() => punch(action)}>
              {register.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Icon className="mr-2 h-5 w-5" />}{TIME_CLOCK_ACTION_LABELS[action]}
            </Button>;
          })}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> No se confirma ninguna marca hasta que el servidor la valide.</div>
      </CardContent>
    </Card>
  );
}
