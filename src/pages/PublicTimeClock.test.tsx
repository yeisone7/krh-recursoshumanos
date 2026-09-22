import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PublicTimeClock from "./PublicTimeClock";

const { api, position } = vi.hoisted(() => ({
  api: vi.fn(),
  position: vi.fn(),
}));
vi.mock("@/lib/timeClockApi", () => ({ publicClock: api }));
vi.mock("@/hooks/useTimeClock", () => ({ getCurrentPosition: position }));
vi.mock("@/components/time-clock/AutomaticPhotoCapture", () => ({
  AutomaticPhotoCapture: ({ onCapture }: { onCapture: (photo: File) => void }) => (
    <button
      onClick={() =>
        onCapture(new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "entrada.jpg", { type: "image/jpeg" }))
      }
    >
      Tomar foto automática
    </button>
  ),
}));
const expiry = () => new Date(Date.now() + 300000).toISOString();
function mount() {
  return render(
    <MemoryRouter
      initialEntries={["/asistencia/example"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/asistencia/:token" element={<PublicTimeClock />} />
      </Routes>
    </MemoryRouter>,
  );
}
async function login() {
  await screen.findByLabelText("Cédula");
  fireEvent.change(screen.getByLabelText("Cédula"), {
    target: { value: "123456" },
  });
  fireEvent.change(screen.getByLabelText("PIN de seis dígitos"), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
}
beforeEach(() => {
  api.mockReset();
  position.mockReset();
  Object.defineProperty(navigator, "geolocation", {
    value: {},
    configurable: true,
  });
  position.mockResolvedValue({
    coords: { latitude: 4.65, longitude: -74.1, accuracy: 5 },
    timestamp: Date.now(),
  });
  api.mockImplementation(async (operation: string) => {
    if (operation === "context")
      return {
        challenge: "challenge",
        company: "Empresa",
        point: "Recepción",
        center: "Sede",
        expires_at: expiry(),
      };
    if (operation === "identify")
      return {
        session: "session",
        name: "Ana Pérez",
        must_change: false,
        expires_at: expiry(),
      };
    if (operation === "history")
      return {
        last_action: null,
        require_break_punches: false,
        require_clock_in_photo: false,
        events: [],
        corrections: [],
      };
    if (operation === "punch")
      return {
        event_id: "event",
        action: "clock_in",
        occurred_at: "2026-09-21T13:00:00Z",
      };
    return { success: true };
  });
});
afterEach(async () => {
  await act(async () => {});
  cleanup();
});
describe("public attendance flow", () => {
  it("authenticates with PIN, confirms a server receipt and clears the identity", async () => {
    mount();
    await login();
    fireEvent.click(await screen.findByRole("button", { name: "Entrada" }));
    await screen.findByText("Entrada registrada");
    expect(api.mock.calls.find((c) => c[0] === "punch")?.[1]).toMatchObject({
      session: "session",
      action: "clock_in",
      latitude: 4.65,
      accuracy: 5,
    });
    expect(
      api.mock.calls.find((c) => c[0] === "punch")?.[1],
    ).not.toHaveProperty("employee_id");
    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    await screen.findByLabelText("Cédula");
    expect(screen.queryByText("Ana Pérez")).toBeNull();
    expect(
      (screen.getByLabelText("PIN de seis dígitos") as HTMLInputElement).value,
    ).toBe("");
  });
  it("requires a new matching PIN before loading history or allowing a punch", async () => {
    const original = api.getMockImplementation()!;
    api.mockImplementation((op, body) =>
      op === "identify"
        ? Promise.resolve({
            session: "session",
            name: "Ana Pérez",
            must_change: true,
            expires_at: expiry(),
          })
        : original(op, body),
    );
    mount();
    await login();
    await screen.findByText("Crea tu PIN personal");
    expect(api.mock.calls.some((c) => c[0] === "history")).toBe(false);
    fireEvent.change(screen.getByLabelText("Nuevo PIN"), {
      target: { value: "654321" },
    });
    fireEvent.change(screen.getByLabelText("Repite tu PIN"), {
      target: { value: "654321" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Guardar y continuar" }),
    );
    await screen.findByRole("button", { name: "Entrada" });
    expect(api).toHaveBeenCalledWith("change_pin", {
      session: "session",
      pin: "654321",
    });
  });
  it("reuses the same idempotency key after a lost response", async () => {
    const original = api.getMockImplementation()!;
    let calls = 0;
    api.mockImplementation((op, body) => {
      if (op === "punch" && calls++ === 0)
        return Promise.reject(new Error("Conexión interrumpida"));
      return original(op, body);
    });
    mount();
    await login();
    fireEvent.click(await screen.findByRole("button", { name: "Entrada" }));
    await screen.findByText("Conexión interrumpida");
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Entrada" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Entrada" }));
    await screen.findByText("Entrada registrada");
    const punches = api.mock.calls.filter((c) => c[0] === "punch");
    expect(punches[0][1].idempotency_key).toBe(punches[1][1].idempotency_key);
  });
  it("does not submit a punch when GPS is denied", async () => {
    position.mockRejectedValue(new Error("Denied"));
    mount();
    await login();
    fireEvent.click(await screen.findByRole("button", { name: "Entrada" }));
    await screen.findByRole("alert");
    expect(api.mock.calls.some((c) => c[0] === "punch")).toBe(false);
  });
  it("takes and sends a photo automatically when the point requires it", async () => {
    const original = api.getMockImplementation()!;
    api.mockImplementation((op, body, photo) =>
      op === "history"
        ? Promise.resolve({
            last_action: null,
            require_break_punches: false,
            require_clock_in_photo: true,
            events: [],
            corrections: [],
          })
        : original(op, body, photo),
    );
    mount();
    await login();
    fireEvent.click(await screen.findByRole("button", { name: "Entrada" }));
    expect(api.mock.calls.some((call) => call[0] === "punch")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Tomar foto automática" }));
    await screen.findByText("Entrada registrada");
    const punch = api.mock.calls.find((call) => call[0] === "punch");
    expect(punch?.[2]).toBeInstanceOf(File);
    expect(punch?.[2].type).toBe("image/jpeg");
  });
});
