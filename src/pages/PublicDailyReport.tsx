import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ClipboardCheck,
  Download,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DailyHistoryDialog,
  DailyReportRows,
  DailySignDialog,
} from "@/components/daily-reports/DailyReportReview";
import {
  birthDateFromParts,
  dailyDate,
  dailyRequest,
  DailyReportError,
  historyRow,
  type DailyData,
  type DailyHistory,
  type DailyPublication,
  type DailyRow,
  type DailyServices,
} from "@/lib/dailyReports";
import { downloadDailyReport } from "@/lib/dailyReportPdf";

const selectClass = "h-11 w-full rounded-md border bg-background px-3 text-sm";
const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
export default function PublicDailyReport() {
  const { token = "" } = useParams();
  const [publication, setPublication] = useState<DailyPublication | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [session, setSession] = useState(""),
    [data, setData] = useState<DailyData | null>(null),
    [documentType, setDocumentType] = useState("CC"),
    [document, setDocument] = useState("");
  const [year, setYear] = useState(""),
    [month, setMonth] = useState(""),
    [day, setDay] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set()),
    [services, setServices] = useState<Record<string, DailyServices>>({}),
    [signing, setSigning] = useState(false),
    [reason, setReason] = useState("");
  const [history, setHistory] = useState<DailyHistory[] | null>(null),
    [filter, setFilter] = useState("all");
  const retry = useRef<{
    key: string;
    id: string;
    signatureId?: string;
  } | null>(null);
  const expiry = useRef<ReturnType<typeof setTimeout>>();
  const birth = birthDateFromParts(year, month, day);
  function clearSession() {
    setSession("");
    setData(null);
    setSelected(new Set());
    setServices({});
    setSigning(false);
    setHistory(null);
    retry.current = null;
    if (expiry.current) clearTimeout(expiry.current);
  }
  useEffect(() => {
    let active = true;
    clearSession();
    setPublication(null);
    setLoading(true);
    setError("");
    dailyRequest<{ publication: DailyPublication }>("context", { token }, false)
      .then((r) => {
        if (active) setPublication(r.publication);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (expiry.current) clearTimeout(expiry.current);
    };
    // Session belongs exclusively to this token, never to the administrative login.
  }, [token]);
  function failed(e: unknown) {
    const message =
      e instanceof Error ? e.message : "No fue posible completar la operación.";
    setError(message);
    if (e instanceof DailyReportError && e.code === "session") clearSession();
    toast.error(message);
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      failed(e);
    } finally {
      setBusy(false);
    }
  }
  async function refresh(activeSession = session) {
    const result = await dailyRequest<DailyData>(
      "rows",
      { session: activeSession },
      false,
    );
    setData(result);
    setSelected(new Set());
    setServices({});
  }
  const visible =
    data?.rows.filter(
      (r) =>
        filter === "all" ||
        (filter === "pending" && r.can_sign) ||
        (filter === "approved" && r.status === "approved"),
    ) || [];
  const chosen = (data?.rows || [])
    .filter((r) => selected.has(r.key))
    .map((r) => ({ ...r, services: services[r.key] || r.services }));
  async function sign(signature: {
    image?: string;
    savedId?: string;
    save: boolean;
  }) {
    await run(async () => {
      const days = chosen.map((r) => ({
        employee_id: r.employee_id,
        date: r.date,
        version: r.version,
        services: r.services,
      }));
      const key = JSON.stringify({ days, signature });
      if (retry.current?.key !== key)
        retry.current = { key, id: crypto.randomUUID() };
      let signatureId = signature.savedId || retry.current.signatureId;
      if (!signatureId) {
        const result = await dailyRequest<{ signature_id: string }>(
          "upload_signature",
          { session, image: signature.image, save: signature.save },
          false,
        );
        signatureId = result.signature_id;
        retry.current.signatureId = signatureId;
      }
      await dailyRequest(
        "signed",
        {
          session,
          days,
          signature_id: signatureId,
          consent: true,
          request_id: retry.current.id,
        },
        false,
      );
      setSigning(false);
      retry.current = null;
      toast.success(
        "Tu firma quedó registrada. El supervisor revisará los días seleccionados.",
      );
      await refresh();
    });
  }
  return (
    <main className="min-h-screen bg-muted/30 pb-10">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <header className="mb-6 flex items-center gap-3">
          {publication?.logo_url ? (
            <img
              src={publication.logo_url}
              alt={publication.company_name}
              className="h-12 max-w-44 rounded bg-white p-1 object-contain"
            />
          ) : (
            <span className="rounded-xl bg-primary p-3 text-primary-foreground">
              <ClipboardCheck className="size-7" />
            </span>
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {publication?.company_name || "Portal de colaboradores"}
            </p>
            <h1 className="text-2xl font-bold">Reporte Diario</h1>
          </div>
        </header>
        {loading && (
          <p role="status" className="rounded-xl border bg-card p-8">
            Validando enlace…
          </p>
        )}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {error}
          </div>
        )}
        {publication && (
          <div className="mb-5 rounded-xl border bg-card p-4">
            <p className="font-semibold">{publication.center_name}</p>
            <p className="text-sm text-muted-foreground">
              {dailyDate(publication.start_date)} al{" "}
              {dailyDate(publication.end_date)}
            </p>
          </div>
        )}
        {publication && !session && (
          <form
            className="mx-auto max-w-lg space-y-5 rounded-xl border bg-card p-5 sm:p-7"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const result = await dailyRequest<{
                  session: string;
                  expires_in_seconds: number;
                }>(
                  "identify",
                  {
                    token,
                    document_type: documentType,
                    document_number: document.trim(),
                    birth_date: birth,
                  },
                  false,
                );
                await refresh(result.session);
                setSession(result.session);
                setDocument("");
                setYear("");
                setMonth("");
                setDay("");
                expiry.current = setTimeout(() => {
                  clearSession();
                  setError("La sesión expiró. Vuelve a identificarte.");
                }, result.expires_in_seconds * 1000);
              });
            }}
          >
            <div>
              <h2 className="text-xl font-semibold">
                Revisa y confirma tus jornadas
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Ingresa los datos registrados en la empresa. Solo los empleados
                activos pueden acceder.
              </p>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-3">
              <div>
                <Label htmlFor="daily-document-type">Tipo</Label>
                <select
                  id="daily-document-type"
                  className={selectClass}
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  {["CC", "CE", "TI", "PA", "PEP", "PPT", "NIT"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="daily-document">Documento</Label>
                <Input
                  id="daily-document"
                  className="h-11"
                  value={document}
                  maxLength={40}
                  autoComplete="off"
                  onChange={(e) => setDocument(e.target.value)}
                  required
                />
              </div>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">
                Fecha de nacimiento
              </legend>
              <div className="grid grid-cols-[0.8fr_1.3fr_1fr] gap-2">
                <select
                  aria-label="Día de nacimiento"
                  className={selectClass}
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  required
                >
                  <option value="">Día</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Mes de nacimiento"
                  className={selectClass}
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  required
                >
                  <option value="">Mes</option>
                  {months.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label="Año de nacimiento"
                  className="h-11"
                  placeholder="Año"
                  inputMode="numeric"
                  maxLength={4}
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
              {year.length === 4 && month && day && !birth && (
                <p className="mt-2 text-xs text-destructive">
                  Revisa la fecha de nacimiento.
                </p>
              )}
            </fieldset>
            <Button
              className="h-11 w-full"
              disabled={busy || !birth || !document.trim()}
            >
              {busy ? "Validando…" : "Consultar mi reporte"}
            </Button>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4" />
              Tu sesión permite consultar únicamente tu información.
            </p>
          </form>
        )}
        {session && data && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {data.rows[0]?.snapshot.employee.name || "Mis jornadas"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Selecciona los días que revisaste y confirma los servicios
                  recibidos.
                </p>
              </div>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await dailyRequest("logout", { session }, false);
                    clearSession();
                  })
                }
              >
                <LogOut className="mr-2 size-4" />
                Salir
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Estado de mis jornadas"
                className={`${selectClass} max-w-60`}
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setSelected(new Set());
                }}
              >
                <option value="all">Todos los días</option>
                <option value="pending">Disponibles para firmar</option>
                <option value="approved">Aprobados por supervisor</option>
              </select>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void run(() => refresh())}
              >
                <RefreshCw className="mr-2 size-4" />
                Actualizar
              </Button>
              <Button
                variant="outline"
                disabled={busy || !data.rows.length}
                onClick={() =>
                  void run(async () => {
                    const result = await dailyRequest<DailyData>(
                      "export",
                      { session },
                      false,
                    );
                    await downloadDailyReport(result.publication, result.rows);
                  })
                }
              >
                <Download className="mr-2 size-4" />
                Mi PDF
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={busy || !visible.some((r) => r.can_sign)}
                checked={
                  visible.some((r) => r.can_sign) &&
                  visible
                    .filter((r) => r.can_sign)
                    .every((r) => selected.has(r.key))
                }
                onChange={(e) =>
                  setSelected(
                    new Set(
                      e.target.checked
                        ? visible.filter((r) => r.can_sign).map((r) => r.key)
                        : [],
                    ),
                  )
                }
              />
              Seleccionar días disponibles de esta vista
            </label>
            {chosen.length > 0 && (
              <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm">
                <span className="text-sm font-medium">
                  {chosen.length} días seleccionados
                </span>
                <Button disabled={busy} onClick={() => setSigning(true)}>
                  Firmar selección
                </Button>
              </div>
            )}
            <DailyReportRows
              employee
              rows={visible}
              selected={selected}
              onSelect={(key) =>
                setSelected((previous) => {
                  const next = new Set(previous);
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                })
              }
              services={services}
              onServices={(key, value) =>
                setServices((s) => ({ ...s, [key]: value }))
              }
              disabled={busy}
              onHistory={(row) =>
                void run(async () =>
                  setHistory(
                    await dailyRequest<DailyHistory[]>(
                      "history",
                      { session, date: row.date },
                      false,
                    ),
                  ),
                )
              }
            />
            {data.saved_signature && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm">
                <span>
                  Tienes una firma guardada. Puedes reutilizarla o dibujar otra
                  al confirmar.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await dailyRequest(
                        "forget_signature",
                        { session },
                        false,
                      );
                      await refresh();
                      toast.success(
                        "Firma eliminada para usos futuros. Las firmas de reportes anteriores se conservan.",
                      );
                    })
                  }
                >
                  Eliminar firma guardada
                </Button>
              </div>
            )}
            <div className="sticky bottom-3 space-y-3 rounded-xl border bg-card p-4 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <strong>{chosen.length} días seleccionados</strong>
                <Button
                  disabled={busy || !chosen.length}
                  onClick={() => setSigning(true)}
                >
                  Revisar y firmar selección
                </Button>
              </div>
              <details>
                <summary className="cursor-pointer text-sm">
                  No estoy de acuerdo con los días seleccionados
                </summary>
                <textarea
                  className="mt-3 min-h-20 w-full rounded-md border bg-background p-3 text-sm"
                  aria-label="Motivo del desacuerdo"
                  placeholder="Explica qué debe revisar Nómina (mínimo 5 caracteres)."
                  maxLength={2000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={busy || !chosen.length || reason.trim().length < 5}
                  onClick={() =>
                    void run(async () => {
                      const body = {
                        session,
                        days: chosen.map((r) => ({
                          employee_id: r.employee_id,
                          date: r.date,
                          version: r.version,
                        })),
                        reason: reason.trim(),
                      };
                      const key = JSON.stringify(body);
                      if (retry.current?.key !== key)
                        retry.current = { key, id: crypto.randomUUID() };
                      await dailyRequest(
                        "disagreed",
                        { ...body, request_id: retry.current.id },
                        false,
                      );
                      retry.current = null;
                      setReason("");
                      toast.success("Desacuerdo registrado para revisión.");
                      await refresh();
                    })
                  }
                >
                  Reportar desacuerdo
                </Button>
              </details>
            </div>
          </div>
        )}
        {signing && data && (
          <DailySignDialog
            rows={chosen}
            saved={data.saved_signature}
            employee
            busy={busy}
            onClose={() => setSigning(false)}
            onConfirm={sign}
          />
        )}
        {history && (
          <DailyHistoryDialog
            history={history}
            onClose={() => setHistory(null)}
            onExport={(h) =>
              void run(async () => {
                const latest = await dailyRequest<DailyHistory[]>(
                  "history",
                  { session, date: h.work_date },
                  false,
                );
                const found = latest.find((v) => v.id === h.id);
                if (!found || !publication)
                  throw new Error("Versión no disponible.");
                await downloadDailyReport(
                  publication,
                  [historyRow(found)],
                  true,
                );
              })
            }
          />
        )}
      </div>
    </main>
  );
}
