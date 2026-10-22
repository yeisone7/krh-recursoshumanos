import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { hashIp, signToken, verifyToken, type SignatureToken } from '../../supabase/functions/public-dotation-signature/token';

const secret = 'test-only-secret-012345678901234567890123456789';
const payload: SignatureToken = { v: 1, purpose: 'dotation-signature',
  transaction_id: '12345678-1234-1234-1234-123456789012',
  company_id: '22345678-1234-1234-1234-123456789012', employee_id: '32345678-1234-1234-1234-123456789012',
  iat: 1000, exp: 87400 };

describe('temporary dotation signature tokens', () => {
  beforeAll(() => { vi.stubGlobal('crypto', webcrypto); });
  it('authenticates a token without storing it', async () => {
    expect(await verifyToken(await signToken(payload,secret),secret,1001)).toEqual(payload);
  });
  it('expires at exactly 24 hours and rejects future issuance', async () => {
    const token = await signToken(payload,secret);
    expect(await verifyToken(token,secret,87399)).not.toBeNull();
    expect(await verifyToken(token,secret,87400)).toBeNull();
    expect(await verifyToken(token,secret,999)).toBeNull();
  });
  it('rejects changed identity, wrong keys, malformed tokens and excess validity', async () => {
    const token = await signToken(payload,secret);
    const replacement = Buffer.from(JSON.stringify({...payload,employee_id:payload.company_id})).toString('base64url');
    expect(await verifyToken(`${replacement}.${token.split('.')[1]}`,secret,1001)).toBeNull();
    expect(await verifyToken(token,'different-secret',1001)).toBeNull();
    expect(await verifyToken(`${token}.extra`,secret,1001)).toBeNull();
    expect(await verifyToken('x'.repeat(3000),secret,1001)).toBeNull();
    expect(await verifyToken(await signToken({...payload,exp:87401},secret),secret,1001)).toBeNull();
  });
  it('hashes IPs separately from signed token payloads', async () => {
    const hash = await hashIp('192.0.2.1',secret);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain('192.0.2.1');
    expect(await hashIp('192.0.2.2',secret)).not.toBe(hash);
  });
});
