import { describe, expect, it } from 'vitest';
import { buildShareLink } from './shareLink';

describe('company share links', () => {
  it('preserves token, query and fragment while switching company context', () => {
    const link = new URL(buildShareLink('/dotacion/firma?company=old&point=123#token=secret', 'new', 'https://app.example'));
    expect(link.pathname).toBe('/dotacion/firma');
    expect(link.searchParams.get('company')).toBe('new');
    expect(link.searchParams.get('point')).toBe('123');
    expect(link.hash).toBe('#token=secret');
    expect(link.search).not.toContain('secret');
  });

  it('keeps personal access tokens out of added presentation context', () => {
    const link = new URL(buildShareLink('/capacitacion?token=private', 'company-a', 'https://app.example'));
    expect([...link.searchParams.keys()]).toEqual(['token', 'company']);
    expect(link.searchParams.get('token')).toBe('private');
  });

  it('supports links without a selected company and rejects external destinations', () => {
    expect(buildShareLink('/auth', null, 'https://app.example')).toBe('https://app.example/auth');
    expect(() => buildShareLink('//evil.example', 'a', 'https://app.example')).toThrow();
  });
});
