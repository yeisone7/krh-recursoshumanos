import { describe, expect, it, vi } from 'vitest';
import { bogotaInputToIso, getEffectiveCopasstStatus, isoToBogotaInput } from './copasst';
import type { CopasstElection } from '@/types/copasst';

const election = (status: CopasstElection['status'], starts_at: string, ends_at: string) => ({
  id: '1', company_id: '1', title: 'Elección', description: null, term_label: '2026-2028',
  seats: 1, allow_blank_vote: true, timezone: 'America/Bogota', public_token: 'token',
  token_active: true, published_at: null, closed_at: null, created_at: starts_at,
  status, starts_at, ends_at,
}) satisfies CopasstElection;

describe('COPASST date and status rules', () => {
  it('converts Colombia local input without depending on the browser timezone', () => {
    expect(bogotaInputToIso('2026-09-03T08:30')).toBe('2026-09-03T13:30:00.000Z');
    expect(isoToBogotaInput('2026-09-03T13:30:00.000Z')).toBe('2026-09-03T08:30');
  });

  it('derives scheduled, open and automatic closed states', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-03T15:00:00.000Z'));
    expect(getEffectiveCopasstStatus(election('published', '2026-09-03T16:00:00.000Z', '2026-09-03T18:00:00.000Z'))).toBe('scheduled');
    expect(getEffectiveCopasstStatus(election('published', '2026-09-03T14:00:00.000Z', '2026-09-03T18:00:00.000Z'))).toBe('open');
    expect(getEffectiveCopasstStatus(election('published', '2026-09-03T12:00:00.000Z', '2026-09-03T14:00:00.000Z'))).toBe('closed');
    vi.useRealTimers();
  });
});
