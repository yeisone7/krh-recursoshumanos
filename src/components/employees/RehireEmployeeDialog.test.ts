import { describe, expect, it } from 'vitest';

import {
  getAvailableDirectRehirePositions,
  REHIRE_DIALOG_CONTENT_CLASSNAME,
} from './rehireEmployeeDialogUtils';

describe('RehireEmployeeDialog', () => {
  it('constrains the dialog as a flex column so its body can scroll vertically', () => {
    expect(REHIRE_DIALOG_CONTENT_CLASSNAME).toContain('flex');
    expect(REHIRE_DIALOG_CONTENT_CLASSNAME).toContain('flex-col');
    expect(REHIRE_DIALOG_CONTENT_CLASSNAME).toContain('max-h-');
    expect(REHIRE_DIALOG_CONTENT_CLASSNAME).toContain('overflow-hidden');
  });

  it('shows every active position regardless of the selected area', () => {
    const positions = [
      { id: 'same-area', area_id: 'area-1', is_active: true },
      { id: 'other-area', area_id: 'area-2', is_active: true },
      { id: 'without-area', area_id: null, is_active: true },
      { id: 'legacy-active', area_id: null, is_active: null },
      { id: 'inactive', area_id: 'area-1', is_active: false },
    ];

    expect(getAvailableDirectRehirePositions(positions).map((position) => position.id)).toEqual([
      'same-area',
      'other-area',
      'without-area',
      'legacy-active',
    ]);
  });
});
