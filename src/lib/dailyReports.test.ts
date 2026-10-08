import { describe, expect, it } from "vitest";
import {
  birthDateFromParts,
  dailyHourTotals,
  dailyScheduleText,
  EMPTY_SERVICES,
  historyRow,
  type DailyHistory,
  type DailySnapshot,
} from "./dailyReports";

describe("Reporte Diario", () => {
  it("accepts a distant birth year and validates leap days without timezone shifts", () => {
    expect(birthDateFromParts("1942", "3", "9")).toBe("1942-03-09");
    expect(birthDateFromParts("1980", "2", "29")).toBe("1980-02-29");
    expect(birthDateFromParts("1981", "2", "29")).toBeNull();
    expect(birthDateFromParts("1980", "4", "31")).toBeNull();
    expect(birthDateFromParts("9999", "1", "1")).toBeNull();
  });
  it("keeps overtime and novelty hours separate and excludes ambiguous records", () => {
    const extra = [
      { id: "a", code: "HEDF", hours: 2.5, label: "", valid: true },
      { id: "b", code: "RNF", hours: 3, label: "", valid: true },
      { id: "c", code: "HEDF", hours: 9, label: "", valid: false },
    ];
    expect(dailyHourTotals(extra)).toEqual([0, 2.5, 0, 0, 0, 3]);
    expect(
      dailyHourTotals([
        { id: "d", code: "RN", hours: 1, label: "", valid: true },
      ]),
    ).toEqual([0, 0, 0, 0, 1, 0]);
  });
  it("describes overnight shifts and breaks without inventing split shift times", () => {
    const s = {
      schedule: {
        name: "Noche",
        start_time: "22:00",
        end_time: "06:00",
        break_minutes: 30,
      },
      absences: [],
    } as DailySnapshot;
    expect(dailyScheduleText(s)).toBe(
      "Noche · 22:00 a 06:00 (+1 día) · Descanso 30 min",
    );
    expect(
      dailyScheduleText({
        ...s,
        schedule: { ...s.schedule!, is_rest_day: true },
      }),
    ).toBe("Descanso · Noche");
  });
  it("exports historical content using its own evidence and disables signing", () => {
    const historical = {
      id: 7,
      day_key: "key",
      employee_id: "e",
      work_date: "2026-09-01",
      action: "approved",
      snapshot: { date: "2026-09-01" },
      services: EMPTY_SERVICES,
      evidence: { employee_signature_url: "old.png" },
    } as DailyHistory;
    const row = historyRow(historical);
    expect(row.evidence?.employee_signature_url).toBe("old.png");
    expect(row.snapshot).toBe(historical.snapshot);
    expect(row.can_sign).toBe(false);
  });
});
