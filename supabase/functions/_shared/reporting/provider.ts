import { ReportError } from './validation.ts';

export interface AIConfig {
  model?: string;
  openai_api_key?: string;
  gemini_api_key?: string;
  anthropic_api_key?: string;
  openai_model?: string;
  gemini_model?: string;
  anthropic_model?: string;
}
export type JsonSchema = Record<string, unknown>;
export const obj = (properties: JsonSchema) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const str = { type: 'string' };
const arr = (items: unknown) => ({ type: 'array', items });
const filter = obj({
  field: str,
  op: {
    type: 'string',
    enum: [
      'eq',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'contains',
      'in',
      'is_null',
      'not_null',
    ],
  },
  values: arr(str),
});
export const PLAN_SCHEMA = obj({
  title: str,
  clarification: { type: ['string', 'null'] },
  plan: {
    anyOf: [
      { type: 'null' },
      obj({
        source: str,
        columns: arr(str),
        dimensions: arr(
          obj({
            field: str,
            grain: { type: 'string', enum: ['value', 'day', 'month', 'year'] },
          }),
        ),
        metrics: arr(
          obj({
            field: str,
            op: {
              type: 'string',
              enum: ['count', 'distinct', 'sum', 'avg', 'min', 'max'],
            },
            key: str,
          }),
        ),
        filters: arr(filter),
        related: arr(
          obj({
            source: str,
            mode: { type: 'string', enum: ['exists', 'not_exists'] },
            filters: arr(filter),
          }),
        ),
        order: arr(
          obj({
            field: str,
            direction: { type: 'string', enum: ['asc', 'desc'] },
          }),
        ),
        chart: { type: 'string', enum: ['bar', 'line', 'donut', 'none'] },
        limit: { type: ['integer', 'null'] },
        comparePrevious: { type: 'boolean' },
      }),
    ],
  },
});
export function providerSettings(config: AIConfig) {
  const provider = config.model || 'gemini';
  if (!['openai', 'gemini', 'anthropic'].includes(provider))
    throw new ReportError(
      'PROVIDER_CONFIG',
      'Selecciona OpenAI, Gemini o Anthropic en Configuración > IA.',
      503,
    );
  const key = config[`${provider}_api_key` as keyof AIConfig];
  if (!key)
    throw new ReportError(
      'PROVIDER_CONFIG',
      `Falta la clave de ${provider} en Configuración > IA.`,
      503,
    );
  const defaults: Record<string, string> = {
    openai: 'gpt-4o',
    gemini: 'gemini-2.5-flash',
    anthropic: 'claude-sonnet-4-5',
  };
  return {
    provider,
    key,
    model: config[`${provider}_model` as keyof AIConfig] || defaults[provider],
  };
}
export async function structured(
  config: AIConfig,
  system: string,
  input: unknown,
  schema: JsonSchema,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  const { provider, key, model } = providerSettings(config);
  const user = JSON.stringify(input);
  let url: string;
  let headers: Record<string, string>;
  let body: unknown;
  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { Authorization: `Bearer ${key}` };
    body = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'empatiq_report', strict: true, schema },
      },
    };
  } else if (provider === 'gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers = { 'x-goog-api-key': key };
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
      },
    };
  } else {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01' };
    body = {
      model,
      max_tokens: 4500,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: { type: 'json_schema', schema } },
    };
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    let data;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    try {
      res = await fetcher(url, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.ok) data = await res.json();
    } catch (error) {
      if (error instanceof SyntaxError)
        throw new ReportError(
          'INVALID_RESPONSE',
          'El proveedor devolvió una respuesta inválida.',
          502,
        );
      throw new ReportError(
        'PROVIDER_TIMEOUT',
        'El proveedor tardó demasiado. La pregunta se conserva para reintentar.',
        504,
      );
    } finally {
      clearTimeout(timer);
    }
    if (res.status === 429)
      throw new ReportError(
        'PROVIDER_QUOTA',
        `Se alcanzó la cuota de ${provider}. Revisa tu configuración o inténtalo más tarde.`,
        429,
      );
    if (res.status >= 500 && attempt === 0) {
      await res.body?.cancel();
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }
    if (!res.ok)
      throw new ReportError(
        'PROVIDER_ERROR',
        `${provider} no pudo procesar la consulta (${res.status}). Revisa la clave y el modelo en Configuración > IA.`,
        502,
      );
    const text =
      provider === 'openai'
        ? data.choices?.[0]?.message?.content
        : provider === 'gemini'
          ? data.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text || '')
              .join('')
          : data.content
              ?.filter((p: { type: string }) => p.type === 'text')
              .map((p: { text: string }) => p.text)
              .join('');
    if (!text)
      throw new ReportError(
        'PROVIDER_REFUSAL',
        'El proveedor no devolvió un reporte. Reformula la pregunta.',
        422,
      );
    try {
      return JSON.parse(text);
    } catch {
      throw new ReportError(
        'INVALID_RESPONSE',
        'El proveedor devolvió una respuesta inválida. Inténtalo nuevamente.',
        502,
      );
    }
  }
  throw new ReportError('PROVIDER_ERROR', 'Proveedor no disponible.', 502);
}
