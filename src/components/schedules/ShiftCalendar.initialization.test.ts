import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('ShiftCalendar initialization order', () => {
  it('combines the shift catalogs before callbacks reference the result', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/schedules/ShiftCalendar.tsx'), 'utf8');
    const shiftsDeclaration = source.indexOf('const shifts = useMemo');
    const shiftLookup = source.indexOf('const getShiftById = useCallback');

    expect(shiftsDeclaration).toBeGreaterThan(-1);
    expect(shiftLookup).toBeGreaterThan(-1);
    expect(shiftsDeclaration).toBeLessThan(shiftLookup);
  });
});
