import { describe, expect, it } from 'vitest';
import { calculateAutomaticExtensionRegularizationPlan } from './contractExtensionRegularization';

function date(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

describe('calculateAutomaticExtensionRegularizationPlan', () => {
  it('creates annual automatic extensions until the current period covers today', () => {
    const plan = calculateAutomaticExtensionRegularizationPlan(
      {
        id: 'contract-1',
        contractType: 'fixed',
        isTerminated: false,
        startDate: date('2023-01-01'),
        originalEndDate: date('2023-03-31'),
        currentEndDate: date('2026-03-31'),
        extensions: [
          { extensionNumber: 1, startDate: date('2023-04-01'), endDate: date('2023-06-30') },
          { extensionNumber: 2, startDate: date('2023-07-01'), endDate: date('2023-09-30') },
          { extensionNumber: 3, startDate: date('2023-10-01'), endDate: date('2024-03-31') },
          { extensionNumber: 4, startDate: date('2024-04-01'), endDate: date('2025-03-31') },
          { extensionNumber: 5, startDate: date('2025-04-01'), endDate: date('2026-03-31') },
        ],
      },
      date('2026-07-01')
    );

    expect(plan.eligible).toBe(true);
    expect(plan.extensions).toHaveLength(1);
    expect(plan.extensions[0]).toMatchObject({
      contractId: 'contract-1',
      extensionNumber: 6,
    });
    expect(plan.extensions[0].startDate).toEqual(date('2026-04-01'));
    expect(plan.extensions[0].endDate).toEqual(date('2027-03-31'));
  });

  it('creates multiple missing annual extensions for older imported contracts', () => {
    const plan = calculateAutomaticExtensionRegularizationPlan(
      {
        id: 'contract-2',
        contractType: 'fijo',
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

  it('does not regularize terminated contracts', () => {
    const plan = calculateAutomaticExtensionRegularizationPlan({
      id: 'contract-3',
      contractType: 'fixed',
      isTerminated: true,
      startDate: date('2023-01-01'),
      originalEndDate: date('2023-03-31'),
      currentEndDate: date('2024-03-31'),
      extensions: [
        { extensionNumber: 1, startDate: date('2023-04-01'), endDate: date('2023-06-30') },
        { extensionNumber: 2, startDate: date('2023-07-01'), endDate: date('2023-09-30') },
        { extensionNumber: 3, startDate: date('2023-10-01'), endDate: date('2024-03-31') },
      ],
    }, date('2026-07-01'));

    expect(plan.eligible).toBe(false);
    expect(plan.extensions).toHaveLength(0);
  });

  it('does not regularize contracts with fewer than three extensions', () => {
    const plan = calculateAutomaticExtensionRegularizationPlan({
      id: 'contract-4',
      contractType: 'fixed',
      isTerminated: false,
      startDate: date('2023-01-01'),
      originalEndDate: date('2023-03-31'),
      currentEndDate: date('2023-09-30'),
      extensions: [
        { extensionNumber: 1, startDate: date('2023-04-01'), endDate: date('2023-06-30') },
        { extensionNumber: 2, startDate: date('2023-07-01'), endDate: date('2023-09-30') },
      ],
    }, date('2026-07-01'));

    expect(plan.eligible).toBe(false);
    expect(plan.extensions).toHaveLength(0);
  });

  it('does not regularize contracts whose latest end date is still current', () => {
    const plan = calculateAutomaticExtensionRegularizationPlan({
      id: 'contract-5',
      contractType: 'fixed',
      isTerminated: false,
      startDate: date('2023-01-01'),
      originalEndDate: date('2023-03-31'),
      currentEndDate: date('2027-03-31'),
      extensions: [
        { extensionNumber: 1, startDate: date('2023-04-01'), endDate: date('2023-06-30') },
        { extensionNumber: 2, startDate: date('2023-07-01'), endDate: date('2023-09-30') },
        { extensionNumber: 3, startDate: date('2023-10-01'), endDate: date('2024-03-31') },
        { extensionNumber: 4, startDate: date('2024-04-01'), endDate: date('2025-03-31') },
        { extensionNumber: 5, startDate: date('2025-04-01'), endDate: date('2026-03-31') },
        { extensionNumber: 6, startDate: date('2026-04-01'), endDate: date('2027-03-31') },
      ],
    }, date('2026-07-01'));

    expect(plan.eligible).toBe(false);
    expect(plan.extensions).toHaveLength(0);
  });
});
