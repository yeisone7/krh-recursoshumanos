import { describe, expect, it } from "vitest";
import {
  attendanceDate,
  availableActions,
  bogotaInputToISO,
  scheduledMinutes,
} from "./timeClock";
import type { TimeClockDay } from "@/types/timeClock";

describe("attendance business time and actions", () => {
  it("keeps the Colombian date around UTC midnight", () => {
    expect(attendanceDate(new Date("2026-09-22T03:00:00Z"))).toBe("2026-09-21");
    expect(bogotaInputToISO("2026-09-21T22:30")).toBe(
      "2026-09-22T03:30:00.000Z",
    );
  });
  it("allows ending an existing pause even when the point setting changed", () => {
    expect(availableActions("break_start", false)).toEqual(["break_end"]);
    expect(availableActions("clock_in", false)).toEqual(["clock_out"]);
    expect(availableActions("clock_in", true)).toEqual([
      "break_start",
      "clock_out",
    ]);
    expect(availableActions("clock_out", true)).toEqual(["clock_in"]);
  });
  it("calculates overnight scheduled minutes and one scheduled break", () => {
    const day = {
      expected_start: "2026-09-21T22:00:00-05:00",
      expected_end: "2026-09-22T06:00:00-05:00",
      scheduled_break_minutes: 60,
    } as TimeClockDay;
    expect(scheduledMinutes(day)).toBe(420);
    expect(scheduledMinutes({ ...day, expected_start: null })).toBe(0);
  });
});
