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

describe('sidebar incapacity group', () => {
  it('keeps incapacity links in their own section', () => {
    const sidebarSource = readFileSync(
      `${process.cwd()}/src/components/layout/Sidebar.tsx`,
      'utf8',
    );
    const timeGroup = sidebarSource.slice(
      sidebarSource.indexOf('const timeManagementNavItems'),
      sidebarSource.indexOf('const incapacityNavItems'),
    );
    const incapacityGroup = sidebarSource.slice(
      sidebarSource.indexOf('const incapacityNavItems'),
      sidebarSource.indexOf('const capacitacionesItem'),
    );

    expect(timeGroup).not.toContain("href: '/incapacidades'");
    expect(incapacityGroup).toContain("href: '/incapacidades'");
    expect(incapacityGroup).toContain("href: '/incapacidades/analitica'");
    expect(sidebarSource).toContain('<SectionLabel label="Incapacidades" />');
  });
});
