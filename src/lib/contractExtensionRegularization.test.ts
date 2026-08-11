import { describe, expect, it } from 'vitest';
import { calculateAutomaticExtensionRegularizationPlan } from './contractExtensionRegularization';

function date(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

describe('calculateAutomaticExtensionRegularizationPlan', () => {
  it('creates the second extension with the same 3-month term after the first extension preaviso is expired', () => {
    const plan = calculateAutomaticExtensionRegularizationPlan(
      {
        id: 'contract-1',
        contractType: 'fixed',
        isApproved: true,
        isEmployeeActive: true,
        isTerminated: false,
        startDate: date('2026-01-01'),
        originalEndDate: date('2026-03-31'),
        currentEndDate: date('2026-06-30'),
        extensions: [
          { extensionNumber: 1, startDate: date('2026-04-01'), endDate: date('2026-06-30') },
        ],
      },
      date('2026-06-01')
    );

    expect(plan.eligible).toBe(true);
    expect(plan.extensions).toHaveLength(1);
    expect(plan.extensions[0]).toMatchObject({
      contractId: 'contract-1',
      extensionNumber: 2,
    });
    expect(plan.extensions[0].startDate).toEqual(date('2026-07-01'));
    expect(plan.extensions[0].endDate).toEqual(date('2026-09-30'));
  });

  it('creates the fourth extension for one year after three short extensions', () => {
    const plan = calculateAutomaticExtensionRegularizationPlan(
      {
        id: 'contract-2',
        contractType: 'fixed',
        isApproved: true,
        isEmployeeActive: true,
        isTerminated: false,
        startDate: date('2025-07-01'),
        originalEndDate: date('2025-09-30'),
        currentEndDate: date('2026-06-30'),
        extensions: [
          { extensionNumber: 1, startDate: date('2025-10-01'), endDate: date('2025-12-31') },
          { extensionNumber: 2, startDate: date('2026-01-01'), endDate: date('2026-03-31') },
          { extensionNumber: 3, startDate: date('2026-04-01'), endDate: date('2026-06-30') },
        ],
      },
      date('2026-06-01')
    );

    expect(plan.eligible).toBe(true);
    expect(plan.extensions).toHaveLength(1);
    expect(plan.extensions[0].extensionNumber).toBe(4);
    expect(plan.extensions[0].startDate).toEqual(date('2026-07-01'));
    expect(plan.extensions[0].endDate).toEqual(date('2027-06-30'));
  });

  it('limits the fourth extension to exactly one year when the previous extension was longer', () => {
    const plan = calculateAutomaticExtensionRegularizationPlan(
      {
        id: 'contract-long-third-extension',
        contractType: 'fixed',
        isApproved: true,
        isEmployeeActive: true,
        isTerminated: false,
        startDate: date('2022-01-01'),
        originalEndDate: date('2022-03-31'),
        currentEndDate: date('2024-03-31'),
        extensions: [
          { extensionNumber: 1, startDate: date('2022-04-01'), endDate: date('2022-06-30') },
          { extensionNumber: 2, startDate: date('2022-07-01'), endDate: date('2022-09-30') },
          { extensionNumber: 3, startDate: date('2022-10-01'), endDate: date('2024-03-31') },
        ],
      },
      date('2024-03-02')
    );

    expect(plan.extensions).toHaveLength(1);
    expect(plan.extensions[0].extensionNumber).toBe(4);
    expect(plan.extensions[0].startDate).toEqual(date('2024-04-01'));
    expect(plan.extensions[0].endDate).toEqual(date('2025-03-31'));
  });

  it('keeps the previous term for the fourth extension when the original contract was not under one year', () => {
    const plan = calculateAutomaticExtensionRegularizationPlan(
      {
        id: 'contract-original-over-one-year',
        contractType: 'fixed',
        isApproved: true,
        isEmployeeActive: true,
        isTerminated: false,
        startDate: date('2019-01-01'),
        originalEndDate: date('2020-06-30'),
        currentEndDate: date('2024-12-31'),
        extensions: [
          { extensionNumber: 1, startDate: date('2020-07-01'), endDate: date('2021-12-31') },
          { extensionNumber: 2, startDate: date('2022-01-01'), endDate: date('2023-06-30') },
          { extensionNumber: 3, startDate: date('2023-07-01'), endDate: date('2024-12-31') },
        ],
      },
      date('2024-12-02')
    );

    expect(plan.extensions).toHaveLength(1);
    expect(plan.extensions[0].extensionNumber).toBe(4);
    expect(plan.extensions[0].startDate).toEqual(date('2025-01-01'));
    expect(plan.extensions[0].endDate).toEqual(date('2026-06-30'));
  });

  it('creates multiple missing annual extensions for older imported contracts', () => {
    const plan = calculateAutomaticExtensionRegularizationPlan(
      {
        id: 'contract-3',
        contractType: 'fijo',
        isApproved: true,
        isEmployeeActive: true,
        isTerminated: false,
        startDate: date('2021-01-01'),
        originalEndDate: date('2021-03-31'),
        currentEndDate: date('2024-03-31'),
        extensions: [
          { extensionNumber: 1, startDate: date('2021-04-01'), endDate: date('2021-06-30') },
          { extensionNumber: 2, startDate: date('2021-07-01'), endDate: date('2021-09-30') },
          { extensionNumber: 3, startDate: date('2021-10-01'), endDate: date('2022-03-31') },
          { extensionNumber: 4, startDate: date('2022-04-01'), endDate: date('2023-03-31') },
          { extensionNumber: 5, startDate: date('2023-04-01'), endDate: date('2024-03-31') },
        ],
      },
      date('2026-07-01')
    );

    expect(plan.extensions.map((extension) => extension.extensionNumber)).toEqual([6, 7, 8]);
    expect(plan.extensions.map((extension) => extension.endDate)).toEqual([
      date('2025-03-31'),
      date('2026-03-31'),
      date('2027-03-31'),
    ]);
  });

  it('uses the selected cutoff date to stop regularization before later automatic renewals', () => {
    const contract = {
      id: 'contract-3',
      contractType: 'fijo',
      isApproved: true,
      isEmployeeActive: true,
      isTerminated: false,
      startDate: date('2021-01-01'),
      originalEndDate: date('2021-03-31'),
      currentEndDate: date('2024-03-31'),
      extensions: [
        { extensionNumber: 1, startDate: date('2021-04-01'), endDate: date('2021-06-30') },
        { extensionNumber: 2, startDate: date('2021-07-01'), endDate: date('2021-09-30') },
        { extensionNumber: 3, startDate: date('2021-10-01'), endDate: date('2022-03-31') },
        { extensionNumber: 4, startDate: date('2022-04-01'), endDate: date('2023-03-31') },
        { extensionNumber: 5, startDate: date('2023-04-01'), endDate: date('2024-03-31') },
      ],
    };

    const plan = calculateAutomaticExtensionRegularizationPlan(contract, date('2025-02-01'));

    expect(plan.extensions.map((extension) => extension.extensionNumber)).toEqual([6]);
    expect(plan.extensions.map((extension) => extension.endDate)).toEqual([
      date('2025-03-31'),
    ]);
  });

  it('does not regularize contracts whose preaviso deadline has not expired', () => {
    const plan = calculateAutomaticExtensionRegularizationPlan({
      id: 'contract-4',
      contractType: 'fixed',
      isApproved: true,
      isEmployeeActive: true,
      isTerminated: false,
      startDate: date('2026-01-01'),
      originalEndDate: date('2026-03-31'),
      currentEndDate: date('2026-09-30'),
      extensions: [
        { extensionNumber: 1, startDate: date('2026-04-01'), endDate: date('2026-06-30') },
        { extensionNumber: 2, startDate: date('2026-07-01'), endDate: date('2026-09-30') },
      ],
    }, date('2026-08-01'));

    expect(plan.eligible).toBe(false);
    expect(plan.extensions).toHaveLength(0);
  });

  it('does not regularize terminated, unapproved, or inactive-employee contracts', () => {
    const baseContract = {
      id: 'contract-5',
      contractType: 'fixed',
      isTerminated: false,
      isApproved: true,
      isEmployeeActive: true,
      startDate: date('2026-01-01'),
      originalEndDate: date('2026-03-31'),
      currentEndDate: date('2026-06-30'),
      extensions: [
        { extensionNumber: 1, startDate: date('2026-04-01'), endDate: date('2026-06-30') },
      ],
    };

    expect(calculateAutomaticExtensionRegularizationPlan({ ...baseContract, isTerminated: true }, date('2026-06-01')).eligible).toBe(false);
    expect(calculateAutomaticExtensionRegularizationPlan({ ...baseContract, isApproved: false }, date('2026-06-01')).eligible).toBe(false);
    expect(calculateAutomaticExtensionRegularizationPlan({ ...baseContract, isEmployeeActive: false }, date('2026-06-01')).eligible).toBe(false);
  });
});
