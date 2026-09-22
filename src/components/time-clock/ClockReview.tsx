import { useState } from "react";
import {
  useResolveTimeClockCorrection,
  useTimeClockDayEvents,
} from "@/hooks/useTimeClock";
import {
  TIME_CLOCK_ACTION_LABELS,
  type TimeClockCorrection,
  type TimeClockDay,
} from "@/types/timeClock";
import {
  attendanceDateTime,
  duration,
  sourceLabels,
  scheduledMinutes,
} from "@/lib/timeClock";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function ClockDayDetail({
  day,
  onClose,
}: {
  day: TimeClockDay | null;
  onClose: () => void;
}) {
  const {
    data: events = [],
    isLoading,
    error,
  } = useTimeClockDayEvents(day?.id);
  const replaced = new Set(events.map((e) => e.supersedes_event_id));
  return (
    <Dialog
      open={!!day}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {day?.employees_v2?.first_name} {day?.employees_v2?.last_name}
          </DialogTitle>
          <DialogDescription>
            Jornada {day?.work_date} · {day?.schedule_name || "Sin horario"}
          </DialogDescription>
        </DialogHeader>
        {day && (
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-4 text-sm">
            <p>
              Programado
              <br />
              <strong>{duration(scheduledMinutes(day))}</strong>
            </p>
            <p>
              Trabajado
              <br />
              <strong>{duration(day.worked_minutes)}</strong>
            </p>
            <p>
              Pausas
              <br />
              <strong>{duration(day.break_minutes)}</strong>
            </p>
          </div>
        )}
        {isLoading && <p>Cargando…</p>}
        {error && <p role="alert">No se pudo cargar el detalle.</p>}
        {!events.length && !isLoading && (
          <p className="text-sm text-muted-foreground">
            Sin marcaciones registradas.
          </p>
        )}
        {events.map((e) => (
          <div
            key={e.id}
            className={`border-l-2 pl-4 ${replaced.has(e.id) ? "opacity-50" : "border-primary"}`}
          >
            <p className="font-semibold">
              {TIME_CLOCK_ACTION_LABELS[e.action]}{" "}
              {replaced.has(e.id) && "(sustituida)"}
            </p>
            <p className="text-sm">{attendanceDateTime(e.occurred_at)}</p>
            <p className="text-xs text-muted-foreground">
              {sourceLabels[e.source]} ·{" "}
              {e.identity_method === "pin"
                ? "Cédula y PIN"
                : e.identity_method === "supervisor"
                  ? "Supervisor"
                  : "Usuario autenticado"}
              {e.location_verified ? " · Ubicación validada" : ""}
            </p>
            {e.supervisor_reason && (
              <p className="mt-1 text-sm">{e.supervisor_reason}</p>
            )}
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}

export function ClockCorrections({
  items,
  canApprove,
}: {
  items: TimeClockCorrection[];
  canApprove: boolean;
}) {
  const resolve = useResolveTimeClockCorrection();
  const [decision, setDecision] = useState<{
    item: TimeClockCorrection;
    approve: boolean;
  } | null>(null);
  const [notes, setNotes] = useState("");
  async function submit() {
    if (!decision || notes.trim().length < 5) return;
    try {
      await resolve.mutateAsync({
        id: decision.item.id,
        approve: decision.approve,
        notes,
      });
      toast.success(
        decision.approve ? "Corrección aprobada" : "Corrección rechazada",
      );
      setDecision(null);
      setNotes("");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo resolver la solicitud",
      );
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitudes de corrección</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!items.length && (
          <p className="text-sm text-muted-foreground">No hay solicitudes.</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-semibold">
                {item.employees_v2?.first_name} {item.employees_v2?.last_name}
              </p>
              <span className="text-sm">
                {item.status === "pending"
                  ? "Pendiente"
                  : item.status === "approved"
                    ? "Aprobada"
                    : "Rechazada"}
              </span>
            </div>
            <p className="mt-1 text-sm">
              {TIME_CLOCK_ACTION_LABELS[item.requested_action]} ·{" "}
              {attendanceDateTime(item.requested_at)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Solicitada por el empleado ·{" "}
              {item.identity_method === "pin" ? "Cédula y PIN" : "Portal"}
            </p>
            {item.review_notes && (
              <p className="mt-2 text-sm">
                Revisado por {item.reviewer_name || "Responsable autorizado"}:{" "}
                {item.review_notes}
                {item.reviewed_at &&
                  ` · ${attendanceDateTime(item.reviewed_at)}`}
              </p>
            )}
            {canApprove && item.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDecision({ item, approve: false });
                    setNotes("");
                  }}
                >
                  Rechazar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setDecision({ item, approve: true });
                    setNotes("");
                  }}
                >
                  Aprobar
                </Button>
              </div>
            )}
          </div>
        ))}
        <Dialog
          open={!!decision}
          onOpenChange={(open) => {
            if (!open) setDecision(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {decision?.approve ? "Aprobar" : "Rechazar"} corrección
              </DialogTitle>
              <DialogDescription>
                Describe el motivo de tu decisión. La revisión quedará
                registrada con tu usuario.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              aria-label="Observación de revisión"
              minLength={5}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observación obligatoria"
            />
            <Button
              disabled={resolve.isPending || notes.trim().length < 5}
              onClick={submit}
            >
              Confirmar revisión
            </Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
