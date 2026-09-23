import { describe, expect, it } from 'vitest';

import { getDotationSizeSuggestions, getInventorySizeSuggestions } from './dotationSizes';

describe('getDotationSizeSuggestions', () => {
  it('preserves configured numeric pant sizes', () => {
    expect(getDotationSizeSuggestions({
      category: 'Uniforme',
      sizes_available: ['6', '8', '10', '12', '14'],
    })).toEqual(['6', '8', '10', '12', '14', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']);
  });

  it('uses footwear sizes as fallback for footwear', () => {
    const suggestions = getDotationSizeSuggestions({ category: 'Calzado' });

    expect(suggestions).toContain('35');
    expect(suggestions).toContain('47');
    expect(suggestions).not.toContain('XS');
  });

  it('removes duplicate and blank configured sizes', () => {
    expect(getDotationSizeSuggestions({
      category: 'Uniforme',
      sizes_available: [' S ', '', 'M'],
    })).toEqual(['S', 'M', 'XS', 'L', 'XL', 'XXL', 'XXXL']);
  });
});

describe('getInventorySizeSuggestions', () => {
  const inventory = [
    { item_type: 'pantalon-drill', operation_center_id: 'centro-1', size: '10' },
    { item_type: 'pantalon-drill', operation_center_id: 'centro-1', size: ' 6 ' },
    { item_type: 'pantalon-drill', operation_center_id: null, size: '8' },
    { item_type: 'pantalon-drill', operation_center_id: 'centro-2', size: '12' },
    { item_type: 'pantalon-drill', operation_center_id: 'centro-1', size: '10' },
    { item_type: 'camisa', operation_center_id: 'centro-1', size: 'M' },
    { item_type: 'pantalon-drill', operation_center_id: 'centro-1', size: null },
  ];

  it('returns the numeric inventory sizes for the employee center and General stock', () => {
    expect(getInventorySizeSuggestions(inventory, 'pantalon-drill', 'centro-1'))
      .toEqual(['6', '8', '10']);
  });

  it('does not mix sizes from another operation center or another product', () => {
    const suggestions = getInventorySizeSuggestions(inventory, 'pantalon-drill', 'centro-1');

    expect(suggestions).not.toContain('12');
    expect(suggestions).not.toContain('M');
  });

  it('uses only General stock when the employee has no operation center', () => {
    expect(getInventorySizeSuggestions(inventory, 'pantalon-drill', null)).toEqual(['8']);
  });
});
