import { describe, expect, it, vi } from 'vitest';
import { fetchTrainingCompletionWorkInfoRows } from './trainingCompletionWorkInfo';

describe('fetchTrainingCompletionWorkInfoRows', () => {
  it('splits Petrocasinos-sized employee lists into safe requests', async () => {
    const employeeIds = Array.from({ length: 640 }, (_, index) => `employee-${index}`);
    const queryChunk = vi.fn(async (chunk: string[]) => ({
      data: chunk.map((employee_id) => ({ employee_id })),
      error: null,
    }));

    const result = await fetchTrainingCompletionWorkInfoRows(employeeIds, queryChunk);

    expect(queryChunk).toHaveBeenCalledTimes(7);
    expect(queryChunk.mock.calls.every(([chunk]) => chunk.length <= 100)).toBe(true);
    expect(result.data).toHaveLength(640);
    expect(result.error).toBeNull();
  });

  it('returns the query error instead of silently treating it as empty data', async () => {
    const expectedError = new Error('Bad Request');
    const result = await fetchTrainingCompletionWorkInfoRows(
      ['employee-1'],
      async () => ({ data: null, error: expectedError })
    );

    expect(result.data).toEqual([]);
    expect(result.error).toBe(expectedError);
  });
});
