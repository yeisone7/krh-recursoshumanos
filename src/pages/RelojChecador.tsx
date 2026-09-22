import { useState } from "react";
import { Clock3, Download, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOperationCenters } from "@/hooks/useCompanies";
import {
  useTimeClockCorrections,
  useTimeClockDays,
  useTimeClockEvents,
  useTimeClockPoints,
} from "@/hooks/useTimeClock";
import { TIME_CLOCK_ACTION_LABELS, type TimeClockDay } from "@/types/timeClock";
import {
  attendanceDate,
  attendanceDateTime,
  attendanceTime,
  duration,
  incidentLabels,
  scheduledMinutes,
  sourceLabels,
  statusLabels,
} from "@/lib/timeClock";
import { ClockAccess } from "@/components/time-clock/ClockAccess";
import { ClockTracking } from "@/components/time-clock/ClockTracking";
import {
  PointsSettings,
  SupervisedPunch,
} from "@/components/time-clock/ClockManagement";
import {
  ClockCorrections,
  ClockDayDetail,
} from "@/components/time-clock/ClockReview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const name = (day: TimeClockDay) =>
  `${day.employees_v2?.first_name || ""} ${day.employees_v2?.last_name || ""}`.trim();
const selectClass = "h-10 min-w-0 rounded-md border bg-background px-3 text-sm";

