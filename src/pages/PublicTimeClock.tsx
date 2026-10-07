import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Camera, CheckCircle2, Clock3, Fingerprint, Loader2, LogOut, MapPin, RefreshCw, UserRound } from "lucide-react";
import "./PublicTimeClock.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutomaticPhotoCapture } from "@/components/time-clock/AutomaticPhotoCapture";
import { publicClock } from "@/lib/timeClockApi";
import {
  attendanceDate,
  attendanceDateTime,
  availableActions,
  bogotaInputToISO,
} from "@/lib/timeClock";
import { getCurrentPosition } from "@/hooks/useTimeClock";
import {
  TIME_CLOCK_ACTION_LABELS,
  type TimeClockAction,
} from "@/types/timeClock";

interface Context {
  challenge: string;
  company: string;
  horizontal_logo_url?: string | null;
  point: string;
  center: string;
  expires_at: string;
  require_clock_in_photo: boolean;
}
interface Identity {
  session: string;
  must_change: boolean;
  name: string;
  expires_at: string;
}
interface Receipt {
  event_id: string;
  occurred_at: string;
  action: TimeClockAction;
}
interface History {
  last_action: TimeClockAction | null;
  require_break_punches: boolean;
  require_clock_in_photo: boolean;
  events: {
    id: string;
    action: TimeClockAction;
    occurred_at: string;
    supersedes_event_id: string | null;
    work_date: string;
  }[];
  corrections: {
    id: string;
    requested_action: TimeClockAction;
    requested_at: string;
    status: string;
    reason: string;
    review_notes: string | null;
  }[];
}

