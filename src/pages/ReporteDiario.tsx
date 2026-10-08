import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Download,
  FileCheck2,
  Link2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceActive } from "@/components/workspace/WorkspacePaneContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DailyHistoryDialog,
  DailyReportRows,
  DailySignDialog,
} from "@/components/daily-reports/DailyReportReview";
import {
  DAILY_STATUS,
  dailyDate,
  dailyRequest,
  dailyTime,
  historyRow,
  type DailyData,
  type DailyHistory,
  type DailyOptions,
  type DailyPublication,
  type DailyRow,
} from "@/lib/dailyReports";
import { downloadDailyReport } from "@/lib/dailyReportPdf";
import { colombiaInput, colombiaInputToISO } from "@/lib/payrollCorrections";
import { colombiaToday } from "@/lib/payrollControlCuts";

const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";
export default function ReporteDiario() {
  const { currentCompanyId: company, hasPermission, user } = useAuth();
  const active = useWorkspaceActive();
  const qc = useQueryClient();
  const [publicationId, setPublicationId] = useState(""),
    [page, setPage] = useState(0),
    [search, setSearch] = useState(""),
    [state, setState] = useState("all"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);
  const [selected, setSelected] = useState<Set<string>>(new Set()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [creating, setCreating] = useState(false),
    [signing, setSigning] = useState(false);
  const [history, setHistory] = useState<DailyHistory[] | null>(null),
    [shareUrl, setShareUrl] = useState(""),
    [reason, setReason] = useState(""),
    [supervisor, setSupervisor] = useState("");
  const [audit, setAudit] = useState<
    { action: string; occurred_at: string; details: unknown }[] | null
  >(null);
  const [form, setForm] = useState({
    center_id: "",
    supervisor_id: "",
    start_date: colombiaToday().slice(0, 8) + "01",
    end_date: colombiaToday(),
    expires_at: colombiaInput(
      new Date(Date.now() + 30 * 86400000).toISOString(),
    ),
  });
  const [formatCode, setFormatCode] = useState("GH FO 121"),
    [formatVersion, setFormatVersion] = useState("01");
  const retry = useRef<{
    key: string;
    id: string;
    signatureId?: string;
  } | null>(null);
  const options = useQuery({
    queryKey: ["daily-options", company],
    enabled: active && !!company,
    queryFn: () =>
      dailyRequest<DailyOptions>("options", { company_id: company }),
  });
  const publications = useQuery({
    queryKey: ["daily-publications", company],
    enabled: active && !!company,
    queryFn: () =>
      dailyRequest<DailyPublication[]>("list", { company_id: company }),
  });
  const reports = useQuery({
    queryKey: [
      "daily-rows",
      company,
      publicationId,
      page,
      debouncedSearch,
      state,
      from,
      to,
    ],
    enabled: active && !!company && !!publicationId,
    queryFn: () =>
      dailyRequest<DailyData>("rows", {
        publication_id: publicationId,
        offset: page * 25,
        search: debouncedSearch,
        state,
        from,
        to,
      }),
    staleTime: 0,
  });
  const publication = publications.data?.find((p) => p.id === publicationId);
  useEffect(() => {
    setPublicationId("");
    setPage(0);
    setSelected(new Set());
    setHistory(null);
    setShareUrl("");
    setCreating(false);
    setSigning(false);
  }, [company]);
  useEffect(() => {
    setSelected(new Set());
  }, [publicationId, page, search, state, from, to]);
  useEffect(() => {
    if (options.data) {
      setFormatCode(options.data.settings.format_code);
      setFormatVersion(options.data.settings.format_version);
    }
  }, [options.data]);
  useEffect(() => {
    setSupervisor(publication?.supervisor_id || "");
  }, [publication?.supervisor_id]);
  async function refresh() {
    setSelected(new Set());
    await qc.invalidateQueries({ queryKey: ["daily-rows", company] });
    await qc.invalidateQueries({ queryKey: ["daily-publications", company] });
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "No fue posible completar la operación.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }
  const filtered =
    reports.data?.rows.filter(
      (r) =>
        (state === "all" || r.status === state) &&
        (!from || r.date >= from) &&
        (!to || r.date <= to) &&
        `${r.snapshot.employee.name} ${r.snapshot.employee.document}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) || [];
  const chosen = filtered.filter((r) => selected.has(r.key));
  const canApprove =
    publication?.supervisor_id === user?.id &&
    hasPermission("reporte_diario", "approve");
  async function showLink(id = publicationId) {
    const link = await dailyRequest<{ token: string }>("link", {
      publication_id: id,
    });
    setShareUrl(`${window.location.origin}/reporte-diario/${link.token}`);
  }
  async function exportRows(employeeId?: string) {
    let offset = 0,
      result: DailyData,
      rows: DailyRow[] = [];
    do {
      result = await dailyRequest<DailyData>("export", {
        publication_id: publicationId,
        employee_id: employeeId,
        offset,
      });
      rows = rows.concat(result.rows);
      offset += 25;
    } while (result.has_more);
    await downloadDailyReport(result.publication, rows);
  }
  async function approve(signature: { image?: string }) {
    await run(async () => {
      const days = chosen.map((r) => ({
        employee_id: r.employee_id,
        date: r.date,
        version: r.version,
      }));
      const key = JSON.stringify({ days, signature });
      if (retry.current?.key !== key)
        retry.current = { key, id: crypto.randomUUID() };
      if (!retry.current.signatureId) {
        const asset = await dailyRequest<{ signature_id: string }>(
          "upload_signature",
          { publication_id: publicationId, image: signature.image },
        );
        retry.current.signatureId = asset.signature_id;
      }
      await dailyRequest("approved", {
        publication_id: publicationId,
        days,
        signature_id: retry.current.signatureId,
        consent: true,
        request_id: retry.current.id,
      });
      retry.current = null;
      setSigning(false);
      toast.success("Aprobación y firma registradas.");
      await refresh();
    });
  }
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="size-6 text-primary" />
            <h1 className="text-2xl font-bold">Reporte Diario</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Conformidad de jornadas, servicios y aprobación del supervisor.
          </p>
        </div>
        {hasPermission("reporte_diario", "create") && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 size-4" />
            Nueva publicación
          </Button>
        )}
      </header>
      {(error || options.error || publications.error || reports.error) && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error ||
            options.error?.message ||
            publications.error?.message ||
            reports.error?.message}
        </div>
      )}
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Label htmlFor="daily-publication">
              Centro y período publicados
            </Label>
            <select
              id="daily-publication"
              className={selectClass}
              value={publicationId}
              onChange={(e) => {
                setPublicationId(e.target.value);
                setPage(0);
                setFrom("");
                setTo("");
              }}
            >
              <option value="">Selecciona una publicación</option>
              {publications.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.center_name} · {dailyDate(p.start_date)} a{" "}
                  {dailyDate(p.end_date)}
                  {p.revoked
                    ? " · Revocada"
                    : new Date(p.expires_at).getTime() < Date.now()
                      ? " · Enlace vencido"
                      : ""}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void run(refresh)}
          >
            <RefreshCw className="mr-2 size-4" />
            Actualizar
          </Button>
        </div>
        {publications.isLoading && (
          <p role="status" className="text-sm">
            Cargando publicaciones…
          </p>
        )}
        {!publications.isLoading && !publications.data?.length && (
          <p className="text-sm text-muted-foreground">
            Crea una publicación para compartir el reporte del centro mediante
            enlace o QR.
          </p>
        )}
        {publication && (
          <>
            <div className="flex flex-wrap justify-between gap-3 text-sm">
              <p>
                Supervisor: <strong>{publication.supervisor_name}</strong>
              </p>
              <p>
                Acceso hasta: {dailyTime(publication.expires_at)}
                {publication.revoked && " · Revocado"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(hasPermission("reporte_diario", "create") ||
                hasPermission("reporte_diario", "update")) && (
                <Button
                  variant="outline"
                  disabled={busy || publication.revoked}
                  onClick={() => void run(() => showLink())}
                >
                  <Link2 className="mr-2 size-4" />
                  Enlace y QR
                </Button>
              )}
              {hasPermission("reporte_diario", "export") && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(() => exportRows())}
                >
                  <Download className="mr-2 size-4" />
                  PDF consolidado
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void run(async () =>
                    setAudit(
                      await dailyRequest("audit", {
                        publication_id: publicationId,
                      }),
                    ),
                  )
                }
              >
                Historial de publicación
              </Button>
            </div>
            {hasPermission("reporte_diario", "update") && (
              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Administrar enlace y supervisor
                </summary>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="min-w-60 flex-1">
                    <Label htmlFor="daily-supervisor">
                      Supervisor asignado
                    </Label>
                    <select
                      id="daily-supervisor"
                      className={selectClass}
                      value={supervisor}
                      onChange={(e) => setSupervisor(e.target.value)}
                    >
                      {options.data?.supervisors
                        .filter((s) => s.center_id === publication.center_id)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <Button
                    variant="outline"
                    disabled={
                      busy ||
                      !supervisor ||
                      supervisor === publication.supervisor_id
                    }
                    onClick={() =>
                      void run(async () => {
                        await dailyRequest("reassign", {
                          publication_id: publicationId,
                          supervisor_id: supervisor,
                        });
                        toast.success(
                          "Supervisor actualizado en esta publicación y períodos solapados.",
                        );
                        await refresh();
                      })
                    }
                  >
                    Reasignar supervisor
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  La reasignación también se aplica a publicaciones solapadas
                  del centro. Se conservan los autores de aprobaciones
                  anteriores.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await dailyRequest("rotate", {
                          publication_id: publicationId,
                        });
                        await refresh();
                        await showLink();
                      })
                    }
                  >
                    Regenerar enlace · 30 días
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busy || publication.revoked}
                    onClick={() =>
                      void run(async () => {
                        await dailyRequest("revoke", {
                          publication_id: publicationId,
                        });
                        setShareUrl("");
                        await refresh();
                      })
                    }
                  >
                    Revocar acceso
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Regenerar o revocar invalida el enlace anterior y sus
                  sesiones.
                </p>
              </details>
            )}
          </>
        )}
      </section>
      {publication && (
        <section className="space-y-4">
          <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-4">
            <Input
              aria-label="Buscar empleado"
              placeholder="Nombre o documento del empleado"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
            <select
              aria-label="Estado del reporte"
              className={selectClass}
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">Todos los estados</option>
              {Object.entries(DAILY_STATUS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              aria-label="Desde"
              type="date"
              min={publication.start_date}
              max={publication.end_date}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
              }}
            />
            <Input
              aria-label="Hasta"
              type="date"
              min={from || publication.start_date}
              max={publication.end_date}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(DAILY_STATUS).map(([key, label]) => {
              const count = filtered.filter((r) => r.status === key).length;
              return count ? (
                <span
                  key={key}
                  className="rounded-full border bg-card px-3 py-1"
                >
                  {label}: {count}
                </span>
              ) : null;
            })}
          </div>
          {hasPermission("reporte_diario", "export") && (
            <div className="flex flex-wrap gap-2">
              {[
                ...new Map(
                  filtered.map((r) => [
                    r.employee_id,
                    r.snapshot.employee.name,
                  ]),
                ).entries(),
              ].map(([id, name]) => (
                <Button
                  key={id}
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(() => exportRows(id))}
                >
                  <Download className="mr-1 size-3" />
                  PDF · {name}
                </Button>
              ))}
            </div>
          )}
          {canApprove && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={busy || !filtered.some((r) => r.status === "signed")}
                checked={
                  filtered.some((r) => r.status === "signed") &&
                  filtered
                    .filter((r) => r.status === "signed")
                    .every((r) => selected.has(r.key))
                }
                onChange={(e) =>
                  setSelected(
                    new Set(
                      e.target.checked
                        ? filtered
                            .filter((r) => r.status === "signed")
                            .slice(0, 367)
                            .map((r) => r.key)
                        : [],
                    ),
                  )
                }
              />
              Seleccionar pendientes del supervisor · máximo 367 por operación
            </label>
          )}
          {reports.isFetching ? (
            <p role="status">Cargando jornadas…</p>
          ) : (
            <DailyReportRows
              rows={filtered}
              selected={selected}
              disabled={busy}
              selectable={canApprove}
              onSelect={(key) =>
                setSelected((previous) => {
                  const next = new Set(previous);
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                })
              }
              onHistory={(row) =>
                void run(async () =>
                  setHistory(
                    await dailyRequest("history", {
                      publication_id: publicationId,
                      employee_id: row.employee_id,
                      date: row.date,
                    }),
                  ),
                )
              }
            />
          )}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={busy || page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm">
              Página {page + 1} · hasta 25 empleados por página
            </span>
            <Button
              variant="outline"
              disabled={busy || !reports.data?.has_more}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
          {canApprove && (
            <div className="sticky bottom-3 space-y-3 rounded-xl border bg-card p-4 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <strong>{chosen.length} días seleccionados</strong>
                <Button
                  disabled={busy || !chosen.length || chosen.length > 367}
                  onClick={() => setSigning(true)}
                >
                  Revisar, firmar y aprobar
                </Button>
              </div>
              <details>
                <summary className="cursor-pointer text-sm">
                  Devolver al empleado
                </summary>
                <textarea
                  className="mt-3 min-h-20 w-full rounded border bg-background p-3 text-sm"
                  aria-label="Motivo de devolución"
                  value={reason}
                  maxLength={2000}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Indica qué debe revisar el empleado o Nómina."
                />
                <Button
                  variant="outline"
                  disabled={
                    busy ||
                    !chosen.length ||
                    chosen.length > 367 ||
                    reason.trim().length < 5
                  }
                  onClick={() =>
                    void run(async () => {
                      const body = {
                        publication_id: publicationId,
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
                      await dailyRequest("returned", {
                        ...body,
                        request_id: retry.current.id,
                      });
                      retry.current = null;
                      setReason("");
                      toast.success(
                        "Días devueltos. Se solicitará nueva firma al empleado.",
                      );
                      await refresh();
                    })
                  }
                >
                  Registrar devolución
                </Button>
              </details>
            </div>
          )}
        </section>
      )}
      {hasPermission("reporte_diario", "update") && options.data && (
        <details className="rounded-xl border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Formato del informe de la empresa
          </summary>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="daily-code">Código</Label>
              <Input
                id="daily-code"
                value={formatCode}
                maxLength={40}
                onChange={(e) => setFormatCode(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="daily-format-version">Versión</Label>
              <Input
                id="daily-format-version"
                value={formatVersion}
                maxLength={15}
                onChange={(e) => setFormatVersion(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              disabled={busy || !formatCode.trim() || !formatVersion.trim()}
              onClick={() =>
                void run(async () => {
                  await dailyRequest("settings", {
                    company_id: company,
                    center_id: options.data.centers[0]?.id,
                    format_code: formatCode,
                    format_version: formatVersion,
                  });
                  await refresh();
                  toast.success("Formato actualizado.");
                })
              }
            >
              Guardar formato
            </Button>
          </div>
        </details>
      )}
      {creating && (
        <Dialog open onOpenChange={(v) => !v && !busy && setCreating(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publicar Reporte Diario</DialogTitle>
              <DialogDescription>
                El empleado verá sus jornadas de este centro y período. Solo
                podrá firmar las aprobadas internamente.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const created = await dailyRequest<DailyPublication>(
                    "create",
                    {
                      company_id: company,
                      ...form,
                      expires_at: colombiaInputToISO(form.expires_at),
                    },
                  );
                  setCreating(false);
                  await refresh();
                  setPublicationId(created.id);
                  setPage(0);
                  setShareUrl(
                    `${window.location.origin}/reporte-diario/${created.token}`,
                  );
                });
              }}
            >
              <div>
                <Label htmlFor="daily-center">Centro de operación</Label>
                <select
                  id="daily-center"
                  className={selectClass}
                  required
                  value={form.center_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      center_id: e.target.value,
                      supervisor_id: "",
                    }))
                  }
                >
                  <option value="">Selecciona un centro</option>
                  {options.data?.centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="daily-start">Desde</Label>
                  <Input
                    id="daily-start"
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, start_date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="daily-end">Hasta</Label>
                  <Input
                    id="daily-end"
                    type="date"
                    required
                    min={form.start_date}
                    value={form.end_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, end_date: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="daily-new-supervisor">
                  Supervisor responsable
                </Label>
                <select
                  id="daily-new-supervisor"
                  className={selectClass}
                  required
                  value={form.supervisor_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supervisor_id: e.target.value }))
                  }
                >
                  <option value="">Selecciona un supervisor</option>
                  {options.data?.supervisors
                    .filter((s) => s.center_id === form.center_id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Debe tener permiso de aprobación de Reporte Diario y acceso al
                  centro.
                </p>
              </div>
              <div>
                <Label htmlFor="daily-expiry">
                  Vencimiento del acceso · Colombia
                </Label>
                <Input
                  id="daily-expiry"
                  type="datetime-local"
                  required
                  value={form.expires_at}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expires_at: e.target.value }))
                  }
                />
              </div>
              <Button className="w-full" disabled={busy || !form.supervisor_id}>
                {busy ? "Publicando…" : "Crear publicación y generar QR"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {!!shareUrl && (
        <Dialog open onOpenChange={(v) => !v && setShareUrl("")}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Compartir acceso</DialogTitle>
              <DialogDescription>
                Comparte este enlace o publica el QR para que cada empleado
                consulte su información.
              </DialogDescription>
            </DialogHeader>
            <div className="mx-auto rounded-xl bg-white p-4">
              <QRCodeSVG value={shareUrl} size={224} level="M" />
            </div>
            <Input aria-label="Enlace público" readOnly value={shareUrl} />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  void run(async () => {
                    await navigator.clipboard.writeText(shareUrl);
                    toast.success("Enlace copiado.");
                  })
                }
              >
                <Copy className="mr-2 size-4" />
                Copiar enlace
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void run(async () => {
                    const url = await QRCode.toDataURL(shareUrl, {
                      width: 1200,
                      margin: 4,
                    });
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "Reporte-Diario-QR.png";
                    link.click();
                  })
                }
              >
                <Download className="mr-2 size-4" />
                Descargar QR
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {signing && (
        <DailySignDialog
          rows={chosen}
          employee={false}
          busy={busy}
          onClose={() => setSigning(false)}
          onConfirm={approve}
        />
      )}
      {history && (
        <DailyHistoryDialog
          history={history}
          onClose={() => setHistory(null)}
          onExport={
            hasPermission("reporte_diario", "export")
              ? (h) =>
                  void run(async () => {
                    const entries = await dailyRequest<DailyHistory[]>(
                      "export_history",
                      {
                        publication_id: publicationId,
                        employee_id: h.employee_id,
                        date: h.work_date,
                      },
                    );
                    const found = entries.find((v) => v.id === h.id);
                    if (!found || !publication)
                      throw new Error("Versión no disponible");
                    await downloadDailyReport(
                      publication,
                      [historyRow(found)],
                      true,
                    );
                  })
              : undefined
          }
        />
      )}
      {audit && (
        <Dialog open onOpenChange={(v) => !v && setAudit(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Historial de publicación</DialogTitle>
              <DialogDescription>
                Creación, cambios de responsable y gestión del acceso.
              </DialogDescription>
            </DialogHeader>
            {audit.map((a, i) => (
              <div key={i} className="rounded border p-3 text-sm">
                <p>
                  {(
                    {
                      create: "Creación",
                      rotate: "Enlace regenerado",
                      revoke: "Acceso revocado",
                      reassign: "Supervisor reasignado",
                    } as Record<string, string>
                  )[a.action] || a.action}{" "}
                  · {dailyTime(a.occurred_at)}
                </p>
              </div>
            ))}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
