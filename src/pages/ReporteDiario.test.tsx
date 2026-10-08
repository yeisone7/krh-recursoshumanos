import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import ReporteDiario from "./ReporteDiario";

const request = vi.hoisted(() => vi.fn());
vi.mock("@/lib/dailyReports", async (original) => ({
  ...(await original<typeof import("@/lib/dailyReports")>()),
  dailyRequest: request,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    currentCompanyId: "company",
    user: { id: "user" },
    hasPermission: () => true,
  }),
}));
vi.mock("@/components/workspace/WorkspacePaneContext", () => ({
  useWorkspaceActive: () => true,
}));

it("searches the entire publication and resets pagination while sending date/state filters", async () => {
  const publication = {
    id: "publication",
    center_id: "center",
    center_name: "Centro QA",
    start_date: "2026-09-01",
    end_date: "2026-09-30",
    expires_at: "2026-12-01T00:00:00Z",
    supervisor_id: "user",
  };
  request.mockImplementation(async (action) =>
    action === "options"
      ? {
          centers: [],
          supervisors: [],
          settings: { format_code: "GH FO 121", format_version: "01" },
        }
      : action === "list"
        ? [publication]
        : { publication, rows: [], has_more: true },
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ReporteDiario />
    </QueryClientProvider>,
  );
  await screen.findByRole("option", { name: /Centro QA/ });
  fireEvent.change(screen.getByLabelText("Centro y período publicados"), {
    target: { value: "publication" },
  });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "rows",
      expect.objectContaining({ offset: 25 }),
    ),
  );
  fireEvent.change(screen.getByLabelText("Buscar empleado"), {
    target: { value: "123456" },
  });
  fireEvent.change(screen.getByLabelText("Desde"), {
    target: { value: "2026-09-02" },
  });
  fireEvent.change(screen.getByLabelText("Hasta"), {
    target: { value: "2026-09-15" },
  });
  fireEvent.change(screen.getByLabelText("Estado del reporte"), {
    target: { value: "signed" },
  });
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("rows", {
      publication_id: "publication",
      offset: 0,
      search: "123456",
      from: "2026-09-02",
      to: "2026-09-15",
      state: "signed",
    }),
  );
  expect(screen.getByText(/Página 1/)).toBeInTheDocument();
  client.clear();
});
