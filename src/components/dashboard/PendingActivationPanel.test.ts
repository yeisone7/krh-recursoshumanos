import { describe, expect, it } from 'vitest';

import { resolvePendingUserLabel } from './pendingActivationIdentity';

// Regression: pending activation users appeared as "Sin nombre" even when a display name existed.
// Found by /investigate on 2026-08-25.
describe('resolvePendingUserLabel', () => {
  it('uses the available identity fields in order of quality', () => {
    expect(resolvePendingUserLabel('Nombre completo', 'Nombre visible')).toBe('Nombre completo');
    expect(resolvePendingUserLabel('', 'Nombre visible')).toBe('Nombre visible');
    expect(resolvePendingUserLabel(null, null)).toBe('Usuario sin identificar');
  });
});
