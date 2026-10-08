import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DailyReportRows, DailySignDialog } from "./DailyReportReview";
import { EMPTY_SERVICES, type DailyRow } from "@/lib/dailyReports";

const row: DailyRow = {
  key: "one",
  employee_id: "e",
  date: "2026-09-01",
  version: "v1",
  status: "pending",
  can_sign: true,
  services: EMPTY_SERVICES,
  snapshot: {
    employee: {
      id: "e",
      name: "María Prueba",
      document: "123",
      document_type: "CC",
      gender: "F",
      age: 40,
      position: "QA",
    },
    date: "2026-09-01",
    cycle_id: "c",
    center_id: "o",
    ready: true,
    internally_approved: true,
    special_day: false,
    schedule: {
      name: "Día",
      kind: "shift",
      start_time: "08:00",
      end_time: "17:00",
      break_minutes: 60,
    },
    extras: [],
    novelties: [],
    absences: [],
  },
};
describe("daily report review", () => {
  it("requires explicit consent even when reusing a saved signature", () => {
    const confirm = vi.fn();
    render(
      <DailySignDialog
        rows={[row]}
        saved={{ id: "saved", signature_url: "data:image/png;base64,AA==" }}
        employee
        busy={false}
        onClose={vi.fn()}
        onConfirm={confirm}
      />,
    );
    const button = screen.getByRole("button", {
      name: "Firmar días seleccionados",
    });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Con la presente firma/ }),
    );
    fireEvent.click(button);
    expect(confirm).toHaveBeenCalledWith({
      image: undefined,
      savedId: "saved",
      save: false,
    });
  });
  it("allows read-only users to consult history without allowing selection", () => {
    const history = vi.fn();
    render(
      <DailyReportRows
        rows={[{ ...row, status: "signed" }]}
        selected={new Set()}
        onSelect={vi.fn()}
        selectable={false}
        onHistory={history}
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: /Seleccionar/ }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Historial" }));
    expect(history).toHaveBeenCalledWith(
      expect.objectContaining({ key: "one" }),
    );
  });
  it("records the five employee services independently and blocks unavailable days", () => {
    const services = vi.fn();
    render(
      <DailyReportRows
        rows={[
          row,
          {
            ...row,
            key: "two",
            date: "2026-09-02",
            can_sign: false,
            status: "internal_pending",
          },
        ]}
        selected={new Set()}
        onSelect={vi.fn()}
        onServices={services}
        employee
        onHistory={vi.fn()}
      />,
    );
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Comida" })[0]);
    expect(services).toHaveBeenCalledWith("one", {
      ...EMPTY_SERVICES,
      meal: true,
    });
    expect(screen.getAllByRole("checkbox", { name: "Cena" })[1]).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: /Seleccionar.*2026-09-02/ }),
    ).toBeDisabled();
  });
});
