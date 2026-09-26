import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Jornadas responsive toolbar', () => {
  it('wraps controls and keeps primary actions inside the viewport', () => {
    const source = readFileSync(`${process.cwd()}/src/pages/Jornadas.tsx`, 'utf8');

    expect(source).toContain('sm:flex-row sm:flex-wrap lg:w-auto lg:flex-1 lg:justify-end');
    expect(source).toContain('grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3rem]');
    expect(source).toContain('h-12 min-w-0 w-full rounded-xl bg-primary');
  });
});
