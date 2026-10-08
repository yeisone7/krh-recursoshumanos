import { useRef, useState } from "react";
import { CheckCircle2, Eraser, History, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DAILY_STATUS,
  SERVICE_LABELS,
  HOUR_CODES,
  dailyDate,
  dailyHourTotals,
  dailyScheduleText,
  dailyTime,
  type DailyRow,
  type DailyServices,
  type DailyHistory,
} from "@/lib/dailyReports";
import { DAILY_CONSENT } from "@/lib/dailyReportPdf";

export function DailyReportRows({
  rows,
  selected,
  onSelect,
  services,
  onServices,
  employee = false,
  onHistory,
  disabled = false,
  selectable = true,
}: {
  rows: DailyRow[];
  selected: Set<string>;
  onSelect: (key: string) => void;
  services?: Record<string, DailyServices>;
  onServices?: (key: string, value: DailyServices) => void;
  employee?: boolean;
  onHistory: (row: DailyRow) => void;
  disabled?: boolean;
  selectable?: boolean;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const canChoose =
          selectable && (employee ? row.can_sign : row.status === "signed");
        return (
          <article
            key={row.key}
            className={`rounded-xl border bg-card p-4 ${selected.has(row.key) ? "border-primary ring-1 ring-primary/20" : ""}`}
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "auto 320px",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-5 accent-primary"
                  aria-label={`Seleccionar ${row.snapshot.employee.name} ${row.date}`}
                  disabled={disabled || !canChoose}
                  checked={selected.has(row.key)}
                  onChange={() => onSelect(row.key)}
                />
                <span>
                  <span className="block font-semibold">
                    {dailyDate(row.date)}
                    {!employee && ` · ${row.snapshot.employee.name}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {DAILY_STATUS[row.status]}
                  </span>
                </span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onHistory(row)}
              >
                <History className="mr-1 size-4" />
                Historial
              </Button>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm">
              {dailyScheduleText(row.snapshot)}
            </p>
            {!row.snapshot.ready && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                {!row.snapshot.internally_approved
                  ? "Nómina debe revisar y aprobar esta jornada."
                  : row.snapshot.extras
                        .concat(row.snapshot.novelties)
                        .some((h) => !h.valid)
                    ? "Nómina debe aclarar los conceptos u horas de este día."
                    : "Disponible para firma cuando llegue la fecha de la jornada."}
              </p>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(["extras", "novelties"] as const).map((kind) => {
                const totals = dailyHourTotals(row.snapshot[kind]);
                return (
                  <div
                    key={kind}
                    className="rounded-lg bg-muted/50 p-3 text-xs"
                  >
                    <p className="mb-1 font-semibold">
                      {kind === "extras"
                        ? "Horas extra registradas"
                        : "Novedades adicionales"}
                    </p>
                    <p>
                      {totals.some(Boolean)
                        ? totals
                            .map((v, i) =>
                              v ? `${HOUR_CODES[i]}: ${v} h` : "",
                            )
                            .filter(Boolean)
                            .join(" · ")
                        : "Sin horas adicionales"}
                    </p>
                    {row.snapshot[kind]
                      .filter(
                        (n) =>
                          !HOUR_CODES.includes(
                            n.code as (typeof HOUR_CODES)[number],
                          ),
                      )
                      .map((n) => (
                        <p key={n.id}>
                          {n.label}: {n.quantity ?? n.hours}{" "}
                          {n.unit === "days" ? "días" : "h"}
                          {!n.valid && " · Por aclarar"}
                        </p>
                      ))}
                  </div>
                );
              })}
            </div>
            <fieldset
              className="mt-3"
              disabled={disabled || !employee || !row.can_sign}
            >
              <legend className="mb-2 text-xs font-semibold">
                Servicios consumidos
                {employee && row.can_sign ? " · Marca los que recibiste" : ""}
              </legend>
              <div className="flex flex-wrap gap-x-4 gap-y-3">
                {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={
                        (services?.[row.key] || row.services)[
                          key as keyof DailyServices
                        ] || false
                      }
                      onChange={(e) =>
                        onServices?.(row.key, {
                          ...(services?.[row.key] || row.services),
                          [key]: e.target.checked,
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {row.reason && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                Observación: {row.reason}
              </p>
            )}
            {row.evidence?.employee_signed_at && (
              <p className="mt-3 text-xs text-muted-foreground">
                Firmado por el empleado:{" "}
                {dailyTime(row.evidence.employee_signed_at)}
              </p>
            )}
            {row.evidence?.supervisor_signed_at && (
              <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-3" />
                {row.evidence.supervisor_name} ·{" "}
                {dailyTime(row.evidence.supervisor_signed_at)}
              </p>
            )}
          </article>
        );
      })}
      {!rows.length && (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          No hay jornadas para estos filtros.
        </div>
      )}
    </div>
  );
}

export function DailySignature({
  onChange,
}: {
  onChange: (image: string | null) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false),
    distance = useRef(0),
    last = useRef({ x: 0, y: 0 });
  function position(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * 800) / r.width,
      y: ((e.clientY - r.top) * 260) / r.height,
    };
  }
  return (
    <div className="space-y-2">
      <canvas
        ref={canvas}
        width={800}
        height={260}
        aria-label="Dibuje su firma"
        className="w-full touch-none rounded-lg border-2 border-dashed bg-white"
        style={{ aspectRatio: "800/260" }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          last.current = position(e);
          const c = e.currentTarget.getContext("2d")!;
          c.beginPath();
          c.moveTo(last.current.x, last.current.y);
          c.strokeStyle = "#15202b";
          c.lineWidth = 3;
          c.lineCap = "round";
          onChange(null);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const p = position(e),
            c = e.currentTarget.getContext("2d")!;
          distance.current += Math.hypot(
            p.x - last.current.x,
            p.y - last.current.y,
          );
          c.lineTo(p.x, p.y);
          c.stroke();
          last.current = p;
        }}
        onPointerUp={(e) => {
          drawing.current = false;
          if (distance.current > 35)
            onChange(e.currentTarget.toDataURL("image/png"));
        }}
        onPointerCancel={() => {
          drawing.current = false;
          onChange(null);
        }}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Dibuja con el dedo, lápiz o mouse.
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            canvas.current?.getContext("2d")?.clearRect(0, 0, 800, 260);
            distance.current = 0;
            onChange(null);
          }}
        >
          <Eraser className="mr-1 size-4" />
          Limpiar
        </Button>
      </div>
    </div>
  );
}

export function DailySignDialog({
  rows,
  saved,
  employee,
  busy,
  onClose,
  onConfirm,
}: {
  rows: DailyRow[];
  saved?: { id: string; signature_url: string } | null;
  employee: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (signature: {
    image?: string;
    savedId?: string;
    save: boolean;
  }) => Promise<void>;
}) {
  const [useSaved, setUseSaved] = useState(!!saved),
    [image, setImage] = useState<string | null>(null),
    [save, setSave] = useState(false),
    [consent, setConsent] = useState(false);
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {employee ? "Confirmar mis jornadas" : "Aprobar como supervisor"}
          </DialogTitle>
          <DialogDescription>
            La firma cubre únicamente los {rows.length} días seleccionados y los
            servicios que se muestran abajo.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs">
          {rows.map((r) => (
            <p className="mb-2" key={r.key}>
              {!employee && `${r.snapshot.employee.name} · `}
              {dailyDate(r.date)}:{" "}
              {Object.entries(SERVICE_LABELS)
                .filter(([key]) => r.services[key as keyof DailyServices])
                .map(([, label]) => label)
                .join(", ") || "Sin servicios consumidos"}
            </p>
          ))}
        </div>
        {saved && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useSaved}
              onChange={(e) => setUseSaved(e.target.checked)}
              disabled={busy}
            />
            Usar mi firma guardada
          </label>
        )}
        {useSaved && saved ? (
          <img
            alt="Mi firma guardada"
            src={saved.signature_url}
            className="h-28 w-full rounded-lg border bg-white object-contain"
          />
        ) : (
          <DailySignature onChange={setImage} />
        )}
        {employee && !useSaved && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={save}
              disabled={busy}
              onChange={(e) => setSave(e.target.checked)}
            />
            Guardar esta firma para próximas visitas
            {saved ? " (reemplaza la anterior)" : ""}
          </label>
        )}
        <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0"
            checked={consent}
            disabled={busy}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            {employee
              ? DAILY_CONSENT
              : "He revisado los días seleccionados, sus servicios y la conformidad del empleado, y los apruebo como supervisor."}
          </span>
        </label>
        <Button
          disabled={busy || !consent || !((useSaved && saved) || image)}
          onClick={() =>
            void onConfirm({
              image: useSaved ? undefined : image!,
              savedId: useSaved ? saved?.id : undefined,
              save,
            })
          }
        >
          <PenLine className="mr-2 size-4" />
          {busy
            ? "Guardando…"
            : employee
              ? "Firmar días seleccionados"
              : "Firmar y aprobar selección"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function DailyHistoryDialog({
  history,
  onClose,
  onExport,
}: {
  history: DailyHistory[];
  onClose: () => void;
  onExport?: (h: DailyHistory) => void;
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial del día</DialogTitle>
          <DialogDescription>
            Versiones conservadas de cada conformidad, devolución y aprobación.
          </DialogDescription>
        </DialogHeader>
        {!history.length && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay decisiones.
          </p>
        )}
        {history.map((h) => (
          <div key={h.id} className="space-y-2 rounded-lg border p-3 text-sm">
            <p className="font-semibold">
              {DAILY_STATUS[h.action]} · {dailyTime(h.occurred_at)}
            </p>
            <p>{h.actor_name}</p>
            <p className="whitespace-pre-line text-xs">
              {dailyScheduleText(h.snapshot)}
            </p>
            {h.reason && <p>{h.reason}</p>}
            {h.evidence?.employee_signature_url && (
              <img
                src={h.evidence.employee_signature_url}
                alt="Firma de esta versión"
                className="h-16 w-40 rounded border bg-white object-contain"
              />
            )}
            {onExport && (
              <Button size="sm" variant="outline" onClick={() => onExport(h)}>
                Exportar esta versión
              </Button>
            )}
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}