export default function RelojChecador() {
  const { currentCompanyId, canApprove, canExport, canCreate, canUpdate } =
    useAuth();
  const today = attendanceDate();
  const [tab, setTab] = useState("today");
  const [from, setFrom] = useState(
    attendanceDate(new Date(Date.now() - 7 * 86400000)),
  );
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState("");
  const [center, setCenter] = useState("all");
  const [point, setPoint] = useState("all");
  const [source, setSource] = useState("all");
  const [selectedDay, setSelectedDay] = useState<TimeClockDay | null>(null);
  const [supervised, setSupervised] = useState(false);
  const range = tab === "today" ? { from: today, to: today } : { from, to };
  const {
    data: days = [],
    isLoading,
    error,
  } = useTimeClockDays(range.from, range.to);
  const {
    data: events = [],
    error: eventsError,
    isLoading: loadingEvents,
  } = useTimeClockEvents(100, undefined, range);
  const { data: corrections = [], error: correctionsError } =
    useTimeClockCorrections();
  const { data: points = [], error: pointsError } = useTimeClockPoints();
  const { data: centers = [] } = useOperationCenters();
  const filteredEvents = events.filter(
    (ev) =>
      `${ev.employees_v2?.first_name} ${ev.employees_v2?.last_name} ${ev.employees_v2?.document_number}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (center === "all" || ev.operation_center_id === center) &&
      (point === "all" || ev.point_id === point) &&
      (source === "all" || ev.source === source),
  );
  const matchingDays = new Set(filteredEvents.map((ev) => ev.day_id));
  const filteredDays = days.filter(
    (d) =>
      `${name(d)} ${d.employees_v2?.document_number}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (center === "all" || d.operation_center_id === center) &&
      ((point === "all" && source === "all") || matchingDays.has(d.id)),
  );
  const incidences = filteredDays.filter((d) =>
    d.incident_codes.some((code) => code !== "justified_absence"),
  );
  const filteredCorrections = corrections.filter(
    (c) =>
      attendanceDate(new Date(c.requested_at)) >= range.from &&
      attendanceDate(new Date(c.requested_at)) <= range.to &&
      (center === "all" || c.operation_center_id === center) &&
      `${c.employees_v2?.first_name} ${c.employees_v2?.last_name} ${c.employees_v2?.document_number}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const stats = [
    ["Programados", filteredDays.filter((d) => d.expected_start).length],
    ["Presentes", filteredDays.filter((d) => d.first_clock_in).length],
    ["Trabajando", filteredDays.filter((d) => d.status === "open").length],
    ["En pausa", filteredDays.filter((d) => d.status === "on_break").length],
    [
      "Pendientes de entrada",
      filteredDays.filter((d) => d.status === "scheduled").length,
    ],
    ["Por revisar", incidences.length],
  ];
  async function exportReport(pdf: boolean) {
    try {
      const rows = filteredDays.map((d) => ({
        Fecha: d.work_date,
        Empleado: name(d),
        Documento: d.employees_v2?.document_number || "",
        Centro: d.operation_centers?.name || "",
        Horario: d.schedule_name || "",
        Entrada: attendanceTime(d.first_clock_in),
        Salida: attendanceTime(d.last_clock_out),
        "Minutos programados": scheduledMinutes(d),
        "Minutos trabajados": d.worked_minutes,
        "Minutos pausa": d.break_minutes,
        "Diferencia (min)":
          d.status === "complete" && d.first_clock_in
            ? d.worked_minutes - scheduledMinutes(d)
            : "",
        Estado: statusLabels[d.status],
        Incidencias: d.incident_codes
          .map((c) => incidentLabels[c] || c)
          .join(", "),
      }));
      if (!pdf) {
        const XLSX = await import("xlsx");
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          book,
          XLSX.utils.json_to_sheet(rows),
          "Jornadas",
        );
        XLSX.utils.book_append_sheet(
          book,
          XLSX.utils.json_to_sheet(
            filteredEvents.map((e) => ({
              Empleado: `${e.employees_v2?.first_name} ${e.employees_v2?.last_name}`,
              Documento: e.employees_v2?.document_number,
              Fecha: attendanceDateTime(e.occurred_at),
              Acción: TIME_CLOCK_ACTION_LABELS[e.action],
              Centro: e.operation_centers?.name,
              Punto: points.find((p) => p.id === e.point_id)?.name || "",
              Origen: sourceLabels[e.source],
              Identificación:
                e.identity_method === "pin"
                  ? "Cédula y PIN"
                  : e.identity_method === "supervisor"
                    ? "Supervisor"
                    : "Portal",
              Observación: e.supervisor_reason || "",
            })),
          ),
          "Marcaciones",
        );
        XLSX.writeFile(book, `asistencia_${range.from}_${range.to}.xlsx`);
        return;
      }
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape" });
      let y = 0;
      const heading = () => {
        doc.setFontSize(16);
        doc.text("Reporte de asistencia", 14, 18);
        doc.setFontSize(9);
        doc.text(
          `${range.from} a ${range.to} · Horas informativas, sin incidencia en nómina`,
          14,
          25,
        );
        y = 37;
      };
      heading();
      for (const r of rows) {
        const lines = doc.splitTextToSize(
          `${r.Empleado} · ${r.Documento} · ${r.Fecha}\n${r.Centro} · ${r.Horario} · ${r.Estado}\nEntrada ${r.Entrada} / Salida ${r.Salida} · Programado ${duration(r["Minutos programados"])} · Trabajado ${duration(r["Minutos trabajados"])} · Pausas ${duration(r["Minutos pausa"])} · Diferencia ${r["Diferencia (min)"]} min${r.Incidencias ? `\n${r.Incidencias}` : ""}`,
          267,
        );
        if (y + lines.length * 5 > 192) {
          doc.addPage();
          heading();
        }
        doc.text(lines, 14, y);
        y += lines.length * 5 + 7;
      }
      if (!rows.length) doc.text("No hay jornadas con estos filtros.", 14, y);
      doc.save(`asistencia_${range.from}_${range.to}.pdf`);
    } catch {
      toast.error("No se pudo exportar el reporte. Intenta nuevamente.");
    }
  }
  if (!currentCompanyId)
    return (
      <p className="p-8">
        Selecciona una organización para gestionar la asistencia.
      </p>
    );
  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Operaciones / RRHH
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Clock3 className="h-8 w-8 text-primary" /> Reloj de Asistencia
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Publica un QR, registra la jornada y revisa sus novedades.
          </p>
        </div>
        {canCreate("reloj_checador") && (
          <Button variant="outline" onClick={() => setSupervised(true)}>
            Marcación supervisada
          </Button>
        )}
      </header>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value);
          setPoint("all");
          setSource("all");
        }}
        className="space-y-5"
      >
        <TabsList className="flex h-auto justify-start overflow-x-auto">
          <TabsTrigger value="today">Hoy</TabsTrigger>
          <TabsTrigger value="events">Marcaciones</TabsTrigger>
          <TabsTrigger value="incidents">Incidencias</TabsTrigger>
          {(canUpdate("reloj_checador") || canCreate("reloj_checador")) && (
            <TabsTrigger value="points">Puntos y QR</TabsTrigger>
          )}
          {canUpdate("reloj_checador") && (
            <TabsTrigger value="access">Accesos</TabsTrigger>
          )}
        </TabsList>
        {["today", "events", "incidents"].includes(tab) && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                aria-label="Buscar empleado o documento"
                placeholder="Empleado o documento"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                aria-label="Filtrar centro"
                className={selectClass}
                value={center}
                onChange={(e) => {
                  setCenter(e.target.value);
                  setPoint("all");
                }}
              >
                <option value="all">Todos los centros</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {tab !== "today" && (
                <>
                  <Input
                    aria-label="Desde"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                  <Input
                    aria-label="Hasta"
                    type="date"
                    value={to}
                    min={from}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </>
              )}
            </div>
            {tab === "events" && (
              <div className="flex flex-wrap gap-3">
                <select
                  aria-label="Filtrar punto"
                  className={selectClass}
                  value={point}
                  onChange={(e) => setPoint(e.target.value)}
                >
                  <option value="all">Todos los puntos</option>
                  {points
                    .filter(
                      (p) =>
                        center === "all" || p.operation_center_id === center,
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <select
                  aria-label="Filtrar origen"
                  className={selectClass}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="all">Todos los orígenes</option>
                  {Object.entries(sourceLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(error || eventsError || correctionsError || pointsError) && (
              <p role="alert" className="text-sm text-red-700">
                No se pudo cargar parte de la asistencia. Actualiza la página
                antes de exportar.
              </p>
            )}
            {from > to && tab !== "today" && (
              <p role="alert" className="text-sm text-red-700">
                La fecha inicial debe ser anterior a la final.
              </p>
            )}
            {canExport("reloj_checador") && tab !== "incidents" && (
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    isLoading || loadingEvents || !!error || !!eventsError
                  }
                  onClick={() => exportReport(true)}
                >
                  <FileText className="mr-2 h-4 w-4" /> PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    isLoading || loadingEvents || !!error || !!eventsError
                  }
                  onClick={() => exportReport(false)}
                >
                  <Download className="mr-2 h-4 w-4" /> Excel
                </Button>
              </div>
            )}
          </div>
        )}
        <TabsContent value="today" className="space-y-5">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
            {stats.map(([label, value]) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-2 text-3xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <DayTable
            days={filteredDays}
            loading={isLoading}
            onSelect={setSelectedDay}
          />
        </TabsContent>
        <TabsContent value="events" className="space-y-5">
          <DayTable
            days={filteredDays}
            loading={isLoading}
            onSelect={setSelectedDay}
          />
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="text-lg font-semibold">Registro de marcaciones</h2>
              {!filteredEvents.length && (
                <p className="text-sm text-muted-foreground">
                  Sin marcaciones con estos filtros.
                </p>
              )}
              <div className="max-h-[560px] overflow-y-auto">
                {filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b py-3"
                  >
                    <div>
                      <p className="font-semibold">
                        {ev.employees_v2?.first_name}{" "}
                        {ev.employees_v2?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {points.find((p) => p.id === ev.point_id)?.name ||
                          ev.operation_centers?.name}{" "}
                        · {attendanceDateTime(ev.occurred_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {TIME_CLOCK_ACTION_LABELS[ev.action]}
                      </p>
                      <Badge variant="outline">{sourceLabels[ev.source]}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="incidents" className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Diferencias informativas. Las posibles ausencias requieren revisión
            y no generan descuentos de nómina.
          </p>
          <DayTable
            days={incidences}
            loading={isLoading}
            onSelect={setSelectedDay}
          />
          <ClockCorrections
            items={filteredCorrections}
            canApprove={canApprove("reloj_checador")}
          />
        </TabsContent>
        {canUpdate("reloj_checador") && (
          <>
            <TabsContent value="points" className="space-y-5">
              <PointsSettings points={points} />
              <ClockTracking />
            </TabsContent>
            <TabsContent value="access">
              <ClockAccess />
            </TabsContent>
          </>
        )}
        {!canUpdate("reloj_checador") && canCreate("reloj_checador") && (
          <TabsContent value="points">
            <div className="grid gap-3 sm:grid-cols-2">
              {points
                .filter((p) => p.is_active)
                .map((p) => (
                  <Card key={p.id}>
                    <CardContent className="space-y-3 p-5">
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.operation_centers?.name}
                      </p>
                      <Button
                        onClick={() =>
                          window.open(
                            `/reloj-checador/pantalla/${p.id}`,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        Abrir pantalla QR
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
      <ClockDayDetail day={selectedDay} onClose={() => setSelectedDay(null)} />
      <Dialog open={supervised} onOpenChange={setSupervised}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Marcación supervisada</DialogTitle>
          </DialogHeader>
          {supervised && <SupervisedPunch />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DayTable({
  days,
  loading,
  onSelect,
}: {
  days: TimeClockDay[];
  loading: boolean;
  onSelect: (day: TimeClockDay) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <p className="p-8 text-center">Cargando jornadas…</p>
        ) : !days.length ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No hay jornadas con estos filtros. Revisa la activación del
            seguimiento en Puntos y QR.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  {[
                    "Empleado / fecha",
                    "Centro / horario",
                    "Entrada / salida",
                    "Programado",
                    "Trabajado / pausas",
                    "Diferencia",
                    "Estado",
                    "Detalle",
                  ].map((h) => (
                    <th key={h} className="p-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="p-3">
                      <p className="font-semibold">{name(d)}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.employees_v2?.document_number} · {d.work_date}
                      </p>
                    </td>
                    <td className="p-3">
                      <p>{d.operation_centers?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.schedule_name || "Sin horario"}
                      </p>
                    </td>
                    <td className="p-3">
                      {attendanceTime(d.first_clock_in)} /{" "}
                      {attendanceTime(d.last_clock_out)}
                    </td>
                    <td className="p-3">{duration(scheduledMinutes(d))}</td>
                    <td className="p-3">
                      {duration(d.worked_minutes)}
                      <p className="text-xs text-muted-foreground">
                        Pausa: {duration(d.break_minutes)}
                      </p>
                    </td>
                    <td className="p-3">
                      {d.status === "complete" && d.first_clock_in
                        ? `${d.worked_minutes >= scheduledMinutes(d) ? "+" : "-"}${duration(d.worked_minutes - scheduledMinutes(d))}`
                        : "—"}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{statusLabels[d.status]}</Badge>
                      {d.incident_codes.map((c) => (
                        <p key={c} className="mt-1 text-xs text-amber-700">
                          {incidentLabels[c] || c}
                        </p>
                      ))}
                    </td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelect(d)}
                      >
                        Ver jornada
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
