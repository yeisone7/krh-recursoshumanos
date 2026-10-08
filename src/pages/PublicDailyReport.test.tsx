import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicDailyReport from "./PublicDailyReport";
const request = vi.hoisted(() => vi.fn());
vi.mock("@/lib/dailyReports", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/dailyReports")>()),
  dailyRequest: request,
}));
const publication = {
  company_name: "Empresa QA",
  center_name: "Centro QA",
  start_date: "2026-09-01",
  end_date: "2026-09-30",
};
describe("employee daily access", () => {
  beforeEach(() => {
    request.mockReset();
    request.mockImplementation(async (action) =>
      action === "context"
        ? { publication }
        : action === "identify"
          ? { session: "private-session", expires_in_seconds: 1800 }
          : { publication, rows: [] },
    );
  });
  it("identifies by document and distant date and never stores the public session", async () => {
    const store = vi.spyOn(Storage.prototype, "setItem");
    render(
      <MemoryRouter initialEntries={["/reporte-diario/test-token"]}>
        <Routes>
          <Route
            path="/reporte-diario/:token"
            element={<PublicDailyReport />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByLabelText("Documento");
    fireEvent.change(screen.getByLabelText("Documento"), {
      target: { value: "12345" },
    });
    fireEvent.change(screen.getByLabelText("Día de nacimiento"), {
      target: { value: "17" },
    });
    fireEvent.change(screen.getByLabelText("Mes de nacimiento"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Año de nacimiento"), {
      target: { value: "1942" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Consultar mi reporte" }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "identify",
        {
          token: "test-token",
          document_type: "CC",
          document_number: "12345",
          birth_date: "1942-04-17",
        },
        false,
      ),
    );
    await screen.findByRole("button", { name: "Salir" });
    expect(
      store.mock.calls.some((call) =>
        String(call[1]).includes("private-session"),
      ),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Salir" }));
    await screen.findByLabelText("Documento");
    store.mockRestore();
  });
});
