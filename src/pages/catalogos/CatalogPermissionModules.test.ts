import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const catalogModules = {
  AFC: 'afc',
  AFP: 'afp',
  ARL: 'arl',
  Bancos: 'bancos',
  CCF: 'ccf',
  EPS: 'eps',
  IPS: 'ips',
} as const;

describe('catalog permission module wiring', () => {
  Object.entries(catalogModules).forEach(([page, permission]) => {
    it(`${page} usa su permiso granular`, () => {
      const source = readFileSync(resolve(__dirname, `${page}.tsx`), 'utf8');

      expect(source).toContain(`permissionModule={CATALOG_PERMISSION_CODES.${permission}}`);
    });
  });
});
