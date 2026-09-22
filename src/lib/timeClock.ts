import type { TimeClockAction, TimeClockDay } from "@/types/timeClock";

export const attendanceDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export const attendanceTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleTimeString("es-CO", {
        timeZone: "America/Bogota",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export const attendanceDateTime = (value: string) =>
  new Date(value).toLocaleString("es-CO", { timeZone: "America/Bogota" });
export const bogotaInputToISO = (value: string) =>
  new Date(`${value}:00-05:00`).toISOString();
export const duration = (minutes: number) =>
  `${Math.floor(Math.abs(minutes) / 60)}h ${Math.abs(minutes) % 60}m`;
export const statusLabels: Record<string, string> = {
  scheduled: "Pendiente de entrada",
  open: "Trabajando",
  on_break: "En pausa",
  complete: "Completa",
  needs_review: "Por revisar",
};
export const sourceLabels: Record<string, string> = {
  qr: "QR",
  web: "Portal",
  supervised: "Supervisada",
  correction: "Corrección",
};
export const incidentLabels: Record<string, string> = {
  late: "Tardanza",
  early_leave: "Salida anticipada",
  absence: "Posible ausencia",
  justified_absence: "Ausencia justificada",
  missing_checkout: "Falta salida",
  no_schedule: "Sin horario",
  absence_overlap: "Coincide con permiso o ausencia",
  missing_break: "Falta pausa",
  invalid_sequence: "Secuencia por revisar",
};
export const scheduledMinutes = (day: TimeClockDay) =>
  day.expected_start && day.expected_end
    ? Math.max(
        0,
        Math.round(
          (Date.parse(day.expected_end) - Date.parse(day.expected_start)) /
            60000,
        ) - day.scheduled_break_minutes,
      )
    : 0;
export function availableActions(
  last: TimeClockAction | null | undefined,
  pauses: boolean,
): TimeClockAction[] {
  if (last === "break_start") return ["break_end"];
  if (last === "clock_in" || last === "break_end")
    return pauses ? ["break_start", "clock_out"] : ["clock_out"];
  return ["clock_in"];
}
export const clockErrors: Record<string, string> = {
  LINK_UNAVAILABLE:
    "Este enlace está desactivado o venció. Solicita el QR vigente al supervisor.",
  SESSION_EXPIRED: "Tu acceso venció. Vuelve a escanear el QR e identificarte.",
  INVALID_CREDENTIALS:
    "No fue posible validar tu cédula y PIN para este punto. Verifica tus datos o contacta a RRHH.",
  INVALID_NEW_PIN: "Elige un PIN diferente de seis dígitos.",
  PIN_CHANGE_REQUIRED: "Debes cambiar tu PIN temporal antes de continuar.",
  RATE_LIMITED: "Demasiados intentos. Espera 15 minutos e intenta nuevamente.",
  LOCATION_REQUIRED: "Permite el acceso a tu ubicación para marcar.",
  LOCATION_ACCURACY_LOW:
    "La ubicación no es precisa. Acércate a una zona abierta y reintenta.",
  LOCATION_STALE: "La ubicación venció. Intenta nuevamente.",
  OUTSIDE_ALLOWED_AREA:
    "Estás fuera del radio permitido. Acércate al punto o contacta al supervisor.",
  INVALID_SEQUENCE:
    "La marcación no corresponde al estado actual. Actualiza tu asistencia.",
  TOO_FREQUENT: "Espera 30 segundos antes de otra marcación.",
  STALE_OPEN_DAY:
    "Hay una jornada anterior sin cerrar. Solicita una corrección al supervisor.",
  EMPLOYEE_NOT_ACTIVE: "Tu registro no está activo. Contacta a RRHH.",
  EMPLOYMENT_CYCLE_REQUIRED: "Tu vínculo laboral necesita revisión por RRHH.",
  POINT_NOT_ALLOWED: "No estás habilitado para marcar en este punto.",
  INVALID_CORRECTION:
    "Revisa la fecha, la jornada y el motivo de la corrección.",
  INVALID_REQUEST:
    "No se pudo completar la solicitud. Revisa los datos o contacta al supervisor.",
  SERVICE_UNAVAILABLE:
    "No se pudo conectar. Reintenta; si continúa, contacta al supervisor.",
};
