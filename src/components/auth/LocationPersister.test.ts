import { describe, expect, it } from 'vitest';

import { getRestorablePath, isIgnoredPath } from './LocationPersister';

describe('LocationPersister public leave isolation', () => {
  it('never stores or restores the public leave request as an application module', () => {
    expect(isIgnoredPath('/solicitud-permiso')).toBe(true);
    expect(isIgnoredPath('/solicitud-permiso/')).toBe(true);
    expect(getRestorablePath('/solicitud-permiso?token=public-token')).toBeNull();
  });

  it('never stores or restores the public COPASST ballot as an application module', () => {
    expect(isIgnoredPath('/copasst/votar')).toBe(true);
    expect(isIgnoredPath('/copasst/votar/')).toBe(true);
    expect(getRestorablePath('/copasst/votar?token=public-token')).toBeNull();
  });

  it('continues restoring authenticated application modules', () => {
    expect(isIgnoredPath('/permisos')).toBe(false);
    expect(getRestorablePath('/permisos?estado=pendiente')).toBe('/permisos?estado=pendiente');
  });
});
