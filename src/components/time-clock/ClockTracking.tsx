import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOperationCenters } from "@/hooks/useCompanies";
import { useTimeClockCenterSettings } from "@/hooks/useTimeClock";
import { clockRpc } from "@/lib/timeClockApi";
import { attendanceDate } from "@/lib/timeClock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function ClockTracking() {
  const { data: centers = [] } = useOperationCenters();
  const { data: settings = [], error } = useTimeClockCenterSettings();
  const client = useQueryClient();
  const [centerId, setCenterId] = useState("");
  const [start, setStart] = useState(attendanceDate());
  const [busy, setBusy] = useState(false);
  async function save(id: string, date: string, enabled: boolean) {
    setBusy(true);
    try {
      await clockRpc("time_clock_configure_center", {
        _center_id: id,
        _start_date: date,
        _enabled: enabled,
      });
      await client.invalidateQueries({
        queryKey: ["time-clock-center-settings"],
      });
      toast.success(
        enabled
          ? "Seguimiento activado. Se actualizará en los próximos cinco minutos."
          : "Seguimiento pausado",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Seguimiento por centro</CardTitle>
        <p className="text-sm text-muted-foreground">
          Activa un centro desde la fecha de inicio real. Las incidencias se
          revisan cada cinco minutos; no afectan la nómina.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p role="alert">No se pudo cargar la configuración.</p>}
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void save(centerId, start, true);
          }}
        >
          <select
            aria-label="Centro para activar seguimiento"
            required
            className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3"
            value={centerId}
            onChange={(e) => {
              setCenterId(e.target.value);
              setStart(
                settings.find((s) => s.operation_center_id === e.target.value)
                  ?.tracking_start_date || attendanceDate(),
              );
            }}
          >
            <option value="">Selecciona centro</option>
            {centers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Input
            aria-label="Inicio del seguimiento"
            type="date"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="sm:w-44"
          />
          <Button disabled={!centerId || busy}>Activar seguimiento</Button>
        </form>
        {settings.map((s) => (
          <div
            key={s.operation_center_id}
            className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm"
          >
            <div>
              <p className="font-medium">
                {centers.find((c) => c.id === s.operation_center_id)?.name ||
                  "Centro"}
              </p>
              <p className="text-muted-foreground">
                Desde {s.tracking_start_date} ·{" "}
                {s.enabled ? "Activo" : "Pausado"}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                save(s.operation_center_id, s.tracking_start_date, !s.enabled)
              }
            >
              {s.enabled ? "Pausar" : "Reanudar"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
