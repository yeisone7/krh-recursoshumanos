import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const DAILY_STATUS = {
  internal_pending: "Pendiente de revisión interna",
  pending: "Pendiente de firma",
  disagreed: "En desacuerdo",
  signed: "Pendiente de supervisor",
  returned: "Devuelto",
  approved: "Aprobado",
  stale: "Requiere nueva firma",
} as const;
export type DailyStatus = keyof typeof DAILY_STATUS;
export const SERVICE_LABELS = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  meal: "Comida",
  dinner: "Cena",
  transport: "Transporte",
} as const;
export type DailyServices = Record<keyof typeof SERVICE_LABELS, boolean>;
export const EMPTY_SERVICES: DailyServices = {
  breakfast: false,
  lunch: false,
  meal: false,
  dinner: false,
  transport: false,
};
export const HOUR_CODES = ["HED", "HEDF", "HEN", "HENF", "RN", "RNF"] as const;
export type DailyHours = {
  id: string;
  code: string;
  hours: number;
  quantity?: number;
  unit?: string;
  label: string;
  valid: boolean;
};
export interface DailySnapshot {
  employee: {
    id: string;
    name: string;
    document: string;
    document_type: string;
    gender: string;
    age: number | null;
    position: string;
  };
  cycle_id: string;
  center_id: string;
  date: string;
  ready: boolean;
  internally_approved: boolean;
  special_day: boolean;
  schedule: {
    name: string;
    kind: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    is_rest_day?: boolean;
    is_not_worked_day?: boolean;
    is_suspension_day?: boolean;
  } | null;
  extras: DailyHours[];
  novelties: DailyHours[];
  absences: {
    id: string;
    label: string;
    hours?: number;
    duration?: string;
    start_time?: string;
    end_time?: string;
  }[];
}
export interface DailyEvidence {
  employee_signature_url?: string;
  supervisor_signature_url?: string;
  employee_signed_at?: string;
  supervisor_signed_at?: string;
  supervisor_name?: string;
}
export interface DailyRow {
  key: string;
  employee_id: string;
  date: string;
  snapshot: DailySnapshot;
  version: string;
  status: DailyStatus;
  decision_id?: number;
  services: DailyServices;
  reason?: string;
  evidence?: DailyEvidence;
  can_sign: boolean;
}
export interface DailyPublication {
  id: string;
  company_id: string;
  center_id: string;
  center_name: string;
  start_date: string;
  end_date: string;
  supervisor_id: string;
  supervisor_name: string;
  expires_at: string;
  revoked: boolean;
  created_at: string;
  company_name: string;
  logo_url?: string;
  format_code: string;
  format_version: string;
  token?: string;
}
export interface DailyData {
  publication: DailyPublication;
  rows: DailyRow[];
  has_more: boolean;
  saved_signature?: { id: string; signature_url: string } | null;
}
export interface DailyHistory {
  id: number;
  day_key: string;
  employee_id: string;
  work_date: string;
  action: "signed" | "approved" | "returned" | "disagreed";
  snapshot: DailySnapshot;
  services: DailyServices;
  reason?: string;
  evidence?: DailyEvidence;
  actor_name: string;
  occurred_at: string;
}
export interface DailyOptions {
  centers: { id: string; name: string }[];
  supervisors: { id: string; name: string; center_id: string }[];
  settings: { format_code: string; format_version: string };
}
const publicClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "daily-report-public",
    },
  },
);
export class DailyReportError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
export async function dailyRequest<T>(
  action: string,
  body: Record<string, unknown>,
  internal = true,
): Promise<T> {
  const { data, error } = await (
    internal ? supabase : publicClient
  ).functions.invoke("public-daily-report", {
    body: { ...body, action, mode: internal ? "admin" : "employee" },
  });
  if (error) {
    let payload: { error?: string; code?: string } = {};
    try {
      payload = await error.context?.json();
    } catch {
      /* Network errors have no JSON response. */
    }
    throw new DailyReportError(
      payload?.error || "No fue posible conectar. Intente nuevamente.",
      payload?.code,
    );
  }
  if (data?.error) throw new DailyReportError(data.error, data.code);
  return data as T;
}
export function dailyScheduleText(s: DailySnapshot): string {
  const p = s.schedule;
  let text = "Sin programación";
  if (p) {
    const label = p.is_rest_day
      ? "Descanso"
      : p.is_not_worked_day
        ? "No trabajado"
        : p.is_suspension_day
          ? "Suspensión"
          : "";
    text = label
      ? `${label} · ${p.name}`
      : `${p.name} · ${p.start_time?.slice(0, 5)} a ${p.end_time?.slice(0, 5)}${p.end_time <= p.start_time ? " (+1 día)" : ""}${p.break_minutes ? ` · Descanso ${p.break_minutes} min` : ""}`;
  }
  return [
    text,
    ...s.absences.map((a) => `${a.label}${a.hours ? ` (${a.hours} h)` : ""}`),
  ].join("\n");
}
export function dailyHourTotals(hours: DailyHours[]) {
  return HOUR_CODES.map((code) =>
    hours
      .filter((x) => x.valid && x.code === code)
      .reduce((sum, x) => sum + Number(x.hours), 0),
  );
}
export function dailyDate(date: string) {
  return date.slice(0, 10).split("-").reverse().join("/");
}
export function dailyTime(value?: string) {
  return value
    ? new Date(value).toLocaleString("es-CO", { timeZone: "America/Bogota" })
    : "";
}
export function historyRow(h: DailyHistory): DailyRow {
  return {
    key: h.day_key,
    employee_id: h.employee_id,
    date: h.work_date,
    snapshot: h.snapshot,
    services: h.services,
    status: h.action,
    evidence: h.evidence,
    reason: h.reason,
    version: "",
    can_sign: false,
    decision_id: h.id,
  };
}
export function birthDateFromParts(
  year: string,
  month: string,
  day: string,
): string | null {
  if (
    !/^\d{4}$/.test(year) ||
    +year < 1900 ||
    +year > new Date().getFullYear() ||
    !month ||
    !day
  )
    return null;
  const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date &&
    date <= new Date().toISOString().slice(0, 10)
    ? date
    : null;
}
