import { describe, expect, it } from 'vitest';
import { correctionExpiryError } from './payrollCorrections';

describe('correction ticket expiry', () => {
  const now = Date.parse('2026-09-25T16:16:57Z');

  it('rejects a past Colombian time even when its calendar date is today', () => {
    expect(correctionExpiryError('2026-09-25T02:56', now)).toMatch(/posterior a la hora actual/);
  });

  it('accepts a future Colombian time', () => {
    expect(correctionExpiryError('2026-09-25T12:00', now)).toBeNull();
  });

  it('identifies an incomplete date and time', () => {
    expect(correctionExpiryError('', now)).toMatch(/Seleccione/);
  });
});
