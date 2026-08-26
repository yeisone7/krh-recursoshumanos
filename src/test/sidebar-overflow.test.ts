import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('sidebar viewport containment', () => {
  it('clips the sidebar shell while keeping navigation independently scrollable', () => {
    const sidebarSource = readFileSync(
      `${process.cwd()}/src/components/layout/Sidebar.tsx`,
      'utf8',
    );

    expect(sidebarSource).toContain(
      'h-full min-h-0 overflow-hidden bg-sidebar flex flex-col',
    );
    expect(sidebarSource).toContain(
      'min-h-0 flex-1 overflow-y-auto py-2 px-2.5',
    );
  });
});
