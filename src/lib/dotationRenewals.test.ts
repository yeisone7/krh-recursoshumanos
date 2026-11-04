import { describe, expect, it } from 'vitest';
import { getRenewedDotationIds } from './dotationRenewals';

const original = {
  id: 'original',
  employee_id: 'employee',
  dotation_item_type_id: 'boots',
  item_name: 'Botas',
  delivery_date: '2026-06-01',
  created_at: '2026-06-01T14:00:00Z',
};

describe('getRenewedDotationIds', () => {
  it('matches a later delivery by employee and catalog ID even when the name changes', () => {
    const renewal = { ...original, id: 'renewal', item_name: 'Botas de seguridad', delivery_date: '2026-11-04' };
    const otherEmployee = { ...original, id: 'other-employee', employee_id: 'someone-else' };
    const otherCatalogItem = { ...original, id: 'other-item', dotation_item_type_id: 'other-boots' };

    expect(getRenewedDotationIds([renewal, otherEmployee, original, otherCatalogItem]))
      .toEqual(new Set(['original']));
  });

  it('matches legacy names and uses creation time to order deliveries on the same date', () => {
    const legacy = { ...original, dotation_item_type_id: null, item_name: ' BOTAS ' };
    const renewal = { ...original, id: 'renewal', created_at: '2026-06-01T16:00:00Z' };
    const backdated = { ...original, id: 'backdated', delivery_date: '2026-05-01', created_at: '2026-11-04T16:00:00Z' };

    expect(getRenewedDotationIds([legacy, renewal, backdated])).toEqual(new Set(['original', 'backdated']));
  });
});
