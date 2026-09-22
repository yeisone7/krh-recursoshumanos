import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RelojChecador from "./RelojChecador";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    currentCompanyId: "company",
    canApprove: () => true,
    canExport: () => true,
    canCreate: () => true,
    canUpdate: () => true,
  }),
}));
vi.mock("@/hooks/useCompanies", () => ({
  useOperationCenters: () => ({
    data: [{ id: "center", name: "Centro Norte" }],
  }),
}));
vi.mock("@/hooks/useTimeClock", () => ({
  useTimeClockDays: () => ({
    data: [
      {
        id: "day",
        employee_id: "employee",
        operation_center_id: "center",
        work_date: "2026-09-21",
        expected_start: "2026-09-21T08:00:00-05:00",
        expected_end: "2026-09-21T17:00:00-05:00",
        scheduled_break_minutes: 60,
        worked_minutes: 480,
        break_minutes: 60,
        first_clock_in: "2026-09-21T08:00:00-05:00",
        last_clock_out: "2026-09-21T17:00:00-05:00",
        status: "complete",
        incident_codes: [],
        employees_v2: {
          first_name: "Ana",
          last_name: "Pérez",
          document_number: "123456",
        },
        operation_centers: { name: "Centro Norte" },
      },
    ],
    isLoading: false,
  }),
  useTimeClockEvents: () => ({ data: [], isLoading: false }),
  useTimeClockCorrections: () => ({ data: [] }),
  useTimeClockPoints: () => ({ data: [] }),
}));
vi.mock("@/components/time-clock/ClockManagement", () => ({
  PointsSettings: () => <div>Puntos configurables</div>,
  SupervisedPunch: () => <div>Marcación asistida</div>,
}));
vi.mock("@/components/time-clock/ClockAccess", () => ({
  ClockAccess: () => <div>Accesos individuales</div>,
}));
vi.mock("@/components/time-clock/ClockTracking", () => ({
  ClockTracking: () => <div>Seguimiento por centro</div>,
}));
vi.mock("@/components/time-clock/ClockReview", () => ({
  ClockCorrections: () => <div>Revisión de solicitudes</div>,
  ClockDayDetail: () => null,
}));
afterEach(cleanup);
describe("attendance administration", () => {
  it("organizes the module into the five agreed sections", () => {
    render(<RelojChecador />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Hoy",
      "Marcaciones",
      "Incidencias",
      "Puntos y QR",
      "Accesos",
    ]);
    expect(screen.getByText("Ana Pérez")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Marcación supervisada" }),
    ).toBeTruthy();
  });
  it("filters the actual attendance table by employee or document", () => {
    render(<RelojChecador />);
    fireEvent.change(screen.getByLabelText("Buscar empleado o documento"), {
      target: { value: "99999" },
    });
    expect(screen.queryByText("Ana Pérez")).toBeNull();
    fireEvent.change(screen.getByLabelText("Buscar empleado o documento"), {
      target: { value: "123456" },
    });
    expect(screen.getByText("Ana Pérez")).toBeTruthy();
  });
});
