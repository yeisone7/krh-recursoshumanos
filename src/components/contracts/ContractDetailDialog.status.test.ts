import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('contract detail status badges', () => {
  it('uses the high-contrast warning palette for pending approval', () => {
    const source = readFileSync(
      `${process.cwd()}/src/components/contracts/ContractDetailDialog.tsx`,
      'utf8',
    );
    const approvalBadge = source.slice(
      source.indexOf('{/* Approval Status Badge */}'),
      source.indexOf('{hasPendingTermination'),
    );

    expect(approvalBadge).toContain('bg-warning/10 text-warning border-warning/40');
    expect(approvalBadge).not.toContain('bg-warning-light text-warning-foreground');
  });
});
