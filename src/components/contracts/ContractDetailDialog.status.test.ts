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

  it('keeps the expired-term alert readable in light and dark themes', () => {
    const source = readFileSync(
      `${process.cwd()}/src/components/contracts/ContractDetailDialog.tsx`,
      'utf8',
    );
    const expiredAlert = source.slice(
      source.indexOf('{canAddExtension && isExpired && ('),
      source.indexOf('{contract.extensions.length === 0'),
    );

    expect(expiredAlert).toContain('border-warning/40 bg-warning/10');
    expect(expiredAlert).toContain('font-medium text-warning');
    expect(expiredAlert).not.toContain('text-warning-foreground');
  });
});
