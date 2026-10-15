import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { getDirectAIProviders, requireDirectAIProvider } from "../../supabase/functions/_shared/aiProviders";

const openai = { openai_api_key: "test-openai", openai_model: "test-model" };
const gemini = { gemini_api_key: "test-gemini", gemini_model: "test-model" };

// Execute the actual Edge Function routing helpers without starting a server,
// accessing production data, or making paid requests to an AI provider.
function loadRouting(functionName: string, helper: string, response: unknown, status = 200) {
  const source = readFileSync(`supabase/functions/${functionName}/index.ts`, "utf8")
    .replace(/^import .*;\r?\n/gm, "");
  const fetch = vi.fn(async (_url: string, _options?: RequestInit) => new Response(JSON.stringify(response), { status }));
  const context = {
    Deno: { env: { get: () => undefined }, serve: vi.fn() },
    serve: vi.fn(), getDirectAIProviders, requireDirectAIProvider,
    fetch, Response, console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    setTimeout, clearTimeout,
  };
  const js = ts.transpileModule(`${source}\n;globalThis.routingHelper = ${helper};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const sandbox = { ...context, routingHelper: undefined as unknown as (...args: unknown[]) => Promise<unknown> };
  runInNewContext(js, sandbox);
  return { call: sandbox.routingHelper, fetch };
}

describe("direct AI credentials and selection", () => {
  it("honors a configured preferred provider", () => {
    expect(getDirectAIProviders({ ...openai, ...gemini, model: "gemini" })).toEqual(["gemini", "openai"]);
    expect(requireDirectAIProvider({ ...openai, ...gemini, model: "openai" })).toBe("openai");
  });

  it("recovers empty, stale, or unconfigured selections using an available company key", () => {
    expect(requireDirectAIProvider({ ...gemini, model: "retired-provider" })).toBe("gemini");
    expect(requireDirectAIProvider({ ...openai, model: "gemini" })).toBe("openai");
    expect(requireDirectAIProvider(gemini)).toBe("gemini");
  });

  it("fails closed when no usable credentials exist", () => {
    expect(getDirectAIProviders({ openai_api_key: "  ", gemini_api_key: "" })).toEqual([]);
    expect(() => requireDirectAIProvider({ model: "retired-provider" })).toThrow();
  });
});

describe("Edge Function provider routing", () => {
  for (const [provider, config, host, payload] of [
    ["openai", openai, "api.openai.com", { choices: [{ message: { content: "Respuesta directa" } }] }],
    ["gemini", gemini, "generativelanguage.googleapis.com", { candidates: [{ content: { parts: [{ text: "Respuesta directa" }] } }] }],
  ] as const) {
    it(`routes chat directly to ${provider}`, async () => {
      const routing = loadRouting("ai-chat", "generateAnswer", payload);
      const result = await routing.call({ ...config, model: provider }, "Ayuda", [{ role: "user", content: "Hola" }]);
      expect(result).toEqual({ provider, answer: "Respuesta directa" });
      expect(new URL(routing.fetch.mock.calls[0][0] as string).hostname).toBe(host);
    });

    it(`routes slide text directly to ${provider}`, async () => {
      const routing = loadRouting("generate-training-media", "generateSlidesText", payload);
      expect(await routing.call({ ...config, model: provider }, "Diapositivas")).toBe("Respuesta directa");
      expect(new URL(routing.fetch.mock.calls[0][0] as string).hostname).toBe(host);
    });

    it(`generates structured training directly with ${provider}`, async () => {
      const content = { introduccion: "Introducción", objetivos: [], contenido: "Contenido", puntosClave: [], evaluacion: [] };
      const response = provider === "openai"
        ? { choices: [{ message: { tool_calls: [{ function: { arguments: JSON.stringify(content) } }] } }] }
        : { candidates: [{ content: { parts: [{ text: JSON.stringify(content) }] } }] };
      const routing = loadRouting("generate-training", "generateTrainingWithAI", response);
      expect(await routing.call({ ...config, model: provider }, "Capacitación", "Generar")).toEqual(content);
      expect(new URL(routing.fetch.mock.calls[0][0] as string).hostname).toBe(host);
    });
  }

  it("tries the other configured direct provider when the preferred chat provider fails", async () => {
    const routing = loadRouting("ai-chat", "generateAnswer", {});
    routing.fetch.mockResolvedValueOnce(new Response('{"error":{"message":"unavailable"}}', { status: 503 }));
    routing.fetch.mockResolvedValueOnce(new Response('{"candidates":[{"content":{"parts":[{"text":"Alternativa"}]}}]}'));
    expect(await routing.call({ ...openai, ...gemini, model: "openai" }, "Ayuda", [])).toEqual({ provider: "gemini", answer: "Alternativa" });
    expect(routing.fetch.mock.calls.map(([url]) => new URL(url as string).hostname)).toEqual(["api.openai.com", "generativelanguage.googleapis.com"]);
  });

  it("never makes an AI request without a configured company key", async () => {
    for (const [name, helper, args] of [
      ["ai-chat", "generateAnswer", [{}, "Ayuda", []]],
      ["generate-training", "generateTrainingWithAI", [{}, "Sistema", "Contenido"]],
      ["generate-training-media", "generateSlidesText", [{}, "Diapositivas"]],
      ["generate-training-video", "generateImageForConfiguredProvider", [{}, "Imagen"]],
    ] as const) {
      const routing = loadRouting(name, helper, {});
      await expect(routing.call(...args)).rejects.toBeDefined();
      expect(routing.fetch).not.toHaveBeenCalled();
    }
  });
});
