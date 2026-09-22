import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { clockRpc } from "@/lib/timeClockApi";
import { attendanceDateTime } from "@/lib/timeClock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function ClockAccess() {
  const { currentCompanyId } = useAuth();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [issued, setIssued] = useState<{
    pin: string;
    expires_at: string;
    name: string;
  } | null>(null);
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["time-clock-access", currentCompanyId],
    queryFn: () =>
      clockRpc<
        { id: string; name: string; document: string; status: string }[]
      >("time_clock_access_list", { _company_id: currentCompanyId }),
    enabled: !!currentCompanyId,
  });
  async function issue(id: string, name: string) {
    setBusy(id);
    try {
      const value = await clockRpc<{ pin: string; expires_at: string }>(
        "time_clock_issue_pin",
        { _employee_id: id },
      );
      setIssued({ ...value, name });
      await client.invalidateQueries({ queryKey: ["time-clock-access"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el PIN");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accesos de empleados</CardTitle>
        <p className="text-sm text-muted-foreground">
          Entrega el PIN temporal de forma individual. Restablecerlo invalida el
          anterior y los accesos abiertos.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          aria-label="Buscar acceso por empleado o cédula"
          placeholder="Buscar empleado o cédula"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isLoading && <p>Cargando empleados…</p>}
        {error && <p role="alert">No se pudieron cargar los accesos.</p>}
        <div className="max-h-[560px] overflow-y-auto">
          {data
            .filter((e) =>
              `${e.name} ${e.document}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b py-4"
              >
                <div>
                  <p className="font-semibold">{e.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {e.document} · {e.status}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => issue(e.id, e.name)}
                >
                  {busy === e.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  {e.status === "Sin PIN" ? "Generar PIN" : "Restablecer PIN"}
                </Button>
              </div>
            ))}
        </div>
        <Dialog
          open={!!issued}
          onOpenChange={(open) => {
            if (!open) setIssued(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>PIN temporal generado</DialogTitle>
              <DialogDescription>
                Se muestra una sola vez. Entrégalo únicamente a {issued?.name};
                deberá cambiarlo al ingresar.
              </DialogDescription>
            </DialogHeader>
            <p className="rounded-xl bg-muted p-6 text-center font-mono text-4xl tracking-[0.3em]">
              {issued?.pin}
            </p>
            <p className="text-sm">
              Vence: {issued && attendanceDateTime(issued.expires_at)}
            </p>
            <Button onClick={() => setIssued(null)}>Ya lo entregué</Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
