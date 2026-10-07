import { describe, expect, it, vi } from 'vitest';
import {
  structured,
  providerSettings,
  obj,
} from '../../supabase/functions/_shared/reporting/provider';
describe('report providers', () => {
  for (const provider of ['openai', 'gemini', 'anthropic'])
    it(`uses ${provider} structured output without falling back`, async () => {
      const payload = { ok: true };
      const content = JSON.stringify(payload);
      const fetcher = vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify(
              provider === 'openai'
                ? { choices: [{ message: { content } }] }
                : provider === 'gemini'
                  ? {
                      candidates: [{ content: { parts: [{ text: content }] } }],
                    }
                  : { content: [{ type: 'text', text: content }] },
            ),
            { status: 200 },
          ),
        );
      expect(
        await structured(
          { model: provider, [`${provider}_api_key`]: 'test-key' },
          'system',
          {},
          obj({ ok: { type: 'boolean' } }),
          fetcher,
        ),
      ).toEqual(payload);
      const body = JSON.parse(fetcher.mock.calls[0][1].body);
      expect(
        provider === 'openai'
          ? body.response_format.json_schema.strict
          : provider === 'gemini'
            ? body.generationConfig.responseMimeType
            : body.output_config.format.type,
      ).toBe(
        provider === 'openai'
          ? true
          : provider === 'gemini'
            ? 'application/json'
            : 'json_schema',
      );
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  it('reports missing company credentials and exhausted quota', async () => {
    expect(() =>
      providerSettings({ model: 'gemini', openai_api_key: 'test' }),
    ).toThrow('Falta la clave');
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('', { status: 429 }));
    await expect(
      structured(
        { model: 'openai', openai_api_key: 'test' },
        '',
        {},
        obj({}),
        fetcher,
      ),
    ).rejects.toMatchObject({ code: 'PROVIDER_QUOTA' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('retries one transient failure, rejects invalid JSON and timeouts', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'invalid' } }] }),
          { status: 200 },
        ),
      );
    await expect(
      structured(
        { model: 'openai', openai_api_key: 'test' },
        '',
        {},
        obj({}),
        fetcher,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    await expect(
      structured(
        { model: 'openai', openai_api_key: 'test' },
        '',
        {},
        obj({}),
        vi.fn().mockRejectedValue(new Error('timeout')),
      ),
    ).rejects.toMatchObject({ code: 'PROVIDER_TIMEOUT' });
  });
});
