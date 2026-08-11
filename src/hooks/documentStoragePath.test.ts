import { describe, expect, it } from 'vitest';
import { buildDocumentStoragePath } from './documentStoragePath';

describe('buildDocumentStoragePath', () => {
  const params = {
    companyId: 'company-id',
    entityType: 'incapacity_capacity_loss_rating',
    entityId: 'incapacity-id',
    version: 1,
    fileName: '7. FIRMEN PCL  24.06.2026.pdf',
  };

  it('uses a unique upload id so a retry never reuses an orphaned object path', () => {
    const firstAttempt = buildDocumentStoragePath({ ...params, uploadId: 'attempt-one' });
    const retry = buildDocumentStoragePath({ ...params, uploadId: 'attempt-two' });

    expect(firstAttempt).not.toBe(retry);
    expect(firstAttempt).toBe(
      'company-id/incapacity_capacity_loss_rating/incapacity-id/v1_attempt-one_7._FIRMEN_PCL__24.06.2026.pdf',
    );
  });
});
