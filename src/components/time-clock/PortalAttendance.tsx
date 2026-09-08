/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, CalendarClock, Send } from 'lucide-react';
import { PunchPanel } from './PunchPanel';
import { useRequestTimeClockCorrection, useTimeClockCorrections, useTimeClockEvents } from '@/hooks/useTimeClock';
import { TIME_CLOCK_ACTION_LABELS, type TimeClockAction } from '@/types/timeClock';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function PortalAttendance({ employeeId, pointId, qrToken }: { employeeId: string; pointId?: string | null; qrToken?: string | null }) {
  const { data: events = [] } = useTimeClockEvents(30, employeeId);
  const { data: corrections = [] } = useTimeClockCorrections(employeeId);
  const correction = useRequestTimeClockCorrection();
  const [action, setAction] = useState<TimeClockAction>('clock_in');
  const [requestedAt, setRequestedAt] = useState('');
  const [reason, setReason] = useState('');

  async function submitCorrection() {
    if (!requestedAt || reason.trim().length < 5) return toast.error('Indica fecha, hora y un motivo de al menos 5 caracteres');
    try {
      await correction.mutateAsync({ action, requestedAt: new Date(requestedAt).toISOString(), reason });
      setRequestedAt(''); setReason('');
      toast.success('Solicitud enviada para aprobación');
    } catch (error: any) { toast.error(error?.message || 'No se pudo enviar la solicitud'); }
  }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
    <div className="space-y-6">
      <PunchPanel employeeId={employeeId} fixedPointId={pointId} qrToken={qrToken} />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CalendarClock className="h-5 w-5 text-primary" /> Historial reciente</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aún no tienes marcaciones.</p>}
          {events.map(event => <div key={event.id} className="flex items-center justify-between gap-4 rounded-xl border p-3">
            <div><p className="font-medium">{TIME_CLOCK_ACTION_LABELS[event.action]}</p><p className="text-xs text-muted-foreground">{format(new Date(event.occurred_at), "EEEE d 'de' MMMM, h:mm a", { locale: es })}</p></div>
            <div className="text-right text-xs text-muted-foreground"><p>{event.source === 'qr' ? 'QR verificado' : event.source === 'correction' ? 'Corrección' : 'Web'}</p><p>{event.operation_centers?.name}</p></div>
          </div>)}
        </CardContent>
      </Card>
    </div>
    <Card className="h-fit">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-amber-500" /> Solicitar corrección</CardTitle><p className="text-sm text-muted-foreground">Para olvidos o fallas de conexión. Un responsable deberá aprobarla.</p></CardHeader>
      <CardContent className="space-y-4">
        <Select value={action} onValueChange={v => setAction(v as TimeClockAction)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TIME_CLOCK_ACTION_LABELS).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
        <Input type="datetime-local" value={requestedAt} onChange={e => setRequestedAt(e.target.value)} />
        <Textarea placeholder="Explica qué ocurrió" value={reason} onChange={e => setReason(e.target.value)} rows={4} />
        <Button className="w-full" onClick={submitCorrection} disabled={correction.isPending}><Send className="mr-2 h-4 w-4" /> Enviar solicitud</Button>
        {corrections.slice(0, 5).map(item => <div key={item.id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between gap-2"><span>{TIME_CLOCK_ACTION_LABELS[item.requested_action]}</span><span className={item.status === 'approved' ? 'text-emerald-600' : item.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'}>{item.status === 'approved' ? 'Aprobada' : item.status === 'rejected' ? 'Rechazada' : 'Pendiente'}</span></div><p className="mt-1 text-xs text-muted-foreground">{new Date(item.requested_at).toLocaleString('es-CO')}</p></div>)}
      </CardContent>
    </Card>
  </div>;
}
