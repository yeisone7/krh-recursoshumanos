import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('global table overflow styles', () => {
  it('only changes overflow on containers whose direct child is a table', () => {
    const globalStyles = readFileSync(`${process.cwd()}/src/index.css`, 'utf8');

    expect(globalStyles).not.toContain('div:has(table):not([class*="overflow-"])');
    expect(globalStyles).not.toContain('div[class*="overflow-"]:has(table)');
    expect(globalStyles).toContain('div:has(> table):not([class*="overflow-"])');
    expect(globalStyles).toContain('div[class*="overflow-"]:has(> table)');
  });
});
