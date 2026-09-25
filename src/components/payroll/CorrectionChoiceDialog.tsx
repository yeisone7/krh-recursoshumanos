import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { colombiaDateTime, ticketStatus, type CorrectionTicket } from '@/lib/payrollCorrections';

export function CorrectionChoiceDialog({ tickets, finish }: { tickets: CorrectionTicket[]; finish: (id: string | null) => void }) {
  const [selected, setSelected] = useState(tickets.length === 1 ? tickets[0].id : '');
  const ticket = tickets.find(t => t.id === selected);
  return <Dialog open onOpenChange={v => !v && finish(null)}><DialogContent><DialogHeader>
    <DialogTitle>Corrección en fechas cerradas</DialogTitle>
    <DialogDescription>El corte permanecerá activo. El cambio y el ticket quedarán en la auditoría.</DialogDescription>
  </DialogHeader>
    {tickets.length ? <>
      <label className="space-y-2">Permiso autorizado
        <select aria-label="Ticket para guardar" className="w-full rounded-md border bg-background p-2" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Seleccione un ticket</option>{tickets.map(t => <option key={t.id} value={t.id}>#{t.number} · {t.employee_name}</option>)}
        </select>
      </label>
      {ticket && <div className="space-y-1 rounded-md border p-3 text-sm"><p>{ticket.center_name} · {ticket.start_date} al {ticket.end_date}</p><p>Vence: <strong>{colombiaDateTime(ticket.expires_at)}</strong> (Colombia)</p><p>{ticket.reason}</p><p>La nueva aprobación también debe realizarse antes del vencimiento.</p></div>}
    </> : <p role="alert">No hay un ticket vigente que cubra todos los registros y acciones. Solicite un permiso desde Jornadas, Novedades o Cortes de control. Para varios empleados, separe la operación por empleado.</p>}
    <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => finish(null)}>Cancelar</Button><Button disabled={!ticket || ticketStatus(ticket) !== 'active'} onClick={() => ticket && finish(ticket.id)}>Guardar con ticket {ticket && `#${ticket.number}`}</Button></div>
  </DialogContent></Dialog>;
}