export default function PublicTimeClock() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const linkToken = params.get("token") || token || "";
  const point = params.get("point");
  const [context, setContext] = useState<Context | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [document, setDocument] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<"punch" | "history">("punch");
  const [attempt, setAttempt] = useState(0);
  const [action, setAction] = useState<TimeClockAction>("clock_in");
  const [dateTime, setDateTime] = useState("");
  const [workDate, setWorkDate] = useState(attendanceDate());
  const [reason, setReason] = useState("");
  const [eventId, setEventId] = useState("");
  const [cameraAction, setCameraAction] = useState<TimeClockAction | null>(null);
  const pendingPunch = useRef<{ key: string; action: TimeClockAction } | null>(
    null,
  );
  const inflight = useRef(false);
  const [now, setNow] = useState(() => new Date());
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const tag = window.document.createElement("meta");
    tag.name = "referrer";
    tag.content = "no-referrer";
    window.document.head.appendChild(tag);
    return () => tag.remove();
  }, []);
  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError("");
    setCameraAction(null);
    setContext(null);
    publicClock<Context>("context", { token: linkToken, point })
      .then((value) => {
        if (!cancelled) setContext(value);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [linkToken, point, attempt]);
  useEffect(() => {
    if (!identity || receipt) return;
    const timer = window.setTimeout(
      () => {
        setIdentity(null);
        setHistory(null);
        setPin("");
        setConfirmPin("");
        setError("Tu acceso venció. Vuelve a escanear el QR e identificarte.");
      },
      Math.max(0, Date.parse(identity.expires_at) - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [identity, receipt]);

  async function run(task: () => Promise<void>) {
    if (inflight.current) return;
    inflight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible completar la solicitud.",
      );
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }
  async function loadHistory(session: string) {
    setHistory(await publicClock<History>("history", { session }));
  }
  function restart() {
    setIdentity(null);
    setHistory(null);
    setReceipt(null);
    setPin("");
    setConfirmPin("");
    setDocument("");
    setNotice("");
    setError("");
    pendingPunch.current = null;
    setAttempt((v) => v + 1);
  }
  async function identify() {
    if (!context) return;
    await run(async () => {
      const value = await publicClock<Identity>("identify", {
        session: context.challenge,
        document,
        pin,
      });
      setPin("");
      setIdentity(value);
      if (!value.must_change) await loadHistory(value.session);
    });
  }
  async function changePin() {
    if (!identity) return;
    if (!/^\d{6}$/.test(pin) || pin !== confirmPin) {
      setError("Escribe el mismo PIN de seis dígitos en ambos campos.");
      return;
    }
    await run(async () => {
      await publicClock("change_pin", { session: identity.session, pin });
      setPin("");
      setConfirmPin("");
      setIdentity({ ...identity, must_change: false });
      await loadHistory(identity.session);
    });
  }
  function punch(next: TimeClockAction) {
    if (next === "clock_in" && history?.require_clock_in_photo) {
      setError("");
      setCameraAction(next);
      return;
    }
    void submitPunch(next);
  }
  async function submitPunch(next: TimeClockAction, photo?: File) {
    if (!identity) return;
    await run(async () => {
      if (!navigator.geolocation)
        throw new Error(
          "Tu dispositivo no permite obtener ubicación. Contacta al supervisor.",
        );
      const position = await getCurrentPosition().catch(() => {
        throw new Error(
          "No se pudo obtener tu ubicación. Activa el GPS y permite el acceso; si continúa, contacta al supervisor.",
        );
      });
      // Keep the same key/action after a lost response; retries cannot create a second event.
      pendingPunch.current ??= { key: crypto.randomUUID(), action: next };
      const result = await publicClock<Receipt>(
        "punch",
        {
          session: identity.session,
          action: pendingPunch.current.action,
          idempotency_key: pendingPunch.current.key,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          position_captured_at: new Date(position.timestamp).toISOString(),
        },
        photo,
      );
      setReceipt(result);
      setHistory(null);
    });
  }
  async function correction() {
    if (!identity || !dateTime || !workDate || reason.trim().length < 5) {
      setError(
        "Indica jornada, fecha, hora y un motivo de al menos cinco caracteres.",
      );
      return;
    }
    await run(async () => {
      await publicClock("correction", {
        session: identity.session,
        action,
        requested_at: bogotaInputToISO(dateTime),
        work_date: workDate,
        reason,
        event_id: eventId || null,
      });
      setDateTime("");
      setReason("");
      setEventId("");
      setNotice("Solicitud enviada. Un responsable revisará tu corrección.");
      await loadHistory(identity.session);
    });
  }

  return (
    <div className="public-clock">
      <main className="clock-shell">
        <header className="clock-header">
          <div className="clock-brand-row">
            <div className="clock-brand">
              {context?.horizontal_logo_url && failedLogo !== context.horizontal_logo_url ? (
                <img className="clock-company-logo" src={context.horizontal_logo_url}
                  alt={`Logo de ${context.company}`} referrerPolicy="no-referrer"
                  onError={() => setFailedLogo(context.horizontal_logo_url!)} />
              ) : (
                <span className="clock-brand-symbol"><Clock3 aria-hidden="true" /></span>
              )}
              {(!context?.horizontal_logo_url || failedLogo === context.horizontal_logo_url) && (
                <span className="clock-company-name">{context?.company || "Reloj de asistencia"}</span>
              )}
            </div>
            <span className="clock-product-label">Reloj de Asistencia</span>
          </div>
          <div className="clock-heading-row">
            <div>
              <p className="clock-eyebrow">Tu jornada, al día</p>
              <h1>Registra tu asistencia</h1>
            </div>
            <span className="clock-heading-icon"><Fingerprint aria-hidden="true" /></span>
          </div>
          <div className="clock-time-panel">
            <div>
              <p className="clock-date">{now.toLocaleDateString("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" })}</p>
              <time className="clock-time" dateTime={now.toISOString()}>{now.toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
              <p className="clock-time-caption">Hora de tu dispositivo · Colombia</p>
            </div>
          {context && (
            <div className="clock-location">
              <MapPin aria-hidden="true" />
              <div><span>Punto de marcación</span><strong>{context.point}</strong><p>{context.center}</p></div>
            </div>
          )}
          </div>
          {context?.require_clock_in_photo && (
            <p className="clock-photo-note">
              <Camera aria-hidden="true" />
              Este punto toma una foto automática únicamente al registrar la entrada.
            </p>
          )}
        </header>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
            <Button
              className="mt-3 block"
              variant="outline"
              size="sm"
              onClick={restart}
              disabled={busy}
            >
              Volver al inicio
            </Button>
          </div>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {notice}
          </p>
        )}
        {!context && busy && (
          <p role="status" className="flex justify-center gap-2 p-8">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando punto…
          </p>
        )}
        {context && !identity && (
          <Card className="clock-card clock-login-card">
            <CardHeader>
              <CardTitle>Ingresa con cédula y PIN</CardTitle>
              <p className="text-sm text-muted-foreground">
                RRHH te entrega tu primer PIN. No necesitas una cuenta del
                portal.
              </p>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void identify();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="document">Cédula</Label>
                  <Input
                    id="document"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    maxLength={25}
                    value={document}
                    onChange={(e) =>
                      setDocument(e.target.value.replace(/\D/g, ""))
                    }
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin">PIN de seis dígitos</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className="h-12"
                  />
                </div>
                <Button type="submit" className="clock-primary-button h-12 w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
                  Continuar
                  {!busy && <ArrowRight aria-hidden="true" />}
                </Button>
                <p className="text-xs text-muted-foreground">
                  ¿Olvidaste tu PIN? Solicita a RRHH uno temporal.
                </p>
              </form>
            </CardContent>
          </Card>
        )}
        {identity?.must_change && (
          <Card className="clock-card">
            <CardHeader>
              <CardTitle>Crea tu PIN personal</CardTitle>
              <p className="text-sm text-muted-foreground">
                Hola, {identity.name}. Cambia el PIN temporal antes de
                continuar.
              </p>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void changePin();
                }}
              >
                <Label htmlFor="new-pin">Nuevo PIN</Label>
                <Input
                  id="new-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                />
                <Label htmlFor="confirm-pin">Repite tu PIN</Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) =>
                    setConfirmPin(e.target.value.replace(/\D/g, ""))
                  }
                />
                <Button className="w-full" disabled={busy}>
                  Guardar y continuar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        {receipt && identity && (
          <Card className="clock-card">
            <CardContent className="space-y-4 p-7 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="text-2xl font-bold">
                {TIME_CLOCK_ACTION_LABELS[receipt.action]} registrada
              </h2>
              <p>{identity.name}</p>
              <p className="font-semibold">
                {attendanceDateTime(receipt.occurred_at)}
              </p>
              <p className="text-sm text-muted-foreground">{context?.point}</p>
              <Button className="w-full" onClick={restart}>
                Finalizar
              </Button>
            </CardContent>
          </Card>
        )}
        {identity && !identity.must_change && !receipt && (
          <>
            {cameraAction && (
              <AutomaticPhotoCapture
                onCancel={() => setCameraAction(null)}
                onCapture={(photo) => {
                  const next = cameraAction;
                  setCameraAction(null);
                  if (next) void submitPunch(next, photo);
                }}
              />
            )}
            {!cameraAction && (
              <>
            <div className="clock-identity flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3"><span className="clock-avatar"><UserRound aria-hidden="true" /></span><div><p className="clock-identity-label">Hola,</p><p className="font-semibold break-words">{identity.name}</p></div></div>
              <Button variant="ghost" size="sm" onClick={restart}>
                <LogOut aria-hidden="true" />
                Salir
              </Button>
            </div>
            <div className="clock-tabs grid grid-cols-2 gap-2" role="group" aria-label="Vista de asistencia">
              <Button
                variant={view === "punch" ? "default" : "outline"}
                aria-pressed={view === "punch"}
                onClick={() => setView("punch")}
              >
                Marcar
              </Button>
              <Button
                variant={view === "history" ? "default" : "outline"}
                aria-pressed={view === "history"}
                onClick={() => setView("history")}
              >
                Mi asistencia
              </Button>
            </div>
            {!history && (
              <Button
                disabled={busy}
                onClick={() => run(() => loadHistory(identity.session))}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Cargar asistencia
              </Button>
            )}
            {view === "punch" && history && (
              <Card className="clock-card clock-punch-card">
                <CardHeader>
                  <CardTitle>
                    {history.last_action
                      ? `Última acción: ${TIME_CLOCK_ACTION_LABELS[history.last_action]}`
                      : "Todo listo para iniciar"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Confirma tu acción. Validaremos que estés en el punto de
                    marcación.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {availableActions(
                    history.last_action,
                    history.require_break_punches,
                  ).map((next) => (
                    <Button
                      key={next}
                      className="clock-punch-button h-14 w-full text-base"
                      disabled={
                        busy ||
                        (!!pendingPunch.current &&
                          pendingPunch.current.action !== next)
                      }
                      onClick={() => punch(next)}
                    >
                      {busy && (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      )}
                      {TIME_CLOCK_ACTION_LABELS[next]}
                      {!busy && <ArrowRight aria-hidden="true" />}
                    </Button>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    La confirmación utiliza la hora del servidor.
                  </p>
                </CardContent>
              </Card>
            )}
            {view === "history" && history && (
              <>
                <Card className="clock-card">
                  <CardHeader>
                    <CardTitle>Últimos 30 días</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-96 space-y-3 overflow-y-auto">
                    {history.events.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Aún no tienes registros.
                      </p>
                    )}
                    {history.events.map((ev) => (
                      <div key={ev.id} className="border-b pb-3 text-sm">
                        <p className="font-semibold">
                          {TIME_CLOCK_ACTION_LABELS[ev.action]}{" "}
                          {history.events.some(
                            (newer) => newer.supersedes_event_id === ev.id,
                          ) && (
                            <span className="font-normal text-muted-foreground">
                              (sustituida)
                            </span>
                          )}
                        </p>
                        <p>{attendanceDateTime(ev.occurred_at)}</p>
                        <p className="text-muted-foreground">
                          Jornada: {ev.work_date}
                        </p>
                        {!history.events.some(
                          (newer) => newer.supersedes_event_id === ev.id,
                        ) && (
                          <Button
                            size="sm"
                            variant="link"
                            className="px-0"
                            onClick={() => {
                              setEventId(ev.id);
                              setAction(ev.action);
                              setWorkDate(ev.work_date);
                              setDateTime(
                                new Date(
                                  Date.parse(ev.occurred_at) - 5 * 3600000,
                                )
                                  .toISOString()
                                  .slice(0, 16),
                              );
                            }}
                          >
                            Solicitar corrección
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="clock-card">
                  <CardHeader>
                    <CardTitle>Solicitar corrección</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Selecciona la fecha en que comenzó la jornada, incluso si
                      la salida fue al día siguiente.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form
                      className="space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void correction();
                      }}
                    >
                      {eventId && (
                        <p className="text-sm">
                          Corrigiendo una marcación existente.{" "}
                          <button
                            type="button"
                            className="underline"
                            onClick={() => setEventId("")}
                          >
                            Registrar un olvido
                          </button>
                        </p>
                      )}
                      <Label htmlFor="correction-action">Acción</Label>
                      <select
                        id="correction-action"
                        value={action}
                        onChange={(e) =>
                          setAction(e.target.value as TimeClockAction)
                        }
                        className="h-11 w-full rounded-md border bg-background px-3"
                      >
                        {Object.entries(TIME_CLOCK_ACTION_LABELS).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                      <Label htmlFor="work-date">Fecha de la jornada</Label>
                      <Input
                        id="work-date"
                        type="date"
                        required
                        value={workDate}
                        onChange={(e) => setWorkDate(e.target.value)}
                      />
                      <Label htmlFor="correction-time">
                        Fecha y hora correctas (Colombia)
                      </Label>
                      <Input
                        id="correction-time"
                        type="datetime-local"
                        required
                        value={dateTime}
                        onChange={(e) => setDateTime(e.target.value)}
                      />
                      <Label htmlFor="correction-reason">Motivo</Label>
                      <Textarea
                        id="correction-reason"
                        required
                        minLength={5}
                        maxLength={1000}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <Button disabled={busy} className="w-full">
                        Enviar solicitud
                      </Button>
                    </form>
                    {history.corrections.map((item) => (
                      <div key={item.id} className="mt-4 border-t pt-3 text-sm">
                        <p className="font-semibold">
                          {TIME_CLOCK_ACTION_LABELS[item.requested_action]} ·{" "}
                          {item.status === "pending"
                            ? "Pendiente"
                            : item.status === "approved"
                              ? "Aprobada"
                              : "Rechazada"}
                        </p>
                        <p>{attendanceDateTime(item.requested_at)}</p>
                        <p className="text-muted-foreground">
                          {item.review_notes || item.reason}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
              </>
            )}
          </>
        )}
        <footer className="clock-footer">
          <MapPin aria-hidden="true" />
          Ubicación utilizada solo al marcar. Si necesitas ayuda, contacta al
          supervisor o a RRHH.
        </footer>
      </main>
    </div>
  );
}
