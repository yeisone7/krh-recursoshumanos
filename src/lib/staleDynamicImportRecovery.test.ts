import { describe, expect, it } from "vitest";
import { isStaleDynamicImportError } from "./staleDynamicImportRecovery";

describe("isStaleDynamicImportError", () => {
  it.each([
    "Failed to fetch dynamically imported module: https://example.com/assets/Jornadas.js",
    "Importing a module script failed.",
    "Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of text/html.",
  ])("detecta errores de chunks obsoletos: %s", (message) => {
    expect(isStaleDynamicImportError(new Error(message))).toBe(true);
  });

  it("no intercepta errores de la aplicación", () => {
    expect(isStaleDynamicImportError(new Error("No se pudo guardar el turno"))).toBe(false);
  });
});
