import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublishableKey, getSecretKey } from '../../supabase/functions/_shared/apiKeys';

function environment(values: Record<string, string>) {
  vi.stubGlobal('Deno', { env: { get: (name: string) => values[name] } });
}

afterEach(() => vi.unstubAllGlobals());

describe('Edge Function modern API keys', () => {
  it('uses the default key from each injected map', () => {
    environment({
      SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: 'sb_publishable_test', other: 'sb_publishable_other' }),
      SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_test' }),
    });
    expect(getPublishableKey()).toBe('sb_publishable_test');
    expect(getSecretKey()).toBe('sb_secret_test');
  });

  it('never falls back to legacy credentials', () => {
    environment({ SUPABASE_ANON_KEY: 'legacy-anon', SUPABASE_SERVICE_ROLE_KEY: 'legacy-service' });
    expect(getPublishableKey).toThrow('SUPABASE_PUBLISHABLE_KEYS');
    expect(getSecretKey).toThrow('SUPABASE_SECRET_KEYS');
  });

  it.each(['not-json', 'null', '[]', '"string"', '{}', '{"default":42}', '{"default":"legacy-jwt"}'])
    ('rejects malformed or non-modern secret configuration: %s', (value) => {
      environment({ SUPABASE_SECRET_KEYS: value });
      expect(getSecretKey).toThrow();
    });

  it('does not include credential values in configuration errors', () => {
    environment({ SUPABASE_SECRET_KEYS: '{"default":"sensitive-invalid-value"}' });
    try {
      getSecretKey();
      expect.fail('Expected an invalid configuration error');
    } catch (error) {
      expect(String(error)).not.toContain('sensitive-invalid-value');
    }
  });
});
